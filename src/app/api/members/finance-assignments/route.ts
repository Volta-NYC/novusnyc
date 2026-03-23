import { NextRequest, NextResponse } from "next/server";
import { dbDelete, dbPatch, dbPush, dbRead, verifyCaller } from "@/lib/server/adminApi";

type FinanceAssignmentRow = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type NormalizedDeadline = { label: string; date: string };

function normalizeDeadlines(row: FinanceAssignmentRow): NormalizedDeadline[] {
  const fromArray = Array.isArray(row.deadlines)
    ? row.deadlines
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const data = item as Record<string, unknown>;
        const label = asText(data.label) || "Deadline";
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
    type: asText(row.type) || "Report",
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
    status: asText(row.status) || "Upcoming",
    notes: asText(row.notes),
    createdAt,
    updatedAt: asText(row.updatedAt) || createdAt,
  };
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
  const now = new Date().toISOString();
  await dbPush("financeAssignments", { ...body, createdAt: now, updatedAt: now }, verified.caller.idToken);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json() as { id?: string; patch?: FinanceAssignmentRow };
  const id = asText(body.id);
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const patch = (body.patch ?? {}) as FinanceAssignmentRow;
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
