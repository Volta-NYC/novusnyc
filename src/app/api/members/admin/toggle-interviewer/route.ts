import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  const enabled  = typeof body.enabled  === "boolean" ? body.enabled : undefined;

  if (!memberId || enabled === undefined) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data: rows } = await sb
    .from("team")
    .select("id, auth_uid")
    .eq("id", memberId)
    .limit(1);
  const member = rows?.[0] as { id: string; auth_uid: string | null } | undefined;
  if (!member) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  await sb.from("team").update({ can_interview: enabled }).eq("id", memberId);

  if (member.auth_uid) {
    const { data: { user } } = await sb.auth.admin.getUserById(member.auth_uid);
    if (user) {
      const existing = (user.app_metadata ?? {}) as Record<string, unknown>;
      await sb.auth.admin.updateUserById(member.auth_uid, {
        app_metadata: { ...existing, can_interview: enabled },
      });
    }
  }

  return NextResponse.json({ success: true, memberId, canInterview: enabled });
}
