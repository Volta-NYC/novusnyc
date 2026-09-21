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
  const ipCheck = await consumeRateLimit({ bucket: "reset-password-ip", key: ip, limit: 5, windowSec: 3600 });
  if (!ipCheck.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const emailCheck = await consumeRateLimit({ bucket: "reset-password-email", key: email, limit: 3, windowSec: 3600 });
  if (!emailCheck.ok) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  // Checked before any lookup so a missing template fails the same way for every
  // address. Failing only after the member lookup would reveal which emails are
  // members, which the silent success below exists to hide.
  const ready = await renderEmail("password-reset", {}, { useTemplateSwitch: false });
  if (!ready.ok) return NextResponse.json({ error: "email_not_set_up" }, { status: 500 });

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

  const rendered = await renderEmail("password-reset", { name, firstName, link }, { useTemplateSwitch: false });
  if (!rendered.ok) return NextResponse.json({ error: "email_not_set_up" }, { status: 500 });

  const { transporter } = createTransportForFrom(getDefaultFromAddress());
  await transporter.sendMail({ to: email, ...rendered.email });

  return NextResponse.json({ success: true });
}
