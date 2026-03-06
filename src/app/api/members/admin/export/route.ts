import { NextRequest, NextResponse } from "next/server";
import { dbRead, verifyCaller } from "@/lib/server/adminApi";

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let rootData: unknown = null;
  try {
    rootData = await dbRead("", verified.caller.idToken);
  } catch {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const payload = rootData && typeof rootData === "object" ? (rootData as Record<string, unknown>) : {};

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    ...payload,
  });
}
