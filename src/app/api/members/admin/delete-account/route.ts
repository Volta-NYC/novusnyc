import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) return NextResponse.json({ error: "missing_member_id" }, { status: 400 });

  const sb = getSupabaseAdmin();

  const { data: rows, error: readError } = await sb.from("team").select("id, name, auth_uid").eq("id", memberId).limit(1);
  if (readError) return NextResponse.json({ error: "member_lookup_failed" }, { status: 500 });
  const member = rows?.[0] as { id: string; name: string; auth_uid: string | null } | undefined;
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  if (!member.auth_uid) return NextResponse.json({ error: "no_linked_account" }, { status: 400 });
  if (member.auth_uid === verified.caller.uid) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  const { data: unlinked, error: unlinkError } = await sb.from("team")
    .update({ auth_uid: null }).eq("id", memberId).eq("auth_uid", member.auth_uid).select("id").maybeSingle();
  if (unlinkError || !unlinked) {
    return NextResponse.json({ error: "account_unlink_failed" }, { status: 500 });
  }

  const { error: deleteErr } = await sb.auth.admin.deleteUser(member.auth_uid);
  if (deleteErr) {
    console.error("[delete-account] deleteUser failed:", deleteErr);
    const { error: restoreError } = await sb.from("team").update({ auth_uid: member.auth_uid }).eq("id", memberId);
    if (restoreError) console.error("[delete-account] auth_uid restore failed:", restoreError);
    return NextResponse.json({ error: "delete_failed", detail: deleteErr.message }, { status: 500 });
  }

  await writeAuditLog({
    action: "delete_account",
    collection: "team",
    recordId: memberId,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { deletedAuthUid: member.auth_uid },
  });

  return NextResponse.json({ success: true });
}
