import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbPush, dbRead, verifyCaller } from "@/lib/server/adminApi";

type IncomingApplicant = {
  fullName?: string;
  email?: string;
  schoolName?: string;
  grade?: string;
  cityState?: string;
  referral?: string;
  tracksSelected?: string;
  statusRaw?: string;
  notes?: string;
  timestampRaw?: string;
  resumeUrl?: string;
  inviteSent?: boolean;
};

type ApplicationRow = Record<string, unknown>;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTimestamp(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return new Date().toISOString();
  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
  const maybe = Date.parse(trimmed.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2"));
  if (!Number.isNaN(maybe)) return new Date(maybe).toISOString();
  return new Date().toISOString();
}

function coerceStatus(raw: string): string {
  const key = normalize(raw);
  if (key.includes("invite")) return "Interview Pending";
  if (key.includes("review")) return "Reviewing";
  if (key.includes("interview") && key.includes("schedule")) return "Interview Scheduled";
  if (key.includes("interview")) return "Interview Pending";
  if (key.includes("accept")) return "Accepted";
  if (key.includes("wait")) return "Waitlisted";
  if (key.includes("reject") || key.includes("not accepted")) return "Not Accepted";
  return "New";
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json() as { rows?: IncomingApplicant[] };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "missing_rows" }, { status: 400 });
  }

  const applicationsData = await dbRead("applications", verified.caller.idToken);
  const existing = (applicationsData ?? {}) as Record<string, ApplicationRow>;
  const byKey = new Map<string, { id: string; row: ApplicationRow }>();
  const byEmail = new Map<string, { id: string; row: ApplicationRow }>();
  const byName = new Map<string, Array<{ id: string; row: ApplicationRow }>>();

  Object.entries(existing).forEach(([id, row]) => {
    const fullName = asText(row.fullName);
    const email = asText(row.email).toLowerCase();
    const key = `${normalize(fullName)}|${normalize(email)}`;
    byKey.set(key, { id, row });
    if (email) byEmail.set(normalize(email), { id, row });
    if (fullName) {
      const nameKey = normalize(fullName);
      const arr = byName.get(nameKey) ?? [];
      arr.push({ id, row });
      byName.set(nameKey, arr);
    }
  });

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const incoming of rows) {
    const fullName = asText(incoming.fullName);
    const email = asText(incoming.email).toLowerCase();
    if (!fullName && !email) {
      skipped += 1;
      continue;
    }

    const key = `${normalize(fullName)}|${normalize(email)}`;
    let match = byKey.get(key);
    if (!match && email) match = byEmail.get(normalize(email));
    if (!match && fullName) {
      const candidates = byName.get(normalize(fullName)) ?? [];
      if (candidates.length === 1) [match] = candidates;
    }

    const nowIso = new Date().toISOString();
    const importedCreatedAt = parseTimestamp(asText(incoming.timestampRaw));

    const patch: Record<string, unknown> = {
      updatedAt: nowIso,
      source: "csv_import",
    };
    if (fullName) patch.fullName = fullName;
    if (email) patch.email = email;
    if (asText(incoming.schoolName)) patch.schoolName = asText(incoming.schoolName);
    if (asText(incoming.grade)) patch.grade = asText(incoming.grade);
    if (asText(incoming.cityState)) patch.cityState = asText(incoming.cityState);
    if (asText(incoming.referral)) patch.referral = asText(incoming.referral);
    if (asText(incoming.tracksSelected)) patch.tracksSelected = asText(incoming.tracksSelected);
    if (asText(incoming.statusRaw)) patch.status = coerceStatus(asText(incoming.statusRaw));
    if (asText(incoming.notes)) patch.notes = asText(incoming.notes);
    if (asText(incoming.timestampRaw)) patch.sourceTimestampRaw = asText(incoming.timestampRaw);
    if (asText(incoming.resumeUrl)) {
      patch.resumeUrl = asText(incoming.resumeUrl);
      patch.hasResume = "Yes";
    }
    if (incoming.inviteSent) patch.interviewInviteSentAt = importedCreatedAt;

    if (match) {
      await dbPatch(`applications/${match.id}`, patch, verified.caller.idToken);
      updated += 1;
      continue;
    }

    if (!fullName || !email) {
      skipped += 1;
      continue;
    }

    const status = asText(incoming.statusRaw) ? coerceStatus(asText(incoming.statusRaw)) : "New";
    const sourceTimestampRaw = asText(incoming.timestampRaw);
    const createdAt = importedCreatedAt;
    const record: Record<string, unknown> = {
      fullName,
      email,
      schoolName: asText(incoming.schoolName),
      grade: asText(incoming.grade),
      cityState: asText(incoming.cityState),
      referral: asText(incoming.referral),
      tracksSelected: asText(incoming.tracksSelected),
      hasResume: asText(incoming.resumeUrl) ? "Yes" : "",
      resumeUrl: asText(incoming.resumeUrl),
      toolsSoftware: "",
      accomplishment: "",
      status,
      notes: asText(incoming.notes),
      source: "csv_import",
      sourceTimestampRaw,
      createdAt,
      updatedAt: createdAt,
    };
    if (incoming.inviteSent) record.interviewInviteSentAt = importedCreatedAt;

    await dbPush("applications", record, verified.caller.idToken);
    added += 1;
  }

  return NextResponse.json({ success: true, added, updated, skipped });
}

