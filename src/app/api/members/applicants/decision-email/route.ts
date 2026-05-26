import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import { createTransportForFrom, getDefaultFromAddress, getDefaultReplyToAddress, resolveFromWithName } from "@/lib/server/smtp";
import { buildConfirmedAccountAcceptanceTemplate } from "@/lib/server/applicantEmails";
import { renderAutomationEmail } from "@/lib/server/templateRenderer";
import { loadEmailTemplate } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";

type DecisionEmailBody = {
  applicantName?: string;
  applicantEmail?: string;
  decision?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const DEFAULT_ACCEPTED_SUBJECT = "Congratulations — You've been accepted to Volta NYC";

// {{link}} resolves to a permanent /members/signup?email=... URL — it never expires.
// The member visits that page and clicks "Send me a setup link" to receive a fresh
// 24-hour OTP in a separate email.
const DEFAULT_ACCEPTED_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,'EB Garamond',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">Congratulations! You've been accepted to Volta NYC.</p>
    <p style="margin:0 0 24px;">Click below to set up your member portal account:</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#85CC17;color:#0d0d0d;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Set Up Your Account</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#666666;">You'll be taken to a page where you can request a secure setup link. The link can be re-requested at any time, so this email doesn't expire.</p>
    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang<br>Volta NYC</p>
  </div>
</body>
</html>`;

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json()) as DecisionEmailBody;
  const applicantName  = (body.applicantName  ?? "").trim();
  const applicantEmail = normalizeEmail(body.applicantEmail ?? "");
  const decision = body.decision;

  if (!applicantName || !applicantEmail || !decision) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (decision !== "Accepted") {
    return NextResponse.json({ success: true, skipped: true, reason: "non_acceptance_no_email" });
  }
  if (!/\S+@\S+\.\S+/.test(applicantEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? "https://voltanyc.org").trim();
  const signupUrl = `${baseUrl}/members/signup?email=${encodeURIComponent(applicantEmail)}`;

  const from = getDefaultFromAddress();
  let transporter: ReturnType<typeof createTransportForFrom>["transporter"];
  try {
    transporter = createTransportForFrom(from).transporter;
  } catch {
    return NextResponse.json({ error: "smtp_not_configured" }, { status: 500 });
  }

  const firstName = applicantName.split(" ")[0] || applicantName;

  // Check whether this email already has a confirmed Supabase auth account.
  let confirmedAccountExists = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === applicantEmail);
    confirmedAccountExists = !!(match?.email_confirmed_at);
  } catch { /* treat as new user */ }

  if (confirmedAccountExists) {
    // Already has a portal account — notify of acceptance, link directly to portal.
    const rendered = await renderAutomationEmail("applicant_accepted", { applicantName, firstName, link: `${baseUrl}/members` });
    const fallback = buildConfirmedAccountAcceptanceTemplate({ name: applicantName });
    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: applicantEmail,
      subject: rendered?.subject ?? fallback.subject,
      text: fallback.text,
      html: rendered?.html ?? fallback.html,
    });
  } else {
    // No confirmed portal account — send permanent signup link.
    // The member visits /members/signup?email=... and clicks "Send me a setup link"
    // to receive a fresh 24-hour OTP on demand. This email never expires.
    const { subject, html } = await loadEmailTemplate(
      "applicant_accepted",
      { name: applicantName, firstName, link: signupUrl },
      { subject: DEFAULT_ACCEPTED_SUBJECT, html: DEFAULT_ACCEPTED_HTML }
    );

    const text = [
      `Hi ${firstName},`,
      "",
      "Congratulations! You've been accepted to Volta NYC.",
      "",
      "Click the link below to set up your member portal account:",
      signupUrl,
      "",
      "You'll be taken to a page where you can request a secure setup link.",
      "The link can be re-requested at any time, so this email doesn't expire.",
      "",
      "Best,",
      "Ethan Zhang",
      "Volta NYC",
    ].join("\n");

    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: applicantEmail,
      subject,
      text,
      html,
    });
  }

  await writeAuditLog({
    action: "decision_email",
    collection: "applications",
    recordId: applicantEmail,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { decision, applicantEmail },
  });

  return NextResponse.json({ success: true });
}
