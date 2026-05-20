import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface EmailTemplate {
  subject: string;
  html: string;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replaceAll(`{{${k}}}`, v),
    template
  );
}

export async function loadEmailTemplate(
  key: string,
  vars: Record<string, string>,
  fallback: { subject: string; html: string }
): Promise<EmailTemplate> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("email_templates")
      .select("subject, body")
      .eq("key", key)
      .single();

    if (data?.subject && data?.body) {
      return {
        subject: renderTemplate(data.subject, vars),
        html: renderTemplate(data.body, vars),
      };
    }
  } catch { /* fall through to default */ }

  return {
    subject: renderTemplate(fallback.subject, vars),
    html: renderTemplate(fallback.html, vars),
  };
}
