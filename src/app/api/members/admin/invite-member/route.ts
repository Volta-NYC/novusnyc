import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import {
  createTransportForFrom,
  getDefaultFromAddress,
  resolveFromWithName,
  getDefaultReplyToAddress,
} from "@/lib/server/smtp";
import { loadEmailTemplate } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "www.novusnyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const DEFAULT_INVITE_SUBJECT = "Set up your Novus NYC member portal account";
const DEFAULT_INVITE_HTML = `<p>Hi {{firstName}},</p>
<p>You've been invited to join the Novus NYC member portal.</p>
<p><a href="{{link}}">Set up your account</a></p>
<p>If you didn't expect this email, you can ignore it.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>`;

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

  const { subject, html } = await loadEmailTemplate(
    "invite",
    { name, firstName, link },
    { subject: DEFAULT_INVITE_SUBJECT, html: DEFAULT_INVITE_HTML }
  );

  const text = `Hi ${firstName},\n\nYou've been invited to set up your account on the Novus NYC member portal.\n\n${link}\n\nIf you didn't expect this email, you can safely ignore it.\n\nBest,\nEthan\nNovus NYC`;

  try {
    const from = getDefaultFromAddress();
    const { transporter } = createTransportForFrom(from);
    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: email,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[invite-member] sendMail failed:", err);
    return NextResponse.json({ error: "email_send_failed", detail: String(err) }, { status: 500 });
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
