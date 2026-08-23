import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAutomationEmail } from "@/lib/server/notify";

export interface DeliveryResult {
  considered: number;
  sent: number;
}

async function claimRecipient(
  automationId: string,
  subjectKey: string,
  recipient: string,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("claim_automation_delivery", {
    p_id: `${automationId}:${subjectKey}:${recipient}`,
    p_automation_id: automationId,
    p_subject_key: subjectKey,
    p_recipient: recipient,
  });
  return !error && data === true;
}

async function finishClaim(
  automationId: string,
  subjectKey: string,
  recipient: string,
  status: "sent" | "failed",
  errorMessage?: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("automation_deliveries").update({
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    last_error: status === "failed" ? (errorMessage ?? "send_failed").slice(0, 500) : null,
  })
    .eq("automation_id", automationId)
    .eq("subject_key", subjectKey)
    .eq("recipient", recipient);
  if (error) throw new Error(error.message);
}

/**
 * Deliver an automation once per subject and recipient.
 *
 * Claims are leased in Postgres before mail is sent. Successful recipients are
 * permanently deduplicated; failed or abandoned claims can be retried after the
 * database lease expires.
 */
export async function deliverAutomationOnce(
  automationId: string,
  subjectKey: string,
  recipients: string[],
  variables: Record<string, string>,
): Promise<DeliveryResult> {
  const unique = [...new Set(recipients.map((value) => value.trim()).filter(Boolean))];
  let sent = 0;

  for (const address of unique) {
    if (!(await claimRecipient(automationId, subjectKey, address))) continue;

    const result = await sendAutomationEmail(automationId, [address], variables);
    if (result.sent > 0) {
      sent += 1;
      await finishClaim(automationId, subjectKey, address, "sent");
    } else {
      await finishClaim(
        automationId,
        subjectKey,
        address,
        "failed",
        result.reason ?? "send_failed",
      );
    }
  }

  return { considered: unique.length, sent };
}
