// Public API route — no authentication required.
// Handles interview invite lookup and slot booking for the /book/[token] page.
//
// Zoom link source:
//   interviewSettings/zoomLink   → custom admin-managed link in Supabase
//   interviewSettings/zoomEnabled -> toggle showing Zoom link to applicants
//   INTERVIEW_ZOOM_LINK          → fallback default when custom link is not set

import { NextRequest, NextResponse } from "next/server";
import {
  dbRead as sbRead,
  dbPatch as sbPatch,
  writeAuditLog as sbWriteAuditLog,
} from "@/lib/supabaseAdmin";
import { resolveInterviewZoomSettings } from "@/lib/interviews/config";
import { toInterviewTimestamp } from "@/lib/interviews/datetime";
import { pickIcsOrganizer, resolveInterviewerContacts } from "@/lib/server/interviewerResolver";
import { getDefaultFromAddress } from "@/lib/server/smtp";
import {
  enforcePublicBookingRateLimit,
  normalizeBookingId,
  validateBookerInput,
} from "@/lib/server/publicBookingSecurity";
import {
  sendInterviewerBookingNotificationEmail,
  sendInterviewerRescheduledNotificationEmail,
  sendInterviewBookingEmail,
  sendInterviewRescheduledEmail,
} from "@/lib/server/interviewEmail";
import {
  type ExistingBooking,
  findExistingBookingsByEmail,
  clearExistingBooking,
  hasInterviewerMembers,
  buildInterviewerUpcomingSummary,
  syncApplicationInterviewScheduled,
} from "@/lib/server/interviewBookingHelpers";

type RouteContext = { params: Promise<{ token: string }> };
export const runtime = "nodejs";

async function dbGet(path: string): Promise<unknown> {
  return sbRead(path);
}

async function dbPatch(path: string, data: Record<string, unknown>): Promise<void> {
  return sbPatch(path, data);
}

async function writeAuditLog(entry: {
  action: "update";
  collection: string;
  recordId: string;
  actorUid: string;
  actorEmail: string;
  actorName?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await sbWriteAuditLog(entry);
}

// ── GET /api/booking/[token] ──────────────────────────────────────────────────
// Returns { invite, slots, zoomLink } for a valid, unexpired booking token.

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const cleanToken = normalizeBookingId(token);
  if (!cleanToken) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  let inviteData: unknown;
  try {
    inviteData = await dbGet(`interviewInvites/${cleanToken}`);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!inviteData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  type RawInvite = Record<string, unknown> & { id: string };
  const invite: RawInvite = { ...(inviteData as Record<string, unknown>), id: cleanToken };

  if (invite["status"] === "cancelled" || invite["status"] === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (Date.now() > (invite["expiresAt"] as number)) {
    await dbPatch(`interviewInvites/${cleanToken}`, { status: "expired" })
      .then(() => writeAuditLog({
        action: "update",
        collection: "interviewInvites",
        recordId: cleanToken,
        actorUid: "system",
        actorEmail: "system",
        details: { status: "expired", reason: "invite_expired_on_read" },
      }))
      .catch(() => {});
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (!invite["multiUse"] && invite["status"] === "booked") {
    return NextResponse.json({ error: "already_booked", invite }, { status: 409 });
  }

  let slotsData: unknown;
  try {
    slotsData = await dbGet("interviewSlots");
  } catch {
    slotsData = null;
  }

  const now = Date.now();
  type RawSlot = Record<string, unknown> & { id: string };
  const slots: RawSlot[] = slotsData
    ? (Object.entries(slotsData as Record<string, Record<string, unknown>>)
        .map(([id, data]): RawSlot => ({ ...data, id }))
      .filter((s) => s["available"] && !s["bookedBy"] && hasInterviewerMembers(s) && toInterviewTimestamp(s["datetime"] as string) > now)
      .sort((a, b) => toInterviewTimestamp(a["datetime"] as string) - toInterviewTimestamp(b["datetime"] as string)))
    : [];

  let settingsData: unknown = null;
  try {
    settingsData = await dbGet("interviewSettings");
  } catch {
    settingsData = null;
  }
  const zoom = resolveInterviewZoomSettings(settingsData, process.env.INTERVIEW_ZOOM_LINK ?? "");

  return NextResponse.json({
    invite,
    slots,
    zoomLink: zoom.zoomLink,
  });
}

// ── POST /api/booking/[token] ─────────────────────────────────────────────────
// Books a slot. Body: { slotId, bookerName, bookerEmail }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const cleanToken = normalizeBookingId(token);
  if (!cleanToken) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const slotId = normalizeBookingId(body.slotId);
  if (!slotId) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
  }
  const booker = validateBookerInput(body.bookerName, body.bookerEmail);
  if (!booker.ok) {
    return NextResponse.json({ error: booker.error }, { status: 400 });
  }
  const cleanName = booker.name;
  const cleanEmail = booker.email;

  const rateLimited = await enforcePublicBookingRateLimit(req, "booking-token", cleanEmail);
  if (rateLimited) return rateLimited;

  let inviteData: unknown;
  try {
    inviteData = await dbGet(`interviewInvites/${cleanToken}`);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!inviteData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invite = inviteData as { multiUse?: boolean };
  let slotData: unknown;
  try {
    slotData = await dbGet(`interviewSlots/${slotId}`);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!slotData) {
    return NextResponse.json({ error: "slot_not_found" }, { status: 404 });
  }
  const slot = slotData as Record<string, unknown>;
  const startsAt = toInterviewTimestamp((slot.datetime as string) ?? "");
  if (!slot.available || slot.bookedBy || !hasInterviewerMembers(slot) || Number.isNaN(startsAt) || startsAt <= Date.now()) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  try {
    await dbPatch(`interviewSlots/${slotId}`, {
      available:   false,
      bookedBy:    cleanToken,
      bookerName:  cleanName,
      bookerEmail: cleanEmail,
      reminderSentAt: "",
    });
    await writeAuditLog({
      action: "update",
      collection: "interviewSlots",
      recordId: slotId,
      actorUid: `public:${cleanToken}`,
      actorEmail: cleanEmail || "public",
      actorName: cleanName,
      details: { bookedBy: cleanToken, available: false },
    }).catch(() => {});

    if (!invite.multiUse) {
      await dbPatch(`interviewInvites/${cleanToken}`, {
        status:       "booked",
        bookedSlotId: slotId,
      });
      await writeAuditLog({
        action: "update",
        collection: "interviewInvites",
        recordId: cleanToken,
        actorUid: `public:${cleanToken}`,
        actorEmail: cleanEmail || "public",
        actorName: cleanName,
        details: { status: "booked", bookedSlotId: slotId },
      }).catch(() => {});
    }
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let replacedBookings: ExistingBooking[] = [];
  try {
    replacedBookings = await findExistingBookingsByEmail(cleanEmail, slotId);
    for (const existing of replacedBookings) {
      await clearExistingBooking(existing.id);
      await writeAuditLog({
        action: "update",
        collection: "interviewSlots",
        recordId: existing.id,
        actorUid: `public:${cleanToken}`,
        actorEmail: cleanEmail.toLowerCase() || "public",
        actorName: cleanName || "",
        details: { rescheduledTo: slotId, available: true, bookedBy: "" },
      }).catch(() => {});
    }
  } catch {
    // Do not fail the booking if cleanup fails.
  }

  const durationMinutes = Number(slot.durationMinutes ?? 30);
  const datetimeIso = typeof slot.datetime === "string" ? slot.datetime : "";
  const location = typeof slot.location === "string" ? slot.location : "";
  await syncApplicationInterviewScheduled({
    bookingEmail: cleanEmail,
    bookingName: cleanName,
    newSlotId: slotId,
    newDatetimeIso: datetimeIso,
    inviteToken: cleanToken,
    previousSlotIds: replacedBookings.map((booking) => booking.id),
  }).catch(() => {});

  if (cleanEmail && datetimeIso) {
    let settingsData: unknown = null;
    let teamData: unknown = null;
    try {
      [settingsData, teamData] = await Promise.all([
        dbGet("interviewSettings"),
        dbGet("team"),
      ]);
    } catch {
      settingsData = null;
      teamData = null;
    }
    const zoom = resolveInterviewZoomSettings(settingsData, process.env.INTERVIEW_ZOOM_LINK ?? "");
    const interviewerContacts = resolveInterviewerContacts(slot, teamData);
    const organizer = pickIcsOrganizer(interviewerContacts, getDefaultFromAddress());
    const payload = {
      to: cleanEmail,
      bookerName: cleanName,
      slotId,
      datetimeIso,
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
      zoomLink: zoom.zoomLink,
      location,
      organizerName: organizer.name,
      organizerEmail: organizer.email,
    };
    if (replacedBookings.length > 0 && replacedBookings[0]?.datetime) {
      await sendInterviewRescheduledEmail({
        ...payload,
        previousDatetimeIso: replacedBookings[0].datetime,
      }).catch(() => {});
      const sent = new Set<string>();
      for (const contact of interviewerContacts) {
        const email = contact.email.trim().toLowerCase();
        if (!email || sent.has(email)) continue;
        sent.add(email);
        await sendInterviewerRescheduledNotificationEmail({
          to: contact.email,
          interviewerName: contact.name,
          bookerName: cleanName,
          bookerEmail: cleanEmail,
          previousDatetimeIso: replacedBookings[0].datetime,
          datetimeIso,
          durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
          zoomLink: zoom.zoomLink,
          location,
          slotId,
        }).catch(() => {});
      }
    } else {
      await sendInterviewBookingEmail(payload).catch(() => {});
      let allSlotsData: unknown = null;
      try {
        allSlotsData = await dbGet("interviewSlots");
      } catch {
        allSlotsData = null;
      }
      const summaryNow = Date.now();
      const sent = new Set<string>();
      for (const contact of interviewerContacts) {
        const email = contact.email.trim().toLowerCase();
        if (!email || sent.has(email)) continue;
        sent.add(email);
        const summary = buildInterviewerUpcomingSummary(allSlotsData, contact.memberId, summaryNow);
        await sendInterviewerBookingNotificationEmail({
          to: contact.email,
          interviewerName: contact.name,
          bookerName: cleanName,
          bookerEmail: cleanEmail,
          datetimeIso,
          durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
          zoomLink: zoom.zoomLink,
          location,
          slotId,
          scheduleSummaryLines: summary.lines,
          scheduleTotal: summary.total,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ success: true, rescheduled: replacedBookings.length > 0 });
}
