import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCaller } from "@/lib/server/adminApi";
import { resolveInterviewZoomSettings } from "@/lib/interviews/config";
import {
  sendInterviewBookingEmail,
  sendInterviewRescheduledEmail,
  sendInterviewStaffNotificationEmail,
} from "@/lib/server/interviewEmail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUSES = new Set(["scheduled", "completed", "no_show", "cancelled"]);

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(string).filter(Boolean)));
}

function parseScheduledAt(value: unknown): string | null {
  const raw = string(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDuration(value: unknown): number | null {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 10 || duration > 240) return null;
  return Math.round(duration);
}

async function resolveDefaultMeetingLink(): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("interview_settings")
    .select("zoom_link, zoom_enabled")
    .eq("id", "singleton")
    .maybeSingle();
  const settings = data
    ? { zoomLink: data.zoom_link, zoomEnabled: data.zoom_enabled }
    : null;
  return resolveInterviewZoomSettings(settings, process.env.INTERVIEW_ZOOM_LINK ?? "").zoomLink;
}

async function sendConfirmation(input: {
  id: string;
  applicantName: string;
  applicantEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  organizerName: string;
  organizerEmail: string;
  previousScheduledAt?: string;
}): Promise<string | null> {
  try {
    if (input.previousScheduledAt) {
      await sendInterviewRescheduledEmail({
        to: input.applicantEmail,
        bookerName: input.applicantName,
        slotId: input.id,
        datetimeIso: input.scheduledAt,
        previousDatetimeIso: input.previousScheduledAt,
        durationMinutes: input.durationMinutes,
        zoomLink: input.meetingLink,
        location: input.meetingLink,
        organizerName: input.organizerName,
        organizerEmail: input.organizerEmail,
      });
    } else {
      await sendInterviewBookingEmail({
        to: input.applicantEmail,
        bookerName: input.applicantName,
        slotId: input.id,
        datetimeIso: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        zoomLink: input.meetingLink,
        location: input.meetingLink,
        organizerName: input.organizerName,
        organizerEmail: input.organizerEmail,
      });
    }
    return null;
  } catch (error) {
    console.error("interview confirmation failed", error);
    return "email_failed";
  }
}

async function sendInterviewerNotifications(input: {
  interviewId: string;
  interviewerMemberIds: string[];
  applicantName: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  organizerName: string;
  organizerEmail: string;
  previousScheduledAt?: string;
}): Promise<boolean> {
  if (input.interviewerMemberIds.length === 0) return true;
  const { data, error } = await getSupabaseAdmin()
    .from("team")
    .select("id, name, email, alternate_email")
    .in("id", input.interviewerMemberIds)
    .is("deleted_at", null);
  if (error) return false;

  const recipients = (data ?? []).flatMap((member) => {
    const email = string(member.email) || string(member.alternate_email);
    return email ? [{ name: string(member.name), email }] : [];
  });
  const results = await Promise.allSettled(recipients.map((recipient) =>
    sendInterviewStaffNotificationEmail({
      to: recipient.email,
      interviewerName: recipient.name,
      bookerName: input.applicantName,
      slotId: input.interviewId,
      datetimeIso: input.scheduledAt,
      previousDatetimeIso: input.previousScheduledAt,
      durationMinutes: input.durationMinutes,
      zoomLink: input.meetingLink,
      location: input.meetingLink,
      organizerName: input.organizerName,
      organizerEmail: input.organizerEmail,
    })
  ));
  return results.every((result) => result.status === "fulfilled");
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"], { allowIfCanInterview: true });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const applicantId = string(body.applicantId);
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  const durationMinutes = parseDuration(body.durationMinutes);
  if (!applicantId || !scheduledAt || !durationMinutes) {
    return NextResponse.json({ error: "invalid_interview" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: applicant, error: applicantError } = await sb
    .from("applications")
    .select("id, full_name, email, status")
    .eq("id", applicantId)
    .maybeSingle();
  if (applicantError || !applicant) {
    return NextResponse.json({ error: "applicant_not_found" }, { status: 404 });
  }

  const applicantName = string(applicant.full_name);
  const applicantEmail = string(applicant.email).toLowerCase();
  if (!applicantName || !applicantEmail) {
    return NextResponse.json({ error: "applicant_missing_contact" }, { status: 400 });
  }

  const id = randomUUID();
  const meetingLink = string(body.meetingLink) || await resolveDefaultMeetingLink();
  const interviewerMemberIds = stringArray(body.interviewerMemberIds);
  const row = {
    id,
    applicant_id: applicantId,
    applicant_name: applicantName,
    applicant_email: applicantEmail,
    scheduled_at: scheduledAt,
    duration_minutes: durationMinutes,
    meeting_link: meetingLink,
    interviewer_member_ids: interviewerMemberIds,
    status: "scheduled",
    notes: string(body.notes),
    created_by: verified.caller.uid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await sb.from("interviews").insert(row);
  if (insertError) {
    return NextResponse.json({ error: "create_failed", details: insertError.message }, { status: 500 });
  }

  const { error: statusError } = await sb
    .from("applications")
    .update({ status: "Interview Scheduled", updated_at: new Date().toISOString() })
    .eq("id", applicantId);
  if (statusError) {
    await sb.from("interviews").delete().eq("id", id);
    return NextResponse.json({ error: "application_update_failed" }, { status: 500 });
  }

  const warning = await sendConfirmation({
    id,
    applicantName,
    applicantEmail,
    scheduledAt,
    durationMinutes,
    meetingLink,
    organizerName: verified.caller.name || "Novus NYC",
    organizerEmail: verified.caller.email,
  });
  if (!warning) {
    await sb.from("interviews").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", id);
  }

  const staffEmailSucceeded = await sendInterviewerNotifications({
    interviewId: id,
    interviewerMemberIds,
    applicantName,
    scheduledAt,
    durationMinutes,
    meetingLink,
    organizerName: verified.caller.name || "Novus NYC",
    organizerEmail: verified.caller.email,
  });

  return NextResponse.json({
    success: true,
    id,
    warning: warning ?? (staffEmailSucceeded ? null : "staff_email_failed"),
  });
}

export async function PATCH(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"], { allowIfCanInterview: true });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = string(body.id);
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: existing, error: readError } = await sb.from("interviews").select("*").eq("id", id).maybeSingle();
  if (readError || !existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const scheduledAt = body.scheduledAt === undefined ? String(existing.scheduled_at) : parseScheduledAt(body.scheduledAt);
  const durationMinutes = body.durationMinutes === undefined ? Number(existing.duration_minutes) : parseDuration(body.durationMinutes);
  if (!scheduledAt || !durationMinutes) return NextResponse.json({ error: "invalid_interview" }, { status: 400 });
  patch.scheduled_at = scheduledAt;
  patch.duration_minutes = durationMinutes;
  if (body.meetingLink !== undefined) patch.meeting_link = string(body.meetingLink);
  if (body.interviewerMemberIds !== undefined) patch.interviewer_member_ids = stringArray(body.interviewerMemberIds);
  if (body.notes !== undefined) patch.notes = string(body.notes);
  if (body.status !== undefined) {
    const status = string(body.status);
    if (!STATUSES.has(status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    patch.status = status;
  }

  const { error: updateError } = await sb.from("interviews").update(patch).eq("id", id);
  if (updateError) return NextResponse.json({ error: "update_failed", details: updateError.message }, { status: 500 });

  const nextStatus = String(patch.status ?? existing.status);
  if (existing.applicant_id) {
    const applicationStatus = nextStatus === "completed"
      ? "Interview Completed"
      : nextStatus === "scheduled"
        ? "Interview Scheduled"
        : "New";
    const { error: applicationError } = await sb
      .from("applications")
      .update({ status: applicationStatus, updated_at: new Date().toISOString() })
      .eq("id", existing.applicant_id);
    if (applicationError) {
      await sb.from("interviews").update({
        scheduled_at: existing.scheduled_at,
        duration_minutes: existing.duration_minutes,
        meeting_link: existing.meeting_link,
        interviewer_member_ids: existing.interviewer_member_ids,
        status: existing.status,
        notes: existing.notes,
        updated_at: existing.updated_at,
      }).eq("id", id);
      return NextResponse.json({ error: "application_update_failed" }, { status: 500 });
    }
  }

  const reschedule = String(existing.scheduled_at) !== scheduledAt;
  const resend = body.resendConfirmation === true;
  const previousInterviewerIds = Array.isArray(existing.interviewer_member_ids)
    ? stringArray(existing.interviewer_member_ids)
    : [];
  const nextInterviewerIds = Array.isArray(patch.interviewer_member_ids)
    ? stringArray(patch.interviewer_member_ids)
    : previousInterviewerIds;
  const interviewerChanged = previousInterviewerIds.length !== nextInterviewerIds.length
    || previousInterviewerIds.some((memberId) => !nextInterviewerIds.includes(memberId));
  let warning: string | null = null;
  if ((reschedule || resend) && nextStatus === "scheduled") {
    warning = await sendConfirmation({
      id,
      applicantName: String(existing.applicant_name),
      applicantEmail: String(existing.applicant_email),
      scheduledAt,
      previousScheduledAt: reschedule ? String(existing.scheduled_at) : undefined,
      durationMinutes,
      meetingLink: String(patch.meeting_link ?? existing.meeting_link ?? ""),
      organizerName: verified.caller.name || "Novus NYC",
      organizerEmail: verified.caller.email,
    });
    if (!warning) {
      await sb.from("interviews").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", id);
    }
  }
  if ((reschedule || resend || interviewerChanged) && nextStatus === "scheduled") {
    const staffEmailSucceeded = await sendInterviewerNotifications({
      interviewId: id,
      interviewerMemberIds: nextInterviewerIds,
      applicantName: String(existing.applicant_name),
      scheduledAt,
      previousScheduledAt: reschedule ? String(existing.scheduled_at) : undefined,
      durationMinutes,
      meetingLink: String(patch.meeting_link ?? existing.meeting_link ?? ""),
      organizerName: verified.caller.name || "Novus NYC",
      organizerEmail: verified.caller.email,
    });
    if (!staffEmailSucceeded && !warning) warning = "staff_email_failed";
  }

  return NextResponse.json({ success: true, warning });
}
