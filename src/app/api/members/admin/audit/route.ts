import { NextRequest, NextResponse } from "next/server";
import { dbRead, verifyCaller } from "@/lib/server/adminApi";

type AuditLogRecord = {
  id: string;
  timestamp: string;
  action: string;
  collection: string;
  recordId?: string;
  actorUid?: string;
  actorEmail?: string;
  actorName?: string;
  details?: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "250", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 250;
  if (limit > 1000) limit = 1000;

  let logsData: unknown = null;
  try {
    logsData = await dbRead("auditLogs", verified.caller.idToken);
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const logs: AuditLogRecord[] = logsData && typeof logsData === "object"
    ? Object.entries(logsData as Record<string, Record<string, unknown>>).map(([id, raw]) => ({
        id,
        timestamp: typeof raw.timestamp === "string" ? raw.timestamp : "",
        action: typeof raw.action === "string" ? raw.action : "",
        collection: typeof raw.collection === "string" ? raw.collection : "",
        recordId: typeof raw.recordId === "string" ? raw.recordId : "",
        actorUid: typeof raw.actorUid === "string" ? raw.actorUid : "",
        actorEmail: typeof raw.actorEmail === "string" ? raw.actorEmail : "",
        actorName: typeof raw.actorName === "string" ? raw.actorName : "",
        details: raw.details && typeof raw.details === "object" ? (raw.details as Record<string, unknown>) : undefined,
      }))
    : [];

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    logs: logs.slice(0, limit),
  });
}
