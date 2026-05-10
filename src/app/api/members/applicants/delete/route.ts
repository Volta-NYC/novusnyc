import { NextRequest, NextResponse } from "next/server";
import { dbDelete, dbPush, verifyCaller } from "@/lib/server/adminApi";

type DeleteBody = {
  id?: string;
};

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as DeleteBody;
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await dbDelete(`applications/${id}`);

  await dbPush("auditLogs", {
    timestamp: new Date().toISOString(),
    action: "delete",
    collection: "applications",
    recordId: id,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name || verified.caller.email,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}

