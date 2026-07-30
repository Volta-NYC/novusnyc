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
  const host = req.headers.get("host") ?? "novusnyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const DEFAULT_INVITE_SUBJECT = "Set up your Novus NYC member portal account";
const DEFAULT_INVITE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="margin-bottom:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Set up your member portal account</h2>
  <p style="margin:0 0 24px;color:#555;font-size:15px">Hi {{firstName}}, you've been invited to join the Novus NYC member portal.</p>
  <a href="{{link}}" style="display:inline-block;background:#F6B78D;color:#0d0d0d;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px">Set Up Account</a>
  <p style="margin:24px 0 0;font-size:13px;color:#888">If you didn't expect this email, you can safely ignore it.</p>
</body>
</html>`;

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

  const text = `Hi ${firstName},\n\nYou've been invited to set up your account on the Novus NYC member portal.\n\n${link}\n\nIf you didn't expect this email, you can safely ignore it.\n\n— Novus NYC`;

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
