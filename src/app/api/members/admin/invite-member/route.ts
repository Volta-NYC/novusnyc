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
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) return NextResponse.json({ error: "missing_member_id" }, { status: 400 });

  const sb = getSupabaseAdmin();

  const { data: rows } = await sb.from("team").select("*").eq("id", memberId).limit(1);
  const member = rows?.[0] as Record<string, unknown> | undefined;
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 404 });

  const email = String(member.email ?? "").trim().toLowerCase();
  const name  = String(member.name  ?? "").trim() || email;
  if (!email) return NextResponse.json({ error: "member_has_no_email" }, { status: 400 });

  // redirectTo includes ?email= so the signup page always knows the member's
  // email — used to show a pre-filled "Send me a setup link" button on both
  // success and expired-OTP error screens.
  const redirectTo = `${siteOrigin(req)}/members/signup?email=${encodeURIComponent(email)}`;

  const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: name },
  });

  if (inviteErr) {
    console.error("[invite-member] inviteUserByEmail failed:", inviteErr);
    return NextResponse.json({ error: "invite_failed" }, { status: 500 });
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
