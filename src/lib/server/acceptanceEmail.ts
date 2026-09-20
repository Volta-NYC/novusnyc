import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { substituteEmailTokens, substituteEmailTokensHtml, safeLinkValue } from "@/lib/members/emailTokens";

export interface RenderedAcceptanceEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * The plain-text part is derived from the rendered HTML rather than kept as a
 * second template. An editor changing the copy in the portal would have no way
 * to know a parallel text version existed, so the two would drift apart and the
 * text part — the one spam filters read when the HTML is stripped — would end
 * up describing an older offer.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function renderAcceptanceEmail(
  templateKey: string,
  variables: Record<string, string>,
): Promise<RenderedAcceptanceEmail | null> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("email_templates")
    .select("subject, body, active")
    .eq("key", templateKey)
    .maybeSingle();

  if (!data?.subject || !data?.body || data.active === false) return null;

  // A link token lands inside an href, so anything that isn't http(s) is
  // dropped rather than escaped. Every other value is applicant-supplied and
  // gets escaped before it reaches a template that carries the org's branding.
  const safe = Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, /url$|link$/i.test(k) ? safeLinkValue(v) : v]),
  );

  const html = substituteEmailTokensHtml(String(data.body), safe);
  return {
    subject: substituteEmailTokens(String(data.subject), safe),
    html,
    text: htmlToText(html),
  };
}
