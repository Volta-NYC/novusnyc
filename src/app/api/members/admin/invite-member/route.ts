import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "voltanyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) return NextResponse.json({ error: "missing_member_id" }, { status: 400 });

  const sb = getSupabaseAdmin();

  // Load the team row.
  const { data: rows } = await sb.from("team").select("*").eq("id", memberId).limit(1);
  const member = rows?.[0] as Record<string, unknown> | undefined;
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 404 });

  const email = String(member.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "member_has_no_email" }, { status: 400 });

  // inviteUserByEmail sends through Supabase's configured SMTP —
  // uses the invite email template set in Authentication → Email Templates.
  const baseUrl = siteOrigin(req);
  const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${baseUrl}/members/signup`,
  });
  if (inviteErr) {
    return NextResponse.json({ error: "invite_failed", detail: inviteErr.message }, { status: 500 });
  }

  await writeAuditLog({
    action: "invite",
    collection: "team",
    recordId: memberId,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { invitedEmail: email },
  });

  return NextResponse.json({ success: true });
}
