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
const DEFAULT_ACCEPTED_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,'EB Garamond',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">Congratulations! You've been accepted to Volta NYC.</p>
    <p style="margin:0 0 24px;">Click below to access the member portal and get started:</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#85CC17;color:#0d0d0d;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Access Member Portal</a>
    </p>
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
  let hasAnyAuthAccount = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === applicantEmail);
    confirmedAccountExists = !!(match?.email_confirmed_at);
    hasAnyAuthAccount = !!match;
  } catch { /* treat as new user */ }

  if (confirmedAccountExists) {
    // Already has a portal account — just send the acceptance notification.
    const rendered = await renderAutomationEmail("applicant_accepted", { applicantName, firstName, link: "https://voltanyc.org/members" });
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
    // No confirmed account — create auth user if needed, then send acceptance + setup link.
    if (!hasAnyAuthAccount) {
      const { error: createErr } = await sb.auth.admin.createUser({
        email: applicantEmail,
        email_confirm: false,
        user_metadata: { full_name: applicantName },
      });
      // Ignore "already registered" — the generateLink call below handles it.
      if (createErr && !createErr.message.toLowerCase().includes("already")) {
        return NextResponse.json({ error: "user_create_failed", detail: createErr.message }, { status: 500 });
      }
    }

    // Generate an invite OTP link that redirects back to our signup page.
    let otpLink: string | null = null;
    const { data: inviteData, error: inviteErr } = await sb.auth.admin.generateLink({
      type: "invite",
      email: applicantEmail,
      options: { redirectTo: signupUrl, data: { full_name: applicantName } },
    });
    otpLink = inviteData?.properties?.action_link ?? null;

    // Fall back to magiclink if invite-type fails (e.g. already confirmed via a race).
    if (inviteErr || !otpLink) {
      const { data: magicData } = await sb.auth.admin.generateLink({
        type: "magiclink",
        email: applicantEmail,
        options: { redirectTo: signupUrl },
      });
      otpLink = magicData?.properties?.action_link ?? null;
    }

    if (!otpLink) {
      return NextResponse.json({ error: "invite_link_failed" }, { status: 500 });
    }

    const { subject, html } = await loadEmailTemplate(
      "applicant_accepted",
      { name: applicantName, firstName, link: otpLink },
      { subject: DEFAULT_ACCEPTED_SUBJECT, html: DEFAULT_ACCEPTED_HTML }
    );

    const text = [
      `Hi ${firstName},`,
      "",
      "Congratulations! You've been accepted to Volta NYC.",
      "",
      "Click the link below to access the member portal:",
      otpLink,
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
