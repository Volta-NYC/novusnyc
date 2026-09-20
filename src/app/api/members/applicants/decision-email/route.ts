import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import { createTransportForFrom, getDefaultFromAddress, getDefaultReplyToAddress, resolveFromWithName } from "@/lib/server/smtp";
import { buildConfirmedAccountAcceptanceTemplate } from "@/lib/server/applicantEmails";
import { renderAutomationEmail } from "@/lib/server/templateRenderer";
import { loadEmailTemplate } from "@/lib/server/emailTemplates";
import { renderAcceptanceEmail } from "@/lib/server/acceptanceEmail";
import { acceptanceCcAddress, findAcceptancePlacement } from "@/lib/members/acceptancePlacements";
import { EMAIL } from "@/lib/mail";

export const runtime = "nodejs";

type DecisionEmailBody = {
  applicantName?: string;
  applicantEmail?: string;
  decision?: string;
  placementId?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const DEFAULT_ACCEPTED_SUBJECT = "Congratulations — You've been accepted to Novus NYC";

// {{link}} resolves to a permanent /members/signup?email=... URL — it never expires.
// The member visits that page and clicks "Send me a setup link" to receive a fresh
// 24-hour OTP in a separate email.
const DEFAULT_ACCEPTED_HTML = `<p>Hi {{firstName}},</p>
<p>Congratulations! You've been accepted to Novus NYC.</p>
<p>Use the link below to set up your member portal account:</p>
<p><a href="{{link}}">Set up your account</a></p>
<p>You'll be taken to a page where you can request a secure setup link. The link can be re-requested at any time, so this email doesn't expire.</p>
<p>Best,<br>Ethan</p>`;

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json()) as DecisionEmailBody;
  const applicantName  = (body.applicantName  ?? "").trim();
  const applicantEmail = normalizeEmail(body.applicantEmail ?? "");
  const decision = body.decision;
  const placement = findAcceptancePlacement((body.placementId ?? "").trim());

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
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? "https://www.novusnyc.org").trim();
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

  // A placement picks the department-specific welcome. Someone with an account
  // already gets the same copy pointed at the portal instead of at signup.
  if (placement) {
    const { data: settings } = await sb
      .from("site_settings")
      .select("acceptance_whatsapp_links, acceptance_cc_email")
      .eq("id", "singleton")
      .maybeSingle();

    // Each Marketing pod runs its own group, so the link is looked up by
    // placement rather than shared.
    const whatsappLinks = (settings?.acceptance_whatsapp_links ?? {}) as Record<string, unknown>;
    const whatsappLink = String(whatsappLinks[placement.id] ?? "").trim();
    if (placement.needsWhatsapp && !whatsappLink) {
      return NextResponse.json({ error: "whatsapp_link_missing" }, { status: 400 });
    }

    const rendered = await renderAcceptanceEmail(placement.templateKey, {
      firstName,
      applicantName,
      portalLink: confirmedAccountExists ? `${baseUrl}/members` : signupUrl,
      whatsappLink,
    });
    if (!rendered) return NextResponse.json({ error: "template_missing" }, { status: 500 });

    const cc = acceptanceCcAddress(placement, String(settings?.acceptance_cc_email ?? ""));

    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: applicantEmail,
      // The CC is named in the copy, so it stays visible. The shared inbox is
      // blind-copied purely so the team keeps a record of what went out.
      cc: cc || undefined,
      bcc: EMAIL.info,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  } else if (confirmedAccountExists) {
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
      "Congratulations! You've been accepted to Novus NYC.",
      "",
      "Click the link below to set up your member portal account:",
      signupUrl,
      "",
      "You'll be taken to a page where you can request a secure setup link.",
      "The link can be re-requested at any time, so this email doesn't expire.",
      "",
      "Best,",
      "Ethan Zhang",
      "Novus NYC",
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
    details: { decision, applicantEmail, placement: placement?.id ?? null },
  });

  return NextResponse.json({ success: true });
}
