import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { substituteEmailTokens, substituteEmailTokensHtml, safeLinkValue } from "@/lib/members/emailTokens";
import { htmlToText } from "@/lib/server/smtp";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export type RenderOutcome =
  | { ok: true; email: RenderedEmail }
  | { ok: false; reason: "missing" | "off" };

// Every email the portal sends is rendered from its row in email_templates, the
// same row the Emails page shows and edits. There is deliberately no wording in
// code to fall back on: a fallback is copy nobody can see from the portal, and
// it goes out exactly when the template has been deleted. So a missing template
// means the email is not sent, and the caller reports that instead. The text
// part is derived from the same HTML, so a portal edit reaches both parts.

/**
 * `useTemplateSwitch: false` is for emails whose on/off lives on an automation
 * row instead, and for the ones with no off at all: password resets, invites
 * and setup links, where "off" would quietly lock people out.
 */
export async function renderEmail(
  key: string,
  variables: Record<string, string>,
  { useTemplateSwitch = true }: { useTemplateSwitch?: boolean } = {},
): Promise<RenderOutcome> {
  const { data } = await getSupabaseAdmin()
    .from("email_templates")
    .select("subject, body, active")
    .eq("key", key)
    .maybeSingle();

  const subject = String(data?.subject ?? "");
  const body = String(data?.body ?? "");
  if (!subject.trim() || !body.trim()) return { ok: false, reason: "missing" };
  if (useTemplateSwitch && data?.active === false) return { ok: false, reason: "off" };

  // A link token lands inside an href, so anything that isn't http(s) is
  // dropped rather than escaped. Every other value may be user-supplied and is
  // escaped before it reaches markup that carries the org's name.
  const safe = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, /url$|link$/i.test(k) ? safeLinkValue(v) : v]),
  );
  const html = substituteEmailTokensHtml(body, safe);
  return {
    ok: true,
    email: { subject: substituteEmailTokens(subject, safe), html, text: htmlToText(html) },
  };
}

export async function renderAutomationEmail(
  automationId: string,
  variables: Record<string, string>,
): Promise<RenderOutcome> {
  const { data: config } = await getSupabaseAdmin()
    .from("automation_configs")
    .select("enabled, template_key")
    .eq("automation_id", automationId)
    .maybeSingle();

  if (!config?.template_key) return { ok: false, reason: "missing" };
  if (!config.enabled) return { ok: false, reason: "off" };
  return renderEmail(String(config.template_key), variables, { useTemplateSwitch: false });
}
