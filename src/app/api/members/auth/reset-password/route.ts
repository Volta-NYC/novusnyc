import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit, getClientIp } from "@/lib/server/rateLimit";
import {
  createTransportForFrom,
  getDefaultFromAddress,
  resolveFromWithName,
  getDefaultReplyToAddress,
} from "@/lib/server/smtp";
import { loadEmailTemplate } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";

const DEFAULT_SUBJECT = "Reset your Novus NYC password";
const DEFAULT_HTML = `<p>Hi {{firstName}},</p>
<p>We received a request to reset the password for your Novus NYC member portal account. Use the link below to choose a new one.</p>
<p><a href="{{link}}">Reset your password</a></p>
<p>This link expires in 1 hour and can only be used once. If you didn't request a password reset, you can ignore this email.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>`;

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "www.novusnyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipCheck = await consumeRateLimit({ bucket: "reset-password-ip", key: ip, limit: 5, windowSec: 3600 });
  if (!ipCheck.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const emailCheck = await consumeRateLimit({ bucket: "reset-password-email", key: email, limit: 3, windowSec: 3600 });
  if (!emailCheck.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  const sb = getSupabaseAdmin();
  const redirectTo = `${siteOrigin(req)}/members/reset-password`;

  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  // Unknown email → return success silently to avoid email enumeration.
  if (linkErr || !linkData?.properties?.action_link) {
    return NextResponse.json({ success: true });
  }

  const link = linkData.properties.action_link;

  // Look up name for personalisation — fall back to email prefix if not in team.
  const { data: rows } = await sb
    .from("team")
    .select("name")
    .or(`email.eq.${email},alternate_email.eq.${email}`)
    .is("deleted_at", null)
    .limit(1);
  const name = String((rows?.[0] as Record<string, unknown> | undefined)?.name ?? "") || email;
  const firstName = name.split(" ")[0] || name;

  const { subject, html } = await loadEmailTemplate(
    "password-reset",
    { name, firstName, link },
    { subject: DEFAULT_SUBJECT, html: DEFAULT_HTML },
  );

  const text = `Hi ${firstName},\n\nClick the link below to reset your Novus NYC member portal password:\n${link}\n\nThis link expires in 1 hour. If you didn't request a reset, ignore this email.\n\nBest,\nEthan\nNovus NYC`;

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

  return NextResponse.json({ success: true });
}
