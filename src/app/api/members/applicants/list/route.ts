import { NextRequest, NextResponse } from "next/server";
import { dbRead, verifyCaller } from "@/lib/server/adminApi";

type ApplicationRow = Record<string, unknown>;

function readText(row: ApplicationRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeTimestamp(value: unknown, fallbackIso?: string): string {
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value.trim());
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    return value.trim();
  }
  return fallbackIso ?? new Date().toISOString();
}

function normalizeStatus(raw: string, hasScheduledInterview: boolean): string {
  const key = raw.trim().toLowerCase();
  if (key === "reviewing") return "Reviewing";
  if (key === "interview pending") return "Interview Pending";
  if (key === "interview scheduled") return "Interview Scheduled";
  if (key === "accepted") return "Accepted";
  if (key === "waitlisted") return "Waitlisted";
  if (key === "not accepted" || key === "rejected") return "Not Accepted";
  if (hasScheduledInterview) return "Interview Scheduled";
  return "New";
}

function normalizeApplication(id: string, row: ApplicationRow) {
  const createdAt = normalizeTimestamp(row.createdAt ?? row.Timestamp);
  const updatedAt = normalizeTimestamp(row.updatedAt, createdAt);
  const interviewSlotId = readText(row, ["interviewSlotId"]);
  const interviewScheduledAt = readText(row, ["interviewScheduledAt"]);
  const hasScheduledInterview = !!(interviewSlotId || interviewScheduledAt);
  return {
    id,
    fullName: readText(row, ["fullName", "Full Name", "name"]),
    email: readText(row, ["email", "Email"]).toLowerCase(),
    schoolName: readText(row, ["schoolName", "School Name", "Education", "school"]),
    grade: readText(row, ["grade", "Grade"]),
    cityState: readText(row, ["cityState", "City, State", "City"]),
    referral: readText(row, ["referral", "How They Heard"]),
    tracksSelected: readText(row, ["tracksSelected", "Tracks Selected"]),
    hasResume: readText(row, ["hasResume", "Has Resume"]),
    resumeUrl: readText(row, ["resumeUrl", "Resume URL"]),
    toolsSoftware: readText(row, ["toolsSoftware", "Tools/Software"]),
    accomplishment: readText(row, ["accomplishment", "Accomplishment"]),
    status: normalizeStatus(readText(row, ["status"]), hasScheduledInterview),
    notes: readText(row, ["notes", "Notes"]),
    interviewInviteToken: readText(row, ["interviewInviteToken"]),
    interviewInviteSentAt: readText(row, ["interviewInviteSentAt"]),
    interviewReminderSentAt: readText(row, ["interviewReminderSentAt"]),
    interviewSlotId,
    interviewScheduledAt,
    source: readText(row, ["source"]) || undefined,
    sourceTimestampRaw: readText(row, ["sourceTimestampRaw", "Timestamp"]),
    interviewEvaluations: (row.interviewEvaluations && typeof row.interviewEvaluations === "object")
      ? row.interviewEvaluations
      : {},
    finalDecisionRole: readText(row, ["finalDecisionRole"]),
    createdAt,
    updatedAt,
  };
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead", "interviewer"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const [applicationsData, slotsData] = await Promise.all([
    dbRead("applications", verified.caller.idToken),
    dbRead("interviewSlots", verified.caller.idToken),
  ]);

  const applications = Object.entries((applicationsData ?? {}) as Record<string, ApplicationRow>)
    .map(([id, row]) => normalizeApplication(id, row ?? {}))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return NextResponse.json({
    success: true,
    applications,
    slots: slotsData ?? {},
  });
}

