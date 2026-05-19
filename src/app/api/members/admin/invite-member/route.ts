import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import {
  createTransportForFrom,
  getDefaultFromAddress,
  resolveFromWithName,
  getDefaultReplyToAddress,
} from "@/lib/server/smtp";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "voltanyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function buildInviteEmail(name: string, signupLink: string): { subject: string; text: string; html: string } {
  const firstName = name.split(" ")[0] || name;
  const subject = "Set up your Volta NYC member portal account";
  const text = [
    `Hi ${firstName},`,
    "",
    "Welcome to Volta NYC! You've been invited to set up your account on the member portal.",
    "",
    "Click the link below to get started:",
    signupLink,
    "",
    "If you didn't expect this email, you can safely ignore it.",
    "",
    "— Volta NYC",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="margin-bottom:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Set up your member portal account</h2>
  <p style="margin:0 0 24px;color:#555;font-size:15px">Hi ${firstName}, you've been invited to join the Volta NYC member portal.</p>
  <a href="${signupLink}"
     style="display:inline-block;background:#85CC17;color:#0d0d0d;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px">
    Set Up Account
  </a>
  <p style="margin:24px 0 0;font-size:13px;color:#888">
    If you didn't expect this email, you can safely ignore it.
  </p>
</body>
</html>`;

  return { subject, text, html };
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

  // Permanent landing link — no Supabase OTP token, never expires.
  // The member clicks it, sees a "Send me a setup link" button, and triggers
  // their own fresh OTP at that moment. This avoids the 24-hour expiry problem.
  const signupLink = `${siteOrigin(req)}/members/signup?email=${encodeURIComponent(email)}`;

  const from = getDefaultFromAddress();
  const { transporter } = createTransportForFrom(from);
  const { subject, text, html } = buildInviteEmail(name, signupLink);
  await transporter.sendMail({
    from: resolveFromWithName(from),
    replyTo: getDefaultReplyToAddress(from),
    to: email,
    subject,
    text,
    html,
  });

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
