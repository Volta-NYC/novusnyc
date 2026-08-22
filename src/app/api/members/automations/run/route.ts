import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAutomationEmail } from "@/lib/server/notify";
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

// Claim recipients before sending. The unique key on
// (automation_id, subject_key, recipient) means a second sweep — or a second
// cron firing — inserts nothing and therefore sends nothing.
async function claimRecipients(
  automationId: string, subjectKey: string, recipients: string[],
): Promise<string[]> {
  if (recipients.length === 0) return [];
  const sb = getSupabaseAdmin();
  const rows = [...new Set(recipients)].map((recipient) => ({
    id: `${automationId}:${subjectKey}:${recipient}`,
    automation_id: automationId,
    subject_key: subjectKey,
    recipient,
  }));
  const { data, error } = await sb.from("automation_deliveries")
    .upsert(rows, { onConflict: "automation_id,subject_key,recipient", ignoreDuplicates: true })
    .select("recipient");
  if (error) return [];
  return ((data ?? []) as { recipient: string }[]).map((r) => r.recipient);
}

// A claim that never turned into a delivery must not suppress the next attempt.
async function releaseClaims(
  automationId: string, subjectKey: string, recipients: string[],
): Promise<void> {
  if (recipients.length === 0) return;
  const sb = getSupabaseAdmin();
  await sb.from("automation_deliveries").delete()
    .eq("automation_id", automationId).eq("subject_key", subjectKey)
    .in("recipient", recipients);
}

// One recipient at a time, so a bad address costs only its own claim.
async function sendClaimed(
  automationId: string,
  subjectKey: string,
  recipients: string[],
  variables: Record<string, string>,
): Promise<number> {
  const claimed = await claimRecipients(automationId, subjectKey, recipients);
  let sent = 0;
  for (const address of claimed) {
    const r = await sendAutomationEmail(automationId, [address], variables);
    if (r.sent > 0) sent += 1;
    else await releaseClaims(automationId, subjectKey, [address]);
  }
  return sent;
}

async function runSweep(viaCron: boolean) {
  const sb = getSupabaseAdmin();
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const report: Record<string, { sent: number; considered: number }> = {};

  const [{ data: pods }, { data: members }, { data: podMembers }] = await Promise.all([
    sb.from("pods").select("id, name, slug, status"),
    sb.from("team").select("id, name, email, status, deleted_at"),
    sb.from("pod_members").select("pod_id, member_id, role, left_at"),
  ]);

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
    const { data: meetings } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on, title")
      .gte("meets_on", iso(today)).lte("meets_on", iso(ahead));

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod || pod.status === "Archived") continue;
      const to = emailsFor(String(m.pod_id));
      if (to.length === 0) continue;
      const n = await sendClaimed("pod_meeting_reminder", String(m.id), to, {
        memberName: "there",
        podName: String(pod.name),
        meetingDate: fmtDate(String(m.meets_on)),
        meetingTitle: String(m.title ?? "") || `${pod.name} meeting`,
        portalLink: `${SITE_URL}/members/pods/${pod.slug}`,
      });
      sent += n;
      if (n > 0) {
        await sb.from("pod_meetings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
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
    const { data: meetings } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on")
      .gte("meets_on", iso(from)).lte("meets_on", iso(until));

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod) continue;
      const { count } = await sb.from("pod_attendance")
        .select("id", { count: "exact", head: true }).eq("meeting_id", m.id);
      if ((count ?? 0) > 0) continue;                 // already filled in

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
        await sb.from("pod_meetings").update({ nudge_sent_at: new Date().toISOString() }).eq("id", m.id);
      }
    }
    report.attendance_missing = { sent, considered: (meetings ?? []).length };
  }

  // ── Task due in two days ───────────────────────────────────────────────────
  {
    // Anything due within the next two days that is still open.
    const ahead = new Date(today); ahead.setDate(ahead.getDate() + 2);
    const { data: tasks } = await sb.from("assignments")
      .select("id, pod_id, title, due_date, assigned_member_ids, completed_at")
      .gte("due_date", iso(today)).lte("due_date", iso(ahead))
      .is("completed_at", null).is("deleted_at", null)
      .not("pod_id", "is", null);

    let sent = 0;
    for (const t of tasks ?? []) {
      const pod = podById.get(String(t.pod_id));
      const ids = (t.assigned_member_ids ?? []) as string[];
      const to = ids.map((id) => memberById.get(id))
        .filter(Boolean).map((m) => String((m as { email?: string }).email ?? "")).filter(Boolean);
      if (to.length === 0) continue;
      const n = await sendClaimed("pod_task_due_soon", String(t.id), to, {
        memberName: "there",
        taskTitle: String(t.title ?? "Your task"),
        podName: pod ? String(pod.name) : "your pod",
        dueDate: fmtDate(String(t.due_date)),
        portalLink: `${SITE_URL}/members/work`,
      });
      sent += n;
      if (n > 0) {
        await sb.from("assignments").update({ due_reminder_sent_at: new Date().toISOString() }).eq("id", t.id);
      }
    }
    report.task_due_soon = { sent, considered: (tasks ?? []).length };
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
  return NextResponse.json(await runSweep(true));
}

// POST is the manual run from the admin panel.
export async function POST(req: NextRequest) {
  if (!isCron(req)) {
    const verified = await verifyCaller(req, ["owner", "admin"]);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  return NextResponse.json(await runSweep(isCron(req)));
}
