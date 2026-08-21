import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { substituteEmailTokens } from "@/lib/members/emailTokens";

export interface RenderedEmail {
  subject: string;
  html: string;
}

// Looks up the automation config for `automationId`, resolves the linked
// email template, substitutes {{token}} variables, and returns the rendered
// subject + HTML body. Returns null if the automation is disabled, has no
// template assigned, or the template row is inactive / missing.
export async function renderAutomationEmail(
  automationId: string,
  variables: Record<string, string>,
): Promise<RenderedEmail | null> {
  const supabase = getSupabaseAdmin();

  const { data: config } = await supabase
    .from("automation_configs")
    .select("enabled, template_key")
    .eq("automation_id", automationId)
    .single();

  if (!config || !config.enabled || !config.template_key) return null;

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body, active")
    .eq("key", config.template_key)
    .single();

  if (!template || template.active === false) return null;

  return {
    subject: substituteEmailTokens(String(template.subject ?? ""), variables),
    html:    substituteEmailTokens(String(template.body    ?? ""), variables),
  };
}
