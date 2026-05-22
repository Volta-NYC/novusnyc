// Sends reminder emails to applicants whose interview is within 48 hours and who
// haven't received a reminder yet. Call this from a cron job or manually from
// the admin panel. Requires owner or admin auth.

import { NextRequest, NextResponse } from "next/server";
import { dbRead, dbPatch, verifyCaller } from "@/lib/server/adminApi";
import { toInterviewTimestamp } from "@/lib/interviews/datetime";
import { sendInterviewInviteReminderEmail } from "@/lib/server/interviewEmail";

export const runtime = "nodejs";

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const [slotsData, invitesData] = await Promise.all([
    dbRead("interviewSlots"),
    dbRead("interviewInvites"),
  ]);

  const slots = (slotsData ?? {}) as Record<string, Record<string, unknown>>;
  const invites = (invitesData ?? {}) as Record<string, Record<string, unknown>>;

  const now = Date.now();
  const windowEnd = now + REMINDER_WINDOW_MS;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [slotId, slot] of Object.entries(slots)) {
    if (!slot || slot.available || !slot.bookedBy) { skipped += 1; continue; }
    if (slot.reminderSentAt) { skipped += 1; continue; }

    const startsAt = toInterviewTimestamp(String(slot.datetime ?? ""));
    if (Number.isNaN(startsAt) || startsAt <= now || startsAt > windowEnd) { skipped += 1; continue; }

    const bookerEmail = String(slot.bookerEmail ?? "").trim();
    const bookerName = String(slot.bookerName ?? "").trim();
    if (!bookerEmail) { skipped += 1; continue; }

    const bookedBy = String(slot.bookedBy ?? "").trim();
    const invite = bookedBy && bookedBy !== "public-booking" ? invites[bookedBy] : null;
    const token = bookedBy !== "public-booking" ? bookedBy : "";

    try {
      if (token && invite) {
        await sendInterviewInviteReminderEmail({
          to: bookerEmail,
          applicantName: bookerName,
          bookingToken: token,
          fallbackOrigin: req.nextUrl.origin,
        });
      } else {
        await sendInterviewInviteReminderEmail({
          to: bookerEmail,
          applicantName: bookerName,
          bookingToken: "",
          fallbackOrigin: req.nextUrl.origin,
        });
      }

      await dbPatch(`interviewSlots/${slotId}`, { reminderSentAt: new Date().toISOString() });
      sent += 1;
    } catch {
      errors.push(slotId);
    }
  }

  return NextResponse.json({ success: true, sent, skipped, failed: errors.length, failedSlotIds: errors });
}
