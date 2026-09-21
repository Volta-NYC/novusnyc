import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";
import { createTransportForFrom, getDefaultFromAddress } from "@/lib/server/smtp";
import { renderAutomationEmail, renderEmail, type RenderOutcome } from "@/lib/server/templateRenderer";
import { acceptanceCcAddress, findAcceptancePlacement } from "@/lib/members/acceptancePlacements";
import { EMAIL } from "@/lib/mail";

export const runtime = "nodejs";

type DecisionEmailBody = {
  applicantName?: string;
  applicantEmail?: string;
  decision?: string;
  placementId?: string;
  interview?: boolean;
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
  const placement = findAcceptancePlacement((body.placementId ?? "").trim());
  const interview = body.interview === true;

  if (!applicantName || !applicantEmail || !decision) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (decision !== "Accepted") {
    return NextResponse.json({ success: true, skipped: true, reason: "non_acceptance_no_email" });
  }
  if (!/\S+@\S+\.\S+/.test(applicantEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  // The interview emails are team welcomes with a booking link; there is no
  // general one to send.
  if (interview && !placement) {
    return NextResponse.json({ error: "interview_needs_team" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? "https://www.novusnyc.org").trim();
  const firstName = applicantName.split(" ")[0] || applicantName;

  // Someone who already has an account is pointed at the portal; everyone else
  // at the permanent signup page, which sends them a fresh setup link on demand.
  let confirmedAccountExists = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === applicantEmail);
    confirmedAccountExists = !!(match?.email_confirmed_at);
  } catch { /* treat as new user */ }
  const portalLink = confirmedAccountExists
    ? `${baseUrl}/members`
    : `${baseUrl}/members/signup?email=${encodeURIComponent(applicantEmail)}`;

  let rendered: RenderOutcome;
  let cc: string | undefined;
  let bcc: string | undefined;

  if (placement) {
    const { data: settings } = await sb
      .from("site_settings")
      .select("acceptance_whatsapp_links, acceptance_cc_email, acceptance_booking_link")
      .eq("id", "singleton")
      .maybeSingle();

    // Each Marketing pod runs its own group, so the link is looked up by
    // placement rather than shared.
    const whatsappLinks = (settings?.acceptance_whatsapp_links ?? {}) as Record<string, unknown>;
    const whatsappLink = String(whatsappLinks[placement.id] ?? "").trim();
    if (placement.needsWhatsapp && !whatsappLink) {
      return NextResponse.json({ error: "whatsapp_link_missing" }, { status: 400 });
    }
    const bookingLink = String(settings?.acceptance_booking_link ?? "").trim();
    if (interview && !bookingLink) {
      return NextResponse.json({ error: "booking_link_missing" }, { status: 400 });
    }

    rendered = await renderEmail(interview ? placement.interviewTemplateKey : placement.templateKey, {
      firstName,
      applicantName,
      portalLink,
      whatsappLink,
      bookingLink,
    });
    // The CC is named in the copy, so it stays visible. The shared inbox is
    // blind-copied purely so the team keeps a record of what went out.
    cc = acceptanceCcAddress(placement, String(settings?.acceptance_cc_email ?? "")) || undefined;
    bcc = EMAIL.info;
  } else {
    rendered = await renderAutomationEmail("applicant_accepted", { firstName, applicantName, link: portalLink });
  }

  if (!rendered.ok) {
    return NextResponse.json({ error: rendered.reason === "off" ? "email_off" : "email_not_set_up" }, { status: 409 });
  }

  let transporter: ReturnType<typeof createTransportForFrom>["transporter"];
  try {
    transporter = createTransportForFrom(getDefaultFromAddress()).transporter;
  } catch {
    return NextResponse.json({ error: "smtp_not_configured" }, { status: 500 });
  }
  await transporter.sendMail({ to: applicantEmail, cc, bcc, ...rendered.email });

  await writeAuditLog({
    action: "decision_email",
    collection: "applications",
    recordId: applicantEmail,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { decision, applicantEmail, placement: placement?.id ?? null, interview },
  });

  return NextResponse.json({ success: true });
}
