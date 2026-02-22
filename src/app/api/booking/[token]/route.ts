// Public API route — no authentication required.
// Handles interview invite lookup and slot booking for the /book/[token] page.
// Uses Firebase Admin SDK to bypass Realtime Database security rules so
// unauthenticated applicants can read invite data and book a time slot.

import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebaseAdmin";

type Params = { params: { token: string } };

// ── GET /api/booking/[token] ──────────────────────────────────────────────────
// Returns { invite, slots } for a valid, unexpired booking token.
// Marks the invite as expired in the DB if its expiresAt has passed.

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = params;
  const db = getAdminDB();

  if (!db) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Fetch invite record.
  const inviteSnap = await db.ref(`interviewInvites/${token}`).get();
  if (!inviteSnap.exists()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invite = { ...inviteSnap.val(), id: token };

  // Cancelled or already marked expired.
  if (invite.status === "cancelled" || invite.status === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Expired by time — update DB then return expired.
  if (Date.now() > invite.expiresAt) {
    await db.ref(`interviewInvites/${token}`).update({ status: "expired" });
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  // Single-use invite already consumed.
  if (!invite.multiUse && invite.status === "booked") {
    return NextResponse.json({ error: "already_booked", invite }, { status: 409 });
  }

  // Fetch available slots (future, not yet booked).
  const slotsSnap = await db.ref("interviewSlots").get();
  const now = Date.now();
  type RawSlot = Record<string, unknown> & { id: string };
  const slots: RawSlot[] = slotsSnap.exists()
    ? (Object.entries(slotsSnap.val() as Record<string, Record<string, unknown>>)
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
  const db = getAdminDB();

  if (!db) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { slotId, bookerName, bookerEmail } = await req.json() as {
    slotId: string;
    bookerName: string;
    bookerEmail: string;
  };

  if (!slotId) {
    return NextResponse.json({ error: "missing_slot" }, { status: 400 });
  }

  // Fetch invite to determine multiUse flag.
  const inviteSnap = await db.ref(`interviewInvites/${token}`).get();
  if (!inviteSnap.exists()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const invite = inviteSnap.val() as { multiUse?: boolean };

  // Mark the slot as taken.
  await db.ref(`interviewSlots/${slotId}`).update({
    available:   false,
    bookedBy:    token,
    bookerName:  bookerName || "",
    bookerEmail: bookerEmail || "",
  });

  // For single-use invites, mark the invite itself as booked.
  if (!invite.multiUse) {
    await db.ref(`interviewInvites/${token}`).update({
      status:       "booked",
      bookedSlotId: slotId,
    });
  }

  return NextResponse.json({ success: true });
}
