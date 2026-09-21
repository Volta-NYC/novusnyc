import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { createTransportForFrom, getDefaultFromAddress } from "@/lib/server/smtp";
import { renderEmail } from "@/lib/server/templateRenderer";

export const runtime = "nodejs";

function siteOrigin(req: NextRequest): string {
  const host = req.headers.get("host") ?? "www.novusnyc.org";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

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

  // Checked before the member lookup so a missing template fails identically
  // for every address and cannot reveal who is a member.
  const ready = await renderEmail("setup-link", {}, { useTemplateSwitch: false });
  if (!ready.ok) return NextResponse.json({ error: "email_not_set_up" }, { status: 500 });

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
  const rendered = await renderEmail("setup-link", { name, firstName, link, signupUrl: redirectTo }, { useTemplateSwitch: false });
  if (!rendered.ok) return NextResponse.json({ error: "email_not_set_up" }, { status: 500 });

  const { transporter } = createTransportForFrom(getDefaultFromAddress());
  await transporter.sendMail({ to: email, ...rendered.email });

  return NextResponse.json({ success: true });
}
