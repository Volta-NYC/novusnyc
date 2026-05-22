import "server-only";
import { dbRead as sbRead, dbPatch as sbPatch } from "@/lib/supabaseAdmin";
import { formatInterviewInET, toInterviewTimestamp } from "@/lib/interviews/datetime";

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;
const TERMINAL_APPLICATION_STATUSES = new Set(["accepted", "not accepted", "rejected"]);

export type ExistingBooking = { id: string; datetime: string };
export type ApplicationEntry = { id: string; row: Record<string, unknown> };

export function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function hasInterviewerMembers(slot: Record<string, unknown>): boolean {
  const ids = slot.interviewerMemberIds;
  return Array.isArray(ids) && ids.some((id) => typeof id === "string" && id.trim().length > 0);
}

export function getInterviewerMemberIds(slot: Record<string, unknown>): string[] {
  const ids = slot.interviewerMemberIds;
  if (!Array.isArray(ids)) return [];
  return Array.from(
    new Set(ids.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)),
  );
}

function formatEtShort(datetimeIso: string): string {
  const datePart = formatInterviewInET(datetimeIso, { weekday: "short", month: "short", day: "numeric" });
  const timePart = formatInterviewInET(datetimeIso, { hour: "numeric", minute: "2-digit" });
  return `${datePart}, ${timePart} ET`;
}

export function buildInterviewerUpcomingSummary(
  slotsData: unknown,
  interviewerMemberId: string,
  nowMs: number,
): { lines: string[]; total: number } {
  if (!slotsData || !interviewerMemberId) return { lines: [], total: 0 };
  const windowEnd = nowMs + THREE_WEEKS_MS;
  const entries = Object.entries(slotsData as Record<string, Record<string, unknown>>)
    .map(([, raw]) => raw ?? {})
    .filter((slot) => {
      if (!slot || typeof slot !== "object") return false;
      const row = slot as Record<string, unknown>;
      if (!row.bookedBy || row.available) return false;
      const startsAt = toInterviewTimestamp(String(row.datetime ?? ""));
      if (Number.isNaN(startsAt) || startsAt < nowMs || startsAt > windowEnd) return false;
      return getInterviewerMemberIds(row).includes(interviewerMemberId);
    })
    .sort((a, b) => toInterviewTimestamp(String(a.datetime ?? "")) - toInterviewTimestamp(String(b.datetime ?? "")));

  const lines = entries.map((slot) => {
    const row = slot as Record<string, unknown>;
    const whoName = String(row.bookerName ?? "").trim() || "Interviewee";
    const whoEmail = String(row.bookerEmail ?? "").trim();
    const who = whoEmail ? `${whoName} (${whoEmail})` : whoName;
    return `${formatEtShort(String(row.datetime ?? ""))} — ${who}`;
  });
  return { lines, total: lines.length };
}

export async function findExistingBookingsByEmail(
  email: string,
  excludeSlotId: string,
): Promise<ExistingBooking[]> {
  if (!email) return [];
  const slotsData = await sbRead("interviewSlots");
  if (!slotsData) return [];
  const now = Date.now();
  const target = email.trim().toLowerCase();
  return Object.entries(slotsData as Record<string, Record<string, unknown>>)
    .map(([id, slot]) => ({ id, slot }))
    .filter(({ id, slot }) => {
      if (id === excludeSlotId) return false;
      const slotEmail = String(slot.bookerEmail ?? "").trim().toLowerCase();
      const startsAt = toInterviewTimestamp(String(slot.datetime ?? ""));
      return !!slot.bookedBy && !slot.available && slotEmail === target && startsAt > now;
    })
    .map(({ id, slot }) => ({ id, datetime: String(slot.datetime ?? "") }))
    .sort((a, b) => toInterviewTimestamp(a.datetime) - toInterviewTimestamp(b.datetime));
}

export async function clearExistingBooking(slotId: string): Promise<void> {
  await sbPatch(`interviewSlots/${slotId}`, {
    available: true,
    bookedBy: "",
    bookerName: "",
    bookerEmail: "",
    reminderSentAt: "",
  });
}

function toTimestamp(value: unknown): number {
  const ms = Date.parse(String(value ?? ""));
  return Number.isNaN(ms) ? 0 : ms;
}

function pickApplicationByEmailAndName(
  entries: ApplicationEntry[],
  email: string,
  name: string,
): ApplicationEntry | null {
  const targetEmail = normalizeKey(email);
  const targetName = normalizeKey(name);
  const emailMatches = entries.filter(({ row }) => normalizeKey(row.email) === targetEmail);
  if (emailMatches.length === 0) return null;
  const nameMatches = targetName
    ? emailMatches.filter(({ row }) => normalizeKey(row.fullName) === targetName)
    : [];
  const pool = nameMatches.length > 0 ? nameMatches : emailMatches;
  pool.sort((a, b) => {
    const aTime = Math.max(toTimestamp(a.row.updatedAt), toTimestamp(a.row.createdAt));
    const bTime = Math.max(toTimestamp(b.row.updatedAt), toTimestamp(b.row.createdAt));
    return bTime - aTime;
  });
  return pool[0] ?? null;
}

export async function syncApplicationInterviewScheduled(params: {
  bookingEmail: string;
  bookingName: string;
  newSlotId: string;
  newDatetimeIso: string;
  inviteToken?: string;
  previousSlotIds?: string[];
}): Promise<void> {
  const email = normalizeKey(params.bookingEmail);
  if (!email || !params.newSlotId || !params.newDatetimeIso) return;

  const applicationsData = await sbRead("applications");
  if (!applicationsData || typeof applicationsData !== "object") return;

  const entries = Object.entries(applicationsData as Record<string, Record<string, unknown>>)
    .map(([id, row]) => ({ id, row: row ?? {} }));

  let target: ApplicationEntry | null = null;
  const inviteToken = normalizeKey(params.inviteToken);
  if (inviteToken) {
    target = entries.find(({ row }) => normalizeKey(row.interviewInviteToken) === inviteToken) ?? null;
  }
  if (!target && params.previousSlotIds?.length) {
    const previousIds = new Set(params.previousSlotIds.map((v) => normalizeKey(v)));
    target = entries.find(({ row }) =>
      normalizeKey(row.email) === email && previousIds.has(normalizeKey(row.interviewSlotId))
    ) ?? null;
  }
  if (!target) {
    target = pickApplicationByEmailAndName(entries, email, params.bookingName);
  }
  if (!target) return;

  const status = normalizeKey(target.row.status);
  const patch: Record<string, unknown> = {
    interviewSlotId: params.newSlotId,
    interviewScheduledAt: params.newDatetimeIso,
    updatedAt: new Date().toISOString(),
  };
  if (inviteToken) patch.interviewInviteToken = params.inviteToken;
  if (!target.row.statusManualOverride && !TERMINAL_APPLICATION_STATUSES.has(status)) {
    patch.status = "Interview Scheduled";
  }
  await sbPatch(`applications/${target.id}`, patch);
}
