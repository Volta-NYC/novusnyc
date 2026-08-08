// Sends an automated email by looking up the automation config to find the
// live template, substituting {{token}} variables, and posting to the team-
// email API. Returns { ok: false, error: 'automation_disabled' } or
// { ok: false, error: 'no_template' } instead of falling back to hardcoded
// copy — callers decide whether to fall back or skip.

import type { AutomationConfig, EmailTemplate } from "@/lib/members/storage";
import {
  AUTOMATIC_DEMERITS_ENABLED,
  isAutomaticDemeritAutomation,
} from "@/lib/members/automaticDemerits";
import { substituteEmailTokens } from "@/lib/members/cycleCompute";
import { EMAIL } from "@/lib/mail";

export interface DispatchEmailInput {
  automationId: string;
  automationConfigs: AutomationConfig[];
  templates: EmailTemplate[];
  toEmail: string;
  fromAddress?: string;
  variables: Record<string, string>;
  idToken: string;
}

export interface DispatchEmailResult {
  ok: boolean;
  status?: string;
  error?: string;
}

export async function dispatchTemplatedEmail(input: DispatchEmailInput): Promise<DispatchEmailResult> {
  if (!input.toEmail) return { ok: false, error: "missing_recipient" };
  if (!AUTOMATIC_DEMERITS_ENABLED && isAutomaticDemeritAutomation(input.automationId)) {
    return { ok: false, error: "automatic_demerits_disabled" };
  }

  const config = input.automationConfigs.find((c) => c.automationId === input.automationId);
  if (!config || !config.enabled) return { ok: false, error: "automation_disabled" };
  if (!config.templateKey) return { ok: false, error: "no_template" };

  const template = input.templates.find((t) => t.key === config.templateKey && t.active !== false);
  if (!template) return { ok: false, error: "no_template" };

  const subject = substituteEmailTokens(template.subject, input.variables);
  const body    = substituteEmailTokens(template.body,    input.variables);

  const fd = new FormData();
  fd.append("fromAddress", input.fromAddress ?? EMAIL.info);
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
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
