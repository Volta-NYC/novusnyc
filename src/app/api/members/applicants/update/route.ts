import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

type UpdateBody = {
  id?: string;
  patch?: Record<string, unknown>;
};

const ALLOWED_FIELDS = new Set([
  "status",
  "notes",
  "interviewInviteToken",
  "interviewInviteSentAt",
  "interviewReminderSentAt",
  "interviewSlotId",
  "interviewScheduledAt",
  "finalDecisionRole",
  "interviewEvaluations",
]);

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as UpdateBody;
  const id = (body.id ?? "").trim();
  const patchIn = body.patch ?? {};
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (!patchIn || typeof patchIn !== "object") {
    return NextResponse.json({ error: "missing_patch" }, { status: 400 });
  }

  const existing = await dbRead(`applications/${id}`, verified.caller.idToken);
  if (!existing || typeof existing !== "object") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patchIn)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    patch[key] = value;
  }
  patch.updatedAt = new Date().toISOString();

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  await dbPatch(`applications/${id}`, patch, verified.caller.idToken);
  return NextResponse.json({ success: true });
}

