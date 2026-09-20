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

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "www.novusnyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const DEFAULT_SETUP_SUBJECT = "Your Novus NYC portal setup link";
const DEFAULT_SETUP_HTML = `    <h2>Your portal setup link</h2>
<p>Hi {{firstName}}, click below to set up your Novus NYC member portal account.</p>
<a href="{{link}}">Set Up Account</a>
<p>This link expires in 24 hours and can only be used once. If it expires, <a href="{{signupUrl}}">click here</a> to request a new one.<br>If you didn't request this, you can safely ignore it.</p>
`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipCheck = await consumeRateLimit({ bucket: "signup-resend-ip", key: ip, limit: 5, windowSec: 3600 });
  if (!ipCheck.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const emailCheck = await consumeRateLimit({ bucket: "signup-resend-email", key: email, limit: 3, windowSec: 3600 });
  if (!emailCheck.ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const sb = getSupabaseAdmin();

  const { data: rows } = await sb
    .from("team")
    .select("id, name, auth_uid, status")
    .or(`email.eq.${email},alternate_email.eq.${email}`)
    .is("deleted_at", null)
    .limit(1);
  const member = rows?.[0] as Record<string, unknown> | undefined;

  if (!member || String(member.status ?? "").toLowerCase() === "inactive") {
    return NextResponse.json({ success: true });
  }

  if (member.auth_uid) {
    return NextResponse.json({ success: true, alreadyLinked: true });
  }

  const name      = String(member.name ?? email);
  const firstName = name.split(" ")[0] || name;
  const origin    = siteOrigin(req);
  const redirectTo = `${origin}/members/signup?email=${encodeURIComponent(email)}`;

  const { data: inviteData, error: inviteErr } = await sb.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo, data: { full_name: name } },
  });

  let link = inviteData?.properties?.action_link ?? null;

  // invite-type fails for already-confirmed users (legacy accounts with no auth_uid yet).
  // Fall back to magiclink — produces the same SIGNED_IN event on the signup page.
  if (inviteErr || !link) {
    const { data: magicData, error: magicErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo, data: { full_name: name } },
    });
    if (magicErr || !magicData?.properties?.action_link) {
      return NextResponse.json({ error: "link_generation_failed" }, { status: 500 });
    }
    link = magicData.properties.action_link;
  }
  const { subject, html } = await loadEmailTemplate(
    "setup-link",
    { name, firstName, link, signupUrl: redirectTo },
    { subject: DEFAULT_SETUP_SUBJECT, html: DEFAULT_SETUP_HTML }
  );

  const text = `Hi ${firstName},\n\nHere is your link to set up your Novus NYC member portal account:\n${link}\n\nThis link expires in 24 hours and can only be used once.\nIf you didn't request this, you can safely ignore it.\n\n— Novus NYC`;

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
