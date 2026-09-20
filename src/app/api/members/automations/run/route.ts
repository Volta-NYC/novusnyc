import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { deliverAutomationOnce } from "@/lib/server/automationDelivery";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

// The time-based automations, run as one sweep. Call it from a cron or by hand
// from the admin panel — the same pattern as the interview reminder route.
//
// Every send is recorded on the row that caused it, so running the sweep twice
// in a day sends nothing twice. That matters more here than elsewhere: these
// fire without anyone watching.

function fmtDate(d: string): string {
  const parsed = new Date(`${d}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? d
    : parsed.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function firstName(value: unknown): string {
  return String(value ?? "").trim().split(/\s+/)[0] || "there";
}

async function sendClaimed(
  automationId: string,
  subjectKey: string,
  recipients: string[],
  variables: Record<string, string>,
): Promise<number> {
  return (await deliverAutomationOnce(automationId, subjectKey, recipients, variables)).sent;
}

async function runSweep(viaCron: boolean) {
  const sb = getSupabaseAdmin();
  const today = new Date();
  const report: Record<string, { sent: number; considered: number }> = {};

  const membersResult = await sb.from("team").select("id, name, email, status, deleted_at");
  if (membersResult.error) throw new Error(`team: ${membersResult.error.message}`);
  const members = membersResult.data;
  const memberById = new Map(
    (members ?? [])
      .filter((m) => !m.deleted_at && String(m.status ?? "") !== "Inactive")
      .map((m) => [String(m.id), m]),
  );

  // ── Semiannual certified-hours summary ────────────────────────────────────
  {
    const month = today.getUTCMonth();
    const isSummaryMonth = month === 0 || month === 6;
    let sent = 0;
    let considered = 0;
    if (isSummaryMonth) {
      const year = today.getUTCFullYear();
      const from = month === 0 ? `${year - 1}-07-01` : `${year}-01-01`;
      const through = month === 0 ? `${year - 1}-12-31` : `${year}-06-30`;
      const period = `${fmtDate(from)} through ${fmtDate(through)}`;
      const { data: entries, error: entriesError } = await sb.from("certified_hour_entries")
        .select("member_id, department, hours")
        .gte("occurred_on", from).lte("occurred_on", through);
      if (entriesError) throw new Error(`certified hours: ${entriesError.message}`);
      const totals = new Map<string, { hours: number; departments: Map<string, number> }>();
      for (const entry of entries ?? []) {
        const memberId = String(entry.member_id);
        const current = totals.get(memberId) ?? { hours: 0, departments: new Map<string, number>() };
        const hours = Number(entry.hours || 0);
        const department = String(entry.department || "General service");
        current.hours += hours;
        current.departments.set(department, (current.departments.get(department) ?? 0) + hours);
        totals.set(memberId, current);
      }
      for (const [memberId, summary] of totals) {
        const member = memberById.get(memberId);
        const email = String(member?.email ?? "");
        if (!member || !email || summary.hours <= 0) continue;
        considered += 1;
        const workSummary = [...summary.departments.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([department, hours]) => `${department}: ${hours.toFixed(2)}h`)
          .join("; ");
        sent += await sendClaimed("service_hours_summary", `${memberId}:${from}:${through}`, [email], {
          memberName: firstName(member.name),
          period,
          totalHours: summary.hours.toFixed(2),
          workSummary,
          portalLink: `${SITE_URL}/members/me`,
        });
      }
    }
    report.service_hours_summary = { sent, considered };
  }

  return {
    ok: true,
    ranAt: new Date().toISOString(),
    viaCron,
    daysIntoYear: daysBetween(new Date(today.getFullYear(), 0, 1), today),
    report,
  };
}

function isCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return !!secret && bearer === secret;
}

// Vercel cron issues GET, so that is the scheduled entry point.
export async function GET(req: NextRequest) {
  if (!isCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runSweep(true));
  } catch (error) {
    console.error("Automation sweep failed", error);
    return NextResponse.json({ error: "automation_sweep_failed" }, { status: 500 });
  }
}

// POST is the manual run from the admin panel.
export async function POST(req: NextRequest) {
  if (!isCron(req)) {
    const verified = await verifyCaller(req, ["owner", "admin"]);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  try {
    return NextResponse.json(await runSweep(isCron(req)));
  } catch (error) {
    console.error("Automation sweep failed", error);
    return NextResponse.json({ error: "automation_sweep_failed" }, { status: 500 });
  }
}
