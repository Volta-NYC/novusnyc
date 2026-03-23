import { NextRequest, NextResponse } from "next/server";
import { dbDelete, dbPatch, dbPush, dbRead, verifyCaller } from "@/lib/server/adminApi";

type FinanceAssignmentRow = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNameKey(value: unknown): string {
  return asText(value).replace(/\s+/g, " ").toLowerCase();
}

function normalizeAssignmentType(value: unknown): "Report" | "Case Study" | "Grant" {
  const raw = asText(value);
  if (raw === "Report" || raw === "Case Study" || raw === "Grant") return raw;
  if (raw === "Business Case Study") return "Case Study";
  return "Report";
}

function normalizeAssignmentStatus(value: unknown): "Upcoming" | "Ongoing" | "Completed" {
  const raw = asText(value);
  if (raw === "Upcoming" || raw === "Ongoing" || raw === "Completed") return raw;
  if (raw === "On Hold") return "Upcoming";
  return "Upcoming";
}

type NormalizedDeadline = { label: string; date: string };

function normalizeDeadlines(row: FinanceAssignmentRow): NormalizedDeadline[] {
  const fromArray = Array.isArray(row.deadlines)
    ? row.deadlines
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const data = item as Record<string, unknown>;
        const label = asText(data.label);
        const date = asText(data.date);
        if (!label && !date) return null;
        return { label, date };
      })
      .filter((item): item is NormalizedDeadline => !!item)
    : [];

  if (fromArray.length > 0) return fromArray;

  const legacy: NormalizedDeadline[] = [];
  const finalDue = asText(row.finalDueDate);
  const genericDue = asText(row.deadline);
  const firstDraft = asText(row.firstDraftDueDate);
  const interview = asText(row.interviewDueDate);

  if (finalDue) legacy.push({ label: "Final Deadline", date: finalDue });
  if (genericDue && genericDue !== finalDue) legacy.push({ label: "1st Deadline", date: genericDue });
  if (firstDraft && firstDraft !== finalDue && firstDraft !== genericDue) legacy.push({ label: "2nd Deadline", date: firstDraft });
  if (interview && interview !== finalDue && interview !== genericDue && interview !== firstDraft) {
    legacy.push({ label: "Interview Deadline", date: interview });
  }

  return legacy;
}

function normalizeRow(id: string, row: FinanceAssignmentRow) {
  const createdAt = asText(row.createdAt) || new Date().toISOString();
  const deadlines = normalizeDeadlines(row);
  return {
    id,
    seedKey: asText(row.seedKey),
    type: normalizeAssignmentType(row.type),
    title: asText(row.title),
    topic: asText(row.topic),
    teamLabel: asText(row.teamLabel),
    region: asText(row.region),
    assignedMemberNames: Array.isArray(row.assignedMemberNames)
      ? row.assignedMemberNames.map((item) => asText(item)).filter(Boolean)
      : [],
    assignedMemberIds: Array.isArray(row.assignedMemberIds)
      ? row.assignedMemberIds.map((item) => asText(item)).filter(Boolean)
      : [],
    deadlines,
    deadline: asText(row.deadline),
    interviewDueDate: asText(row.interviewDueDate),
    firstDraftDueDate: asText(row.firstDraftDueDate),
    finalDueDate: asText(row.finalDueDate),
    deliverableUrl: asText(row.deliverableUrl),
    status: normalizeAssignmentStatus(row.status),
    notes: asText(row.notes),
    createdAt,
    updatedAt: asText(row.updatedAt) || createdAt,
  };
}

function buildAllowedAssigneeLookup(
  teamRows: Record<string, FinanceAssignmentRow>,
  applicationRows: Record<string, FinanceAssignmentRow>,
): { canonicalByKey: Map<string, string>; teamIdByKey: Map<string, string> } {
  const canonicalByKey = new Map<string, string>();
  const teamIdByKey = new Map<string, string>();

  for (const [id, row] of Object.entries(teamRows)) {
    const name = asText(row?.name);
    const key = normalizeNameKey(name);
    if (!key) continue;
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, name);
    if (id) teamIdByKey.set(key, id);
  }

  for (const row of Object.values(applicationRows)) {
    const name = asText(row?.fullName);
    const key = normalizeNameKey(name);
    if (!key) continue;
    if (!canonicalByKey.has(key)) canonicalByKey.set(key, name);
  }

  return { canonicalByKey, teamIdByKey };
}

function sanitizeAssignedMembers(
  row: FinanceAssignmentRow,
  lookup: { canonicalByKey: Map<string, string>; teamIdByKey: Map<string, string> },
): { names: string[]; ids: string[] } {
  const seen = new Set<string>();
  const names: string[] = [];
  const ids: string[] = [];
  const rawNames = Array.isArray(row.assignedMemberNames) ? row.assignedMemberNames : [];

  for (const rawName of rawNames) {
    const key = normalizeNameKey(rawName);
    if (!key || seen.has(key)) continue;
    const canonicalName = lookup.canonicalByKey.get(key);
    if (!canonicalName) continue;
    seen.add(key);
    names.push(canonicalName);
    const teamId = lookup.teamIdByKey.get(key);
    if (teamId) ids.push(teamId);
  }

  return { names, ids };
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const rowsData = await dbRead("financeAssignments", verified.caller.idToken);
  const rows = (rowsData ?? {}) as Record<string, FinanceAssignmentRow>;
  const assignments = Object.entries(rows)
    .map(([id, row]) => normalizeRow(id, row ?? {}))
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt || "");
      const bTime = Date.parse(b.updatedAt || b.createdAt || "");
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

  return NextResponse.json({ success: true, assignments });
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json() as FinanceAssignmentRow;
  const [teamRows, applicationRows] = await Promise.all([
    dbRead("team", verified.caller.idToken),
    dbRead("applications", verified.caller.idToken),
  ]);
  const lookup = buildAllowedAssigneeLookup(
    (teamRows ?? {}) as Record<string, FinanceAssignmentRow>,
    (applicationRows ?? {}) as Record<string, FinanceAssignmentRow>,
  );
  const sanitizedAssignees = sanitizeAssignedMembers(body, lookup);
  const now = new Date().toISOString();
  const nextBody: FinanceAssignmentRow = {
    ...body,
    type: normalizeAssignmentType(body.type),
    status: normalizeAssignmentStatus(body.status),
    assignedMemberNames: sanitizedAssignees.names,
    assignedMemberIds: sanitizedAssignees.ids,
  };
  await dbPush("financeAssignments", { ...nextBody, createdAt: now, updatedAt: now }, verified.caller.idToken);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json() as { id?: string; patch?: FinanceAssignmentRow };
  const id = asText(body.id);
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const patch = { ...((body.patch ?? {}) as FinanceAssignmentRow) };
  if ("type" in patch) patch.type = normalizeAssignmentType(patch.type);
  if ("status" in patch) patch.status = normalizeAssignmentStatus(patch.status);
  if ("assignedMemberNames" in patch || "assignedMemberIds" in patch) {
    const [teamRows, applicationRows] = await Promise.all([
      dbRead("team", verified.caller.idToken),
      dbRead("applications", verified.caller.idToken),
    ]);
    const lookup = buildAllowedAssigneeLookup(
      (teamRows ?? {}) as Record<string, FinanceAssignmentRow>,
      (applicationRows ?? {}) as Record<string, FinanceAssignmentRow>,
    );
    const sanitizedAssignees = sanitizeAssignedMembers(patch, lookup);
    patch.assignedMemberNames = sanitizedAssignees.names;
    patch.assignedMemberIds = sanitizedAssignees.ids;
  }
  await dbPatch(`financeAssignments/${id}`, { ...patch, updatedAt: new Date().toISOString() }, verified.caller.idToken);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const url = new URL(req.url);
  const id = asText(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await dbDelete(`financeAssignments/${id}`, verified.caller.idToken);

  return NextResponse.json({ success: true });
}
