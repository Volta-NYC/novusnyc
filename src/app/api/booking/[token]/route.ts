// Public API route — no authentication required.
// Handles interview invite lookup and slot booking for the /book/[token] page.
//
// Data access priority:
//   1. Firebase Admin SDK (if FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY are set in Vercel)
//   2. Firebase REST API (requires Firebase rules to allow public reads — see CLAUDE.md)
//
// Email sending requires: RESEND_API_KEY in Vercel env vars (get a free key at resend.com).
// Zoom link:  set INTERVIEW_ZOOM_LINK env var to your Zoom URL.
// From email: set INTERVIEW_FROM_EMAIL (e.g. "Volta NYC <noreply@voltanyc.org>").
//             Your domain must be verified in Resend, or use "onboarding@resend.dev" for testing.

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebaseAdmin";

type Params = { params: { token: string } };

// ── DB helpers — Admin SDK preferred, REST API fallback ───────────────────────

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "";

async function dbGet(path: string): Promise<unknown> {
  const db = getAdminDB();
  if (db) {
    const snap = await db.ref(path).get();
    return snap.exists() ? snap.val() : null;
  }
  if (!DB_URL) return null;
  const res = await fetch(`${DB_URL}/${path}.json`, { cache: "no-store" });
  if (!res.ok || res.status === 404) return null;
  const data = await res.json() as unknown;
  return data ?? null;
}

async function dbPatch(path: string, data: Record<string, unknown>): Promise<void> {
  const db = getAdminDB();
  if (db) {
    await db.ref(path).update(data);
    return;
  }
  if (!DB_URL) throw new Error("no_db");
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("db_write_failed");
}

// ── Email confirmation — uses Resend API (no npm install needed) ──────────────
// Only sends if RESEND_API_KEY is configured. Silent no-op otherwise.

async function sendConfirmationEmail(
  toEmail: string,
  toName: string,
  slotDatetime: string,
  durationMinutes: number,
  location: string,
): Promise<void> {
  const apiKey   = process.env.RESEND_API_KEY;
  if (!apiKey || !toEmail) return;

  const from     = process.env.INTERVIEW_FROM_EMAIL ?? "Volta NYC <noreply@voltanyc.org>";
  const zoomLink = process.env.INTERVIEW_ZOOM_LINK  ?? "";

  // Format the date and time in a readable way.
  const d = new Date(slotDatetime);
  const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const locationSection = location
    ? `<tr><td style="padding:12px 0;border-top:1px solid #eee;">
        <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Location</p>
        <p style="margin:0;font-size:14px;color:#555;">${location}</p>
      </td></tr>`
    : "";

  const zoomSection = zoomLink
    ? `<tr><td style="padding:12px 0;border-top:1px solid #eee;">
        <p style="margin:0 0 4px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Video Link</p>
        <a href="${zoomLink}" style="display:inline-block;background:#2D8CFF;color:white;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;text-decoration:none;">Join Zoom Meeting</a>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="540" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;max-width:100%;">
  <tr><td style="background:#0F1014;padding:20px 32px;">
    <span style="display:inline-block;background:#85CC17;color:#0D0D0D;font-weight:700;font-size:12px;padding:4px 10px;border-radius:5px;letter-spacing:0.08em;">VOLTA NYC</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <h1 style="margin:0 0 8px;font-size:22px;color:#111;font-weight:700;">Interview Confirmed ✓</h1>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">Hi ${toName}, your interview with Volta NYC is scheduled. We look forward to meeting you!</p>
    <div style="background:#f8f9fa;border-radius:10px;padding:20px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding-bottom:12px;">
          <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Date</p>
          <p style="margin:0;font-size:15px;color:#111;font-weight:600;">${dateStr}</p>
        </td></tr>
        <tr><td style="padding:12px 0;border-top:1px solid #eee;">
          <p style="margin:0 0 2px;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Time</p>
          <p style="margin:0;font-size:15px;color:#111;font-weight:600;">${timeStr}</p>
          <p style="margin:2px 0 0;font-size:13px;color:#999;">${durationMinutes} minutes</p>
        </td></tr>
        ${locationSection}
        ${zoomSection}
      </table>
    </div>
    <p style="color:#999;font-size:13px;line-height:1.6;">Need to reschedule or have questions? Reply to this email or contact us at <a href="mailto:info@voltanyc.org" style="color:#3B74ED;text-decoration:none;">info@voltanyc.org</a></p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="margin:0;color:#bbb;font-size:12px;">Volta NYC &middot; New York City</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [toEmail], subject: "Your Interview is Scheduled — Volta NYC", html }),
  });
}

// ── GET /api/booking/[token] ──────────────────────────────────────────────────
// Returns { invite, slots } for a valid, unexpired booking token.

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = params;

  let inviteData: unknown;
  try {
    inviteData = await dbGet(`interviewInvites/${token}`);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!inviteData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  type RawInvite = Record<string, unknown> & { id: string };
  const invite: RawInvite = { ...(inviteData as Record<string, unknown>), id: token };

  if (invite["status"] === "cancelled" || invite["status"] === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  if (Date.now() > (invite["expiresAt"] as number)) {
    await dbPatch(`interviewInvites/${token}`, { status: "expired" }).catch(() => {});
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
        .filter((s) => s["available"] && !s["bookedBy"] && new Date(s["datetime"] as string).getTime() > now)
        .sort((a, b) => new Date(a["datetime"] as string).getTime() - new Date(b["datetime"] as string).getTime()))
    : [];

  return NextResponse.json({ invite, slots });
}

// ── POST /api/booking/[token] ─────────────────────────────────────────────────
// Books a slot. Body: { slotId, bookerName, bookerEmail }

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = params;

  const { slotId, bookerName, bookerEmail } = await req.json() as {
    slotId: string;
    bookerName: string;
    bookerEmail: string;
  };

  if (!slotId) {
    return NextResponse.json({ error: "missing_slot" }, { status: 400 });
  }

  let inviteData: unknown;
  try {
    inviteData = await dbGet(`interviewInvites/${token}`);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!inviteData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invite = inviteData as { multiUse?: boolean };

  // Fetch the slot to get datetime/duration/location for the confirmation email.
  let slotData: Record<string, unknown> | null = null;
  try {
    slotData = (await dbGet(`interviewSlots/${slotId}`)) as Record<string, unknown> | null;
  } catch { /* non-fatal */ }

  try {
    await dbPatch(`interviewSlots/${slotId}`, {
      available:   false,
      bookedBy:    token,
      bookerName:  bookerName || "",
      bookerEmail: bookerEmail || "",
    });

    if (!invite.multiUse) {
      await dbPatch(`interviewInvites/${token}`, {
        status:       "booked",
        bookedSlotId: slotId,
      });
    }
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Send confirmation email — fire-and-forget, never blocks the response.
  if (bookerEmail && slotData) {
    sendConfirmationEmail(
      bookerEmail,
      bookerName || "there",
      slotData["datetime"] as string,
      (slotData["durationMinutes"] as number) ?? 30,
      (slotData["location"] as string) ?? "",
    ).catch(() => { /* email failure is non-fatal */ });
  }

  return NextResponse.json({ success: true });
}
