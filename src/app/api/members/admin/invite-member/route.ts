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
    "Welcome to Volta NYC! You've been invited to set up your account on the Volta member portal.",
    "",
    "Click the link below to create your password and access the portal:",
    signupLink,
    "",
    "This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.",
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
    This link expires in 24 hours. If you didn't expect this email, you can safely ignore it.
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

  const baseUrl = siteOrigin(req);

  // Check whether this email already has a confirmed Supabase auth account.
  // inviteUserByEmail sends via Supabase's configured SMTP (no spam risk) but
  // is unsafe on confirmed accounts — it creates a duplicate that shadows the
  // original. If confirmed, fall back to generateLink + nodemailer instead.
  let confirmedAccountExists = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === email);
    confirmedAccountExists = !!(match?.email_confirmed_at);
  } catch { /* ignore, treat as unconfirmed */ }

  if (confirmedAccountExists) {
    // Safe path: generate link, send via nodemailer.
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${baseUrl}/members/signup` },
    });
    if (linkErr) {
      return NextResponse.json({ error: "invite_link_failed", detail: linkErr.message }, { status: 500 });
    }
    const signupLink = linkData?.properties?.action_link ?? `${baseUrl}/members/signup`;

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
  } else {
    // No confirmed account — safe to use inviteUserByEmail which sends via
    // Supabase's configured SMTP (custom SMTP set in Supabase dashboard).
    const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${baseUrl}/members/signup`,
      data: { full_name: name },
    });
    if (inviteErr) {
      return NextResponse.json({ error: "invite_failed", detail: inviteErr.message }, { status: 500 });
    }
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
