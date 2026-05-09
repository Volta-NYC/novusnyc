// Helper for sending an automated email by template key. Resolves the live
// template (or its built-in default), substitutes {{token}} variables, and
// posts to the existing team-email API. Used by the cycle automation sweep
// and by ad-hoc admin actions (e.g. issuing a strike that should notify).

import type { EmailTemplate, EmailTemplateKey } from "@/lib/members/storage";
import { substituteEmailTokens } from "@/lib/members/cycleCompute";

export interface DispatchEmailInput {
  templates: EmailTemplate[];                  // live records (subscription)
  templateKey: EmailTemplateKey;
  fallback: { subject: string; body: string };  // built-in copy if no override saved
  toEmail: string;                             // single recipient
  fromAddress?: string;                         // defaults to info@voltanyc.org
  variables: Record<string, string>;
  idToken: string;                             // Firebase ID token of caller
}

export interface DispatchEmailResult {
  ok: boolean;
  status?: string;
  error?: string;
}

export async function dispatchTemplatedEmail(input: DispatchEmailInput): Promise<DispatchEmailResult> {
  if (!input.toEmail) return { ok: false, error: "missing_recipient" };

  const live = input.templates.find((t) => t.key === input.templateKey && t.active !== false);
  const subject = substituteEmailTokens(live?.subject ?? input.fallback.subject, input.variables);
  const body = substituteEmailTokens(live?.body ?? input.fallback.body, input.variables);

  const fd = new FormData();
  fd.append("fromAddress", input.fromAddress ?? "info@voltanyc.org");
  fd.append("subject", subject);
  fd.append("message", body);
  fd.append("contentMode", "html");
  fd.append("toRecipients", input.toEmail);

  try {
    const res = await fetch("/api/members/team-email", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.idToken}` },
      body: fd,
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
