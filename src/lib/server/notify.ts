import "server-only";

import { renderAutomationEmail } from "@/lib/server/templateRenderer";
import { createTransportForFrom, getDefaultFromAddress } from "@/lib/server/smtp";
import { SITE_URL } from "@/lib/site";

export interface NotifyResult {
  sent: number;
  skipped: number;
  reason?: string;
}

/**
 * Send one automation to one or more recipients.
 *
 * A disabled automation, a missing template or an empty recipient list is a
 * skip, not an error: an automation nobody has switched on should quietly do
 * nothing rather than fail the action that triggered it. Whatever the member
 * was doing — assigning a task, issuing an infraction — must still succeed.
 */
export async function sendAutomationEmail(
  automationId: string,
  recipients: string[],
  variables: Record<string, string>,
): Promise<NotifyResult> {
  const to = [...new Set(recipients.map((r) => (r ?? "").trim()).filter(Boolean))];
  if (to.length === 0) return { sent: 0, skipped: 0, reason: "no_recipients" };

  // portalLink last: it is the one link in the message and must stay ours.
  const rendered = await renderAutomationEmail(automationId, {
    ...variables,
    portalLink: `${SITE_URL}/members`,
  });
  if (!rendered.ok) {
    return { sent: 0, skipped: to.length, reason: rendered.reason === "off" ? "automation_disabled" : "template_missing" };
  }
  const { email } = rendered;

  const from = getDefaultFromAddress();
  const { transporter } = createTransportForFrom(from);

  let sent = 0;
  let skipped = 0;
  for (const address of to) {
    try {
      await transporter.sendMail({
        to: address,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      sent += 1;
    } catch {
      // One bad address must not stop the rest of the batch.
      skipped += 1;
    }
  }
  return { sent, skipped };
}
