import { NextRequest, NextResponse } from "next/server";
import { dbRead, verifyCaller } from "@/lib/server/adminApi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function toAuditLogRecord(id: string, raw: unknown): AuditLogRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  return {
    id,
    timestamp: typeof data.timestamp === "string" ? data.timestamp : "",
    action: typeof data.action === "string" ? data.action : "",
    collection: typeof data.collection === "string" ? data.collection : "",
    recordId: typeof data.recordId === "string" ? data.recordId : "",
    actorUid: typeof data.actorUid === "string" ? data.actorUid : "",
    actorEmail: typeof data.actorEmail === "string" ? data.actorEmail : "",
    actorName: typeof data.actorName === "string" ? data.actorName : "",
    details: data.details && typeof data.details === "object" ? (data.details as Record<string, unknown>) : undefined,
  };
}

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

  let logs: AuditLogRecord[] = [];
  try {
    logs = logsData && typeof logsData === "object"
      ? Object.entries(logsData as Record<string, unknown>)
          .map(([id, raw]) => toAuditLogRecord(id, raw))
          .filter((record): record is AuditLogRecord => record !== null)
      : [];
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 500 });
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    logs: logs.slice(0, limit),
  });
}
