import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("email_templates")
    .select("id, key, label, description, subject, body, available_variables, updated_at, updated_by")
    .in("key", ["invite", "setup-link"])
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const key     = typeof body.key     === "string" ? body.key.trim()     : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html    = typeof body.html    === "string" ? body.html           : "";

  if (!key || !subject || !html) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!["invite", "setup-link"].includes(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("email_templates")
    .update({ subject, body: html, updated_at: new Date().toISOString(), updated_by: verified.caller.email })
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    action: "update_email_template",
    collection: "email_templates",
    recordId: key,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { key, subject },
  });

  return NextResponse.json({ success: true });
}
