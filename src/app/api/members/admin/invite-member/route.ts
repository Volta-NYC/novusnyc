import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "voltanyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function deleteUnconfirmedUser(sb: ReturnType<typeof getSupabaseAdmin>, email: string): Promise<void> {
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    const match = data.users.find(u => u.email?.toLowerCase() === email && !u.email_confirmed_at);
    if (match) {
      await sb.auth.admin.deleteUser(match.id);
      break;
    }
    if (data.users.length < 1000) break;
    page++;
  }
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

  const redirectTo = `${siteOrigin(req)}/members/signup?email=${encodeURIComponent(email)}`;

  let { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { full_name: name },
  });

  // If user already exists as unconfirmed (stale invite), delete and retry.
  if (inviteErr?.message?.includes("already been registered")) {
    await deleteUnconfirmedUser(sb, email);
    const retry = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: name },
    });
    inviteErr = retry.error;
  }

  if (inviteErr) {
    console.error("[invite-member] failed:", inviteErr);
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
