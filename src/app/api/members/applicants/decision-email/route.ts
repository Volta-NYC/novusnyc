import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import { createTransportForFrom, getDefaultFromAddress, getDefaultReplyToAddress, resolveFromWithName } from "@/lib/server/smtp";
import { buildConfirmedAccountAcceptanceTemplate } from "@/lib/server/applicantEmails";

export const runtime = "nodejs";

type DecisionEmailBody = {
  applicantName?: string;
  applicantEmail?: string;
  decision?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

  // Check if this email already has a confirmed auth account.
  // inviteUserByEmail is unsafe on confirmed accounts; fall back to nodemailer.
  let confirmedAccountExists = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === applicantEmail);
    confirmedAccountExists = !!(match?.email_confirmed_at);
  } catch { /* treat as unconfirmed */ }

  if (confirmedAccountExists) {
    const from = getDefaultFromAddress();
    let transporter: ReturnType<typeof createTransportForFrom>["transporter"];
    try {
      transporter = createTransportForFrom(from).transporter;
    } catch {
      return NextResponse.json({ error: "smtp_not_configured" }, { status: 500 });
    }
    const content = buildConfirmedAccountAcceptanceTemplate({ name: applicantName });
    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: applicantEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } else {
    // No confirmed account — use inviteUserByEmail so Supabase sends the
    // acceptance+invite email via its configured SMTP.
    const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(applicantEmail, {
      redirectTo: `${baseUrl}/members/signup`,
      data: { full_name: applicantName },
    });
    if (inviteErr) {
      return NextResponse.json({ error: "invite_failed", detail: inviteErr.message }, { status: 500 });
    }
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
