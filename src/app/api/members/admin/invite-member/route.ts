import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import { createTransportForFrom, getDefaultFromAddress } from "@/lib/server/smtp";
import { renderEmail } from "@/lib/server/templateRenderer";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "www.novusnyc.org";
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

  const { data: rows, error: memberError } = await sb.from("team").select("*").eq("id", memberId).limit(1);
  if (memberError) return NextResponse.json({ error: "member_lookup_failed" }, { status: 500 });
  const member = rows?.[0] as Record<string, unknown> | undefined;
  if (!member) return NextResponse.json({ error: "member_not_found" }, { status: 404 });

  const email     = String(member.email ?? "").trim().toLowerCase();
  const name      = String(member.name  ?? "").trim() || email;
  const firstName = name.split(" ")[0] || name;
  if (!email) return NextResponse.json({ error: "member_has_no_email" }, { status: 400 });

  // Permanent landing link — never expires.
  const link = `${siteOrigin(req)}/members/signup?email=${encodeURIComponent(email)}`;

  const rendered = await renderEmail("invite", { name, firstName, link }, { useTemplateSwitch: false });
  if (!rendered.ok) return NextResponse.json({ error: "email_not_set_up" }, { status: 500 });

  try {
    const { transporter } = createTransportForFrom(getDefaultFromAddress());
    await transporter.sendMail({ to: email, ...rendered.email });
  } catch (err) {
    // Logged, not returned: a raw SMTP error names hosts and accounts.
    console.error("[invite-member] sendMail failed:", err);
    return NextResponse.json({ error: "email_send_failed" }, { status: 500 });
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
