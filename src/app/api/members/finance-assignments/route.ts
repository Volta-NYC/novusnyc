import { NextRequest, NextResponse } from "next/server";
import { dbDelete, dbPatch, dbPush, dbRead, verifyCaller } from "@/lib/server/adminApi";

type FinanceAssignmentRow = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRow(id: string, row: FinanceAssignmentRow) {
  const createdAt = asText(row.createdAt) || new Date().toISOString();
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
