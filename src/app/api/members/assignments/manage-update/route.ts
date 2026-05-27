import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { id, message } = body as Record<string, unknown>;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (!message || typeof message !== "string" || !message.trim()) return NextResponse.json({ error: "missing_message" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("assignment_updates").update({ message: message.trim() }).eq("id", id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { id } = body as Record<string, unknown>;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("assignment_updates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
