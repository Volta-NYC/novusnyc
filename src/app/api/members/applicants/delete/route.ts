import { NextRequest, NextResponse } from "next/server";
import { dbPush, verifyCaller } from "@/lib/server/adminApi";
import { getAdminDB } from "@/lib/firebaseAdmin";

type DeleteBody = {
  id?: string;
};

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "";

async function dbDelete(path: string, idToken?: string): Promise<void> {
  const adminDb = getAdminDB();
  if (adminDb) {
    await adminDb.ref(path).remove();
    return;
  }
  if (!DB_URL) throw new Error("no_db");
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const base = `${DB_URL}/${cleanPath}.json`;
  const url = idToken ? `${base}?auth=${encodeURIComponent(idToken)}` : base;
  const res = await fetch(url, { method: "DELETE", cache: "no-store" });
  if (!res.ok) throw new Error("db_delete_failed");
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as DeleteBody;
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  await dbDelete(`applications/${id}`, verified.caller.idToken);

  await dbPush("auditLogs", {
    timestamp: new Date().toISOString(),
    action: "delete",
    collection: "applications",
    recordId: id,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name || verified.caller.email,
  }, verified.caller.idToken).catch(() => {});

  return NextResponse.json({ success: true });
}

