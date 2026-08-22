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
    const target = new Date(today); target.setDate(target.getDate() + 1);
    const { data: meetings } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on, title, reminder_sent_at")
      .eq("meets_on", iso(target)).is("reminder_sent_at", null);

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod || pod.status === "Archived") continue;
      const to = emailsFor(String(m.pod_id));
      if (to.length === 0) continue;
      const r = await sendAutomationEmail("pod_meeting_reminder", to, {
        memberName: "there",
        podName: String(pod.name),
        meetingDate: fmtDate(String(m.meets_on)),
        meetingTitle: String(m.title ?? "") || `${pod.name} meeting`,
        portalLink: `${SITE_URL}/members/pods/${pod.slug}`,
      });
      sent += r.sent;
      if (r.sent > 0) {
        await sb.from("pod_meetings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
      }
    }
    report.meeting_reminder = { sent, considered: (meetings ?? []).length };
  }

  // ── Attendance still unfilled a day later ──────────────────────────────────
  {
    const target = new Date(today); target.setDate(target.getDate() - 1);
    const { data: meetings } = await sb.from("pod_meetings")
      .select("id, pod_id, meets_on, nudge_sent_at")
      .eq("meets_on", iso(target)).is("nudge_sent_at", null);

    let sent = 0;
    for (const m of meetings ?? []) {
      const pod = podById.get(String(m.pod_id));
      if (!pod) continue;
      const { count } = await sb.from("pod_attendance")
        .select("id", { count: "exact", head: true }).eq("meeting_id", m.id);
      if ((count ?? 0) > 0) continue;                 // already filled in

      const lits = emailsFor(String(m.pod_id), "lit");
      if (lits.length === 0) continue;
      const r = await sendAutomationEmail("pod_attendance_missing", lits, {
        litName: "there",
        podName: String(pod.name),
        meetingDate: fmtDate(String(m.meets_on)),
        portalLink: `${SITE_URL}/members/pods/${pod.slug}`,
      });
      sent += r.sent;
      if (r.sent > 0) {
        await sb.from("pod_meetings").update({ nudge_sent_at: new Date().toISOString() }).eq("id", m.id);
      }
    }
    report.attendance_missing = { sent, considered: (meetings ?? []).length };
  }

  // ── Task due in two days ───────────────────────────────────────────────────
  {
    const target = new Date(today); target.setDate(target.getDate() + 2);
    const { data: tasks } = await sb.from("assignments")
      .select("id, pod_id, title, due_date, assigned_member_ids, completed_at, due_reminder_sent_at")
      .eq("due_date", iso(target)).is("completed_at", null).is("due_reminder_sent_at", null)
      .not("pod_id", "is", null);

    let sent = 0;
    for (const t of tasks ?? []) {
      const pod = podById.get(String(t.pod_id));
      const ids = (t.assigned_member_ids ?? []) as string[];
      const to = ids.map((id) => memberById.get(id))
        .filter(Boolean).map((m) => String((m as { email?: string }).email ?? "")).filter(Boolean);
      if (to.length === 0) continue;
      const r = await sendAutomationEmail("pod_task_due_soon", to, {
        memberName: "there",
        taskTitle: String(t.title ?? "Your task"),
        podName: pod ? String(pod.name) : "your pod",
        dueDate: fmtDate(String(t.due_date)),
        portalLink: `${SITE_URL}/members/work`,
      });
      sent += r.sent;
      if (r.sent > 0) {
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
