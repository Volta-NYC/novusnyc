import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendAutomationEmail } from "@/lib/server/notify";

export const runtime = "nodejs";

// Event-driven automations: the portal calls this after an action that should
// notify someone.
//
// The caller names the record the notification is about — never the recipients
// and never the message content. Both are looked up here. Accepting a `to` list
// turned any signed-in member into a relay that could send branded mail from a
// verified novusnyc.org sender to any address on the internet, with template
// variables of their choosing interpolated into the body.

type Subject = {
  businessId?: string;
  memberIds?: string[];
  assignmentId?: string;
  strikeId?: string;
};

type Resolved = { to: string[]; variables: Record<string, string> } | null;

const MAX_RECIPIENTS = 50;

function firstName(name: unknown): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

async function emailsFor(ids: string[]): Promise<{ email: string; name: string }[]> {
  if (ids.length === 0) return [];
  const sb = getSupabaseAdmin();
  const { data } = await sb.from("team").select("name, email, status")
    .in("id", ids.slice(0, MAX_RECIPIENTS)).is("deleted_at", null);
  return ((data ?? []) as Record<string, unknown>[])
    .filter((r) => String(r.status ?? "Active").toLowerCase() !== "inactive")
    .map((r) => ({ email: String(r.email ?? ""), name: String(r.name ?? "") }))
    .filter((r) => !!r.email);
}

async function resolve(automationId: string, subject: Subject): Promise<Resolved> {
  const sb = getSupabaseAdmin();

  if (automationId === "project_assigned") {
    if (!subject.businessId || !Array.isArray(subject.memberIds)) return null;
    const { data: biz } = await sb.from("businesses")
      .select("name, neighborhood, owner_name, owner_email, phone")
      .eq("id", subject.businessId).is("deleted_at", null).maybeSingle();
    if (!biz) return null;
    const people = await emailsFor(subject.memberIds.map(String));
    if (people.length === 0) return null;
    const contact = [biz.owner_name, biz.owner_email, biz.phone]
      .map((v) => String(v ?? "").trim()).filter(Boolean).join(" · ");
    return {
      to: people.map((p) => p.email),
      variables: {
        memberName: people.length === 1 ? firstName(people[0].name) : "there",
        businessName: String(biz.name ?? ""),
        neighborhoodPart: biz.neighborhood ? ` in ${String(biz.neighborhood)}` : "",
        contactPart: contact || "No contact details on file yet.",
      },
    };
  }

  if (automationId === "project_draft_ready") {
    if (!subject.businessId) return null;
    const { data: biz } = await sb.from("businesses")
      .select("name, preview_url, live_url, assignees")
      .eq("id", subject.businessId).is("deleted_at", null).maybeSingle();
    if (!biz) return null;
    const { data: leadRows } = await sb.from("team").select("email, status")
      .in("role", ["Board", "Developer"]).is("deleted_at", null);
    const to = ((leadRows ?? []) as Record<string, unknown>[])
      .filter((r) => String(r.status ?? "Active").toLowerCase() !== "inactive")
      .map((r) => String(r.email ?? "")).filter(Boolean);
    if (to.length === 0) return null;
    const assignees = await emailsFor(((biz.assignees ?? []) as string[]).map(String));
    return {
      to,
      variables: {
        leadName: "there",
        businessName: String(biz.name ?? ""),
        assigneeNames: assignees.map((a) => a.name).join(", ") || "the team",
        previewUrl: String(biz.preview_url ?? biz.live_url ?? ""),
      },
    };
  }

  if (automationId === "pod_task_assigned") {
    if (!subject.assignmentId) return null;
    const { data: task } = await sb.from("assignments")
      .select("title, due_date, pod_id, assigned_member_ids")
      .eq("id", subject.assignmentId).is("deleted_at", null).maybeSingle();
    if (!task) return null;
    const people = await emailsFor(((task.assigned_member_ids ?? []) as string[]).map(String));
    if (people.length === 0) return null;
    const { data: pod } = await sb.from("pods").select("name")
      .eq("id", String(task.pod_id ?? "")).maybeSingle();
    return {
      to: people.map((p) => p.email),
      variables: {
        memberName: people.length === 1 ? firstName(people[0].name) : "there",
        taskTitle: String(task.title ?? "Your task"),
        podName: String(pod?.name ?? "your pod"),
        dueDatePart: task.due_date ? `Due ${String(task.due_date)}` : "No deadline set",
      },
    };
  }

  if (automationId === "infraction_issued") {
    if (!subject.strikeId) return null;
    const { data: strike } = await sb.from("member_strikes")
      .select("member_id, infraction_name, points, note")
      .eq("id", subject.strikeId).maybeSingle();
    if (!strike) return null;
    const people = await emailsFor([String(strike.member_id ?? "")]);
    if (people.length === 0) return null;
    const { data: totals } = await sb.from("member_contributions")
      .select("infraction_points").eq("member_id", String(strike.member_id)).maybeSingle();
    const { data: settings } = await sb.from("site_settings")
      .select("infraction_thresholds").maybeSingle();
    const t = (settings?.infraction_thresholds ?? {}) as Record<string, number>;
    const points = Number(totals?.infraction_points ?? strike.points ?? 0);
    const standing = points >= Number(t.review ?? 6) ? "your standing needs review"
      : points >= Number(t.warning ?? 4) ? "this is a formal warning"
      : points >= Number(t.notice ?? 2) ? "consider this a notice"
      : "no further action for now";
    return {
      to: people.map((p) => p.email),
      variables: {
        memberName: firstName(people[0].name),
        infractionName: String(strike.infraction_name ?? ""),
        points: String(strike.points ?? ""),
        notePart: strike.note ? String(strike.note) : "No further detail was recorded.",
        totalPoints: String(points),
        standing,
      },
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin", "member"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as {
    automationId?: string;
    subject?: Subject;
  };

  const automationId = String(body.automationId ?? "");
  const resolved = await resolve(automationId, body.subject ?? {});
  if (!resolved) {
    return NextResponse.json({ error: "unknown_automation_or_subject" }, { status: 400 });
  }

  return NextResponse.json(await sendAutomationEmail(automationId, resolved.to, resolved.variables));
}
