import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { sendAutomationEmail } from "@/lib/server/notify";

export const runtime = "nodejs";

// Event-driven automations: the portal calls this after an action that should
// notify someone. Only these ids are accepted, so a compromised client cannot
// use the portal's mail credentials to send arbitrary automations.
const ALLOWED = new Set([
  "pod_task_assigned",
  "project_assigned",
  "project_draft_ready",
  "infraction_issued",
  "assignment_update",
]);

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin", "member"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as {
    automationId?: string;
    to?: string[] | string;
    variables?: Record<string, string>;
  };

  const automationId = String(body.automationId ?? "");
  if (!ALLOWED.has(automationId)) {
    return NextResponse.json({ error: "unknown_automation" }, { status: 400 });
  }

  const recipients = Array.isArray(body.to) ? body.to : [String(body.to ?? "")];
  const variables = Object.fromEntries(
    Object.entries(body.variables ?? {}).map(([k, v]) => [k, String(v ?? "")]),
  );

  const result = await sendAutomationEmail(automationId, recipients, variables);
  return NextResponse.json(result);
}
