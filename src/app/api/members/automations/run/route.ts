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

function fmtTime(value: unknown): string {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? "Time listed in the portal" : parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
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
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const report: Record<string, { sent: number; considered: number }> = {};

  const [podsResult, membersResult, podMembersResult] = await Promise.all([
    sb.from("pods").select("id, name, slug, status"),
    sb.from("team").select("id, name, email, status, deleted_at"),
    sb.from("pod_members").select("pod_id, member_id, role, left_at"),
  ]);
  if (podsResult.error) throw new Error(`pods: ${podsResult.error.message}`);
  if (membersResult.error) throw new Error(`team: ${membersResult.error.message}`);
  if (podMembersResult.error) throw new Error(`pod_members: ${podMembersResult.error.message}`);
  const pods = podsResult.data;
  const members = membersResult.data;
  const podMembers = podMembersResult.data;

  const podById = new Map((pods ?? []).map((p) => [String(p.id), p]));
  const memberById = new Map(
    (members ?? [])
      .filter((m) => !m.deleted_at && String(m.status ?? "") !== "Inactive")
      .map((m) => [String(m.id), m]),
  );
  const roster = (podMembers ?? []).filter((m) => !m.left_at);

  const emailsFor = (podId: string, role?: string) =>
    roster
      .filter((m) => m.pod_id === podId && (!role || m.role === role))
      .map((m) => memberById.get(String(m.member_id)))
      .filter(Boolean)
      .map((m) => String((m as { email?: string }).email ?? ""))
      .filter(Boolean);

  // ── Meeting tomorrow ───────────────────────────────────────────────────────
  {
    // Everything from today through tomorrow that hasn't been sent yet. A
    // missed cron run used to lose that day's reminders permanently; now the
    // next run still catches them, and the ledger stops anyone being told twice.
    const ahead = new Date(today); ahead.setDate(ahead.getDate() + 1);
    const { data: meetings, error: meetingsError } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on, title, starts_at, meeting_url")
      .gte("meets_on", iso(today)).lte("meets_on", iso(ahead));
    if (meetingsError) throw new Error(`pod_meetings reminders: ${meetingsError.message}`);

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod || pod.status === "Archived") continue;
      const to = emailsFor(String(m.pod_id));
      if (to.length === 0) continue;
      const n = await sendClaimed("pod_meeting_reminder", `${String(m.id)}:${String(m.starts_at ?? m.meets_on)}`, to, {
        memberName: "there",
        podName: String(pod.name),
        meetingDate: fmtDate(String(m.meets_on)),
        meetingTime: fmtTime(m.starts_at),
        meetingTitle: String(m.title ?? "") || `${pod.name} meeting`,
        meetingLink: String(m.meeting_url || `${SITE_URL}/members/pods/${pod.slug}`),
        portalLink: `${SITE_URL}/members/pods/${pod.slug}`,
      });
      sent += n;
      if (n > 0) {
        const { error } = await sb.from("pod_meetings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
        if (error) throw new Error(`pod meeting reminder marker: ${error.message}`);
      }
    }
    report.meeting_reminder = { sent, considered: (meetings ?? []).length };
  }

  // ── Attendance still unfilled a day later ──────────────────────────────────
  {
    // A week back, so an unfilled sheet keeps surfacing rather than being
    // asked about exactly once, the day after, and then forgotten.
    const from = new Date(today); from.setDate(from.getDate() - 7);
    const until = new Date(today); until.setDate(until.getDate() - 1);
    const { data: meetings, error: meetingsError } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on")
      .gte("meets_on", iso(from)).lte("meets_on", iso(until))
      .is("attendance_finalized_at", null);
    if (meetingsError) throw new Error(`pod_meetings attendance: ${meetingsError.message}`);

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod) continue;
      const lits = emailsFor(String(m.pod_id), "lit");
      if (lits.length === 0) continue;
      const n = await sendClaimed("pod_attendance_missing", String(m.id), lits, {
        litName: "there",
        podName: String(pod.name),
        meetingDate: fmtDate(String(m.meets_on)),
        portalLink: `${SITE_URL}/members/pods/${pod.slug}`,
      });
      sent += n;
      if (n > 0) {
        const { error } = await sb.from("pod_meetings").update({ nudge_sent_at: new Date().toISOString() }).eq("id", m.id);
        if (error) throw new Error(`attendance nudge marker: ${error.message}`);
      }
    }
    report.attendance_missing = { sent, considered: (meetings ?? []).length };
  }

  // ── Task due in two days ───────────────────────────────────────────────────
  {
    // Anything due within the next two days that is still open.
    const ahead = new Date(today); ahead.setDate(ahead.getDate() + 2);
    const { data: tasks, error: tasksError } = await sb.from("assignments")
      .select("id, pod_id, title, due_date, assigned_member_ids, completed_at")
      .gte("due_date", iso(today)).lte("due_date", iso(ahead))
      .is("completed_at", null).is("deleted_at", null)
      .not("pod_id", "is", null);
    if (tasksError) throw new Error(`pod assignments: ${tasksError.message}`);

    let sent = 0;
    for (const t of tasks ?? []) {
      const pod = podById.get(String(t.pod_id));
      const ids = (t.assigned_member_ids ?? []) as string[];
      const to = ids.map((id) => memberById.get(id))
        .filter(Boolean).map((m) => String((m as { email?: string }).email ?? "")).filter(Boolean);
      if (to.length === 0) continue;
      const n = await sendClaimed("pod_task_due_soon", `${String(t.id)}:${String(t.due_date)}`, to, {
        memberName: "there",
        taskTitle: String(t.title ?? "Your task"),
        podName: pod ? String(pod.name) : "your pod",
        dueDate: fmtDate(String(t.due_date)),
        portalLink: `${SITE_URL}/members/work`,
      });
      sent += n;
      if (n > 0) {
        const { error } = await sb.from("assignments").update({ due_reminder_sent_at: new Date().toISOString() }).eq("id", t.id);
        if (error) throw new Error(`assignment reminder marker: ${error.message}`);
      }
    }
    report.task_due_soon = { sent, considered: (tasks ?? []).length };
  }

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
