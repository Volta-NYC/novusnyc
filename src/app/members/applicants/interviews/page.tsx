"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { APPLICANTS_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  Btn,
  Empty,
  Field,
  Input,
  LoadError,
  Modal,
  PageHeader,
  SearchBar,
  Select,
  Spinner,
  StatCard,
  TextArea,
} from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import { getAuthToken } from "@/lib/members/supabaseAuth";
import {
  subscribeInterviews,
  subscribeTeam,
  type ApplicationRecord,
  type InterviewRecord,
  type InterviewRecordStatus,
  type TeamMember,
} from "@/lib/members/storage";

type View = "upcoming" | "history";
type FormState = {
  applicantId: string;
  date: string;
  time: string;
  durationMinutes: string;
  meetingLink: string;
  interviewerMemberIds: string[];
  notes: string;
  status: InterviewRecordStatus;
};

const EMPTY_FORM: FormState = {
  applicantId: "",
  date: "",
  time: "",
  durationMinutes: "30",
  meetingLink: "",
  interviewerMemberIds: [],
  notes: "",
  status: "scheduled",
};

function localDateTimeParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function defaultDateTime(): { date: string; time: string } {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return localDateTimeParts(date.toISOString());
}

function toIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function statusMeta(status: InterviewRecordStatus) {
  if (status === "completed") return { label: "Completed", className: "border-blue-500/25 bg-blue-500/10 text-blue-700" };
  if (status === "no_show") return { label: "No-show", className: "border-red-500/25 bg-red-500/10 text-red-700" };
  if (status === "cancelled") return { label: "Cancelled", className: "border-gray-500/25 bg-gray-500/10 text-gray-700" };
  return { label: "Scheduled", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" };
}

function isTerminalApplicant(status: string): boolean {
  const key = status.trim().toLowerCase();
  return key === "accepted" || key === "not accepted";
}

export default function InterviewsPage() {
  const { authRole, canInterview, loading } = useAuth();
  const canManage = authRole === "owner" || authRole === "admin" || canInterview;
  const [interviews, setInterviews] = useState<InterviewRecord[] | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>("upcoming");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InterviewRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => subscribeInterviews((rows, state) => {
    setInterviews(rows);
    setLoadError(state.error);
  }), []);
  useEffect(() => subscribeTeam((rows) => setTeam(rows)), []);

  const loadApplications = useCallback(async () => {
    const token = await getAuthToken();
    const response = await fetch("/api/members/applicants/list", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load applicants.");
    const payload = await response.json() as { applications?: ApplicationRecord[] };
    setApplications(payload.applications ?? []);
  }, []);

  useEffect(() => {
    if (!canManage) return;
    void loadApplications().catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load applicants."));
  }, [canManage, loadApplications]);

  const interviewers = useMemo(() => team
    .filter((member) => member.status === "Active" && (member.canInterview || member.role === "Board"))
    .sort((a, b) => a.name.localeCompare(b.name)), [team]);
  const teamById = useMemo(() => new Map(team.map((member) => [member.id, member])), [team]);
  const appById = useMemo(() => new Map(applications.map((application) => [application.id, application])), [applications]);
  const selectableApplicants = useMemo(() => applications
    .filter((application) => !isTerminalApplicant(application.status))
    .sort((a, b) => a.fullName.localeCompare(b.fullName)), [applications]);

  const now = Date.now();
  const records = useMemo(() => [...(interviews ?? [])].sort((a, b) => {
    if (view === "upcoming") return Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt);
    return Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt);
  }), [interviews, view]);
  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      if (view === "upcoming" && record.status !== "scheduled") return false;
      if (view === "history" && record.status === "scheduled") return false;
      if (!query) return true;
      const interviewersText = record.interviewerMemberIds.map((id) => teamById.get(id)?.name ?? "").join(" ");
      return `${record.applicantName} ${record.applicantEmail} ${interviewersText} ${record.notes}`.toLowerCase().includes(query);
    });
  }, [records, search, teamById, view]);

  const stats = useMemo(() => {
    const rows = interviews ?? [];
    const upcoming = rows.filter((row) => row.status === "scheduled" && Date.parse(row.scheduledAt) >= now).length;
    const needsOutcome = rows.filter((row) => row.status === "scheduled" && Date.parse(row.scheduledAt) < now).length;
    const completed = rows.filter((row) => row.status === "completed").length;
    return { upcoming, needsOutcome, completed };
  }, [interviews, now]);

  const openCreate = async () => {
    const defaults = defaultDateTime();
    let meetingLink = "";
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/members/interviews/settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.ok) meetingLink = String((await response.json() as { zoomLink?: string }).zoomLink ?? "");
    } catch { /* The form remains usable without a default link. */ }
    setEditing(null);
    setForm({ ...EMPTY_FORM, ...defaults, meetingLink });
    setMessage("");
    setModalOpen(true);
  };

  const openEdit = (record: InterviewRecord) => {
    const parts = localDateTimeParts(record.scheduledAt);
    setEditing(record);
    setForm({
      applicantId: record.applicantId ?? "",
      date: parts.date,
      time: parts.time,
      durationMinutes: String(record.durationMinutes),
      meetingLink: record.meetingLink,
      interviewerMemberIds: record.interviewerMemberIds,
      notes: record.notes,
      status: record.status,
    });
    setMessage("");
    setModalOpen(true);
  };

  const saveInterview = async (event: FormEvent | null, resendConfirmation = false) => {
    event?.preventDefault();
    const scheduledAt = toIso(form.date, form.time);
    if (!scheduledAt || (!editing && !form.applicantId)) {
      setMessage("Choose an applicant and a valid date and time.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/members/interviews", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editing?.id,
          applicantId: form.applicantId,
          scheduledAt,
          durationMinutes: Number(form.durationMinutes),
          meetingLink: form.meetingLink,
          interviewerMemberIds: form.interviewerMemberIds,
          notes: form.notes,
          status: form.status,
          resendConfirmation,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { warning?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "save_failed");
      await loadApplications();
      setModalOpen(false);
      setMessage(payload.warning === "email_failed"
        ? "Saved, but the candidate confirmation failed. Open the interview and resend it."
        : payload.warning === "staff_email_failed"
          ? "Saved and the candidate was notified, but at least one interviewer email failed."
          : editing ? "Interview updated." : "Interview scheduled and everyone was notified.");
    } catch (error) {
      setMessage(error instanceof Error ? `Could not save: ${error.message}` : "Could not save this interview.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (record: InterviewRecord, status: InterviewRecordStatus) => {
    setSaving(true);
    setMessage("");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/members/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: record.id, status }),
      });
      if (!response.ok) throw new Error("update_failed");
      await loadApplications();
      setMessage(status === "completed" ? "Interview marked completed." : status === "no_show" ? "No-show recorded." : "Interview cancelled.");
    } catch {
      setMessage("Could not update the interview status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <SectionTabs tabs={APPLICANTS_GROUP_TABS} />
      <PageHeader
        title="Interviews"
        subtitle="Schedule candidates directly, send calendar confirmations, and keep a clean history from August 23, 2026 forward."
        action={canManage ? <Btn variant="primary" onClick={() => void openCreate()}>+ Schedule interview</Btn> : undefined}
      />

      {!canManage ? (
        <LoadError message="Your account does not have interview access." />
      ) : loadError ? (
        <LoadError message={loadError} onRetry={() => window.location.reload()} />
      ) : interviews === null ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Upcoming" value={stats.upcoming} color="text-emerald-700" />
            <StatCard label="Needs outcome" value={stats.needsOutcome} color={stats.needsOutcome ? "text-amber-700" : "text-emerald-700"} />
            <StatCard label="Completed since cutover" value={stats.completed} color="text-blue-700" />
          </div>

          {message && <div role="status" className="mb-4 rounded-lg border border-[#F6B78D]/35 bg-[#F6B78D]/10 px-4 py-3 text-sm text-[#8B5E48]">{message}</div>}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit rounded-xl border border-black/10 bg-black/[0.04] p-1">
              {(["upcoming", "history"] as View[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setView(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${view === item ? "border border-[#F6B78D]/35 bg-[#F6B78D]/15 text-[#8B5E48]" : "border border-transparent text-black/55 hover:bg-black/5 hover:text-black/85"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="w-full sm:max-w-sm">
              <SearchBar value={search} onChange={setSearch} placeholder="Search candidates or interviewers…" />
            </div>
          </div>

          {visibleRecords.length === 0 ? (
            <Empty
              message={view === "upcoming" ? "No interviews are scheduled yet." : "No interview history in the new system yet."}
              action={view === "upcoming" ? <Btn variant="primary" onClick={() => void openCreate()}>Schedule the first interview</Btn> : undefined}
            />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {visibleRecords.map((record) => {
                const meta = statusMeta(record.status);
                const interviewerNames = record.interviewerMemberIds.map((id) => teamById.get(id)?.name).filter(Boolean).join(", ");
                const overdue = record.status === "scheduled" && Date.parse(record.scheduledAt) < now;
                return (
                  <article key={record.id} className={`rounded-xl border bg-white p-4 shadow-sm ${overdue ? "border-amber-400/60" : "border-black/10"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}>{overdue ? "Needs outcome" : meta.label}</span>
                          <span className="text-[11px] text-black/40">{record.durationMinutes} min</span>
                        </div>
                        <h2 className="font-display text-lg font-semibold text-[#28242B]">{record.applicantName}</h2>
                        <p className="text-xs text-black/45">{record.applicantEmail}</p>
                      </div>
                      <Btn size="sm" onClick={() => openEdit(record)}>Edit</Btn>
                    </div>
                    <div className="mt-4 grid gap-3 border-t border-black/8 pt-3 text-xs sm:grid-cols-2">
                      <div><p className="text-[9px] font-bold uppercase tracking-wider text-black/35">When</p><p className="mt-1 font-medium text-black/75">{formatDateTime(record.scheduledAt)}</p></div>
                      <div><p className="text-[9px] font-bold uppercase tracking-wider text-black/35">Interviewer</p><p className="mt-1 font-medium text-black/75">{interviewerNames || "Not assigned"}</p></div>
                      {record.meetingLink && <div className="sm:col-span-2"><a className="font-semibold text-[#8B5E48] hover:underline" href={record.meetingLink} target="_blank" rel="noreferrer">Open meeting link ↗</a></div>}
                      {record.notes && <p className="sm:col-span-2 line-clamp-2 text-black/55">{record.notes}</p>}
                    </div>
                    {record.status === "scheduled" && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-black/8 pt-3">
                        <Btn size="sm" onClick={() => void setStatus(record, "completed")} disabled={saving}>Mark completed</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => void setStatus(record, "no_show")} disabled={saving}>No-show</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => void setStatus(record, "cancelled")} disabled={saving}>Cancel</Btn>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? `Edit ${editing.applicantName}` : "Schedule interview"} dismissible={!saving}>
        <form onSubmit={(event) => void saveInterview(event)} className="space-y-4">
          <Field label="Applicant" required>
            <Select value={form.applicantId} disabled={!!editing} onChange={(event) => setForm((current) => ({ ...current, applicantId: event.target.value }))}>
              <option value="">Choose an applicant…</option>
              {selectableApplicants.map((application) => (
                <option key={application.id} value={application.id}>{application.fullName} — {application.email}</option>
              ))}
              {editing?.applicantId && !selectableApplicants.some((application) => application.id === editing.applicantId) && (
                <option value={editing.applicantId}>{appById.get(editing.applicantId)?.fullName ?? editing.applicantName}</option>
              )}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" required><Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></Field>
            <Field label="Time" required><Input type="time" step={900} value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} /></Field>
            <Field label="Duration" required>
              <Select value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}>
                {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Meeting link"><Input type="url" value={form.meetingLink} placeholder="Zoom or Google Meet link" onChange={(event) => setForm((current) => ({ ...current, meetingLink: event.target.value }))} /></Field>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Interviewers</legend>
            <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-white/10 bg-black/10 p-3 sm:grid-cols-2">
              {interviewers.length === 0 ? <p className="text-xs text-white/45">No interviewers are enabled yet.</p> : interviewers.map((member) => {
                const checked = form.interviewerMemberIds.includes(member.id);
                return (
                  <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/75 hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setForm((current) => ({
                        ...current,
                        interviewerMemberIds: checked
                          ? current.interviewerMemberIds.filter((id) => id !== member.id)
                          : [...current.interviewerMemberIds, member.id],
                      }))}
                    />
                    {member.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {editing && (
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InterviewRecordStatus }))}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="no_show">No-show</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
          )}

          <Field label="Internal notes"><TextArea rows={4} value={form.notes} placeholder="Topics to cover, context, or outcome notes" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
          {message && <p role="alert" className="text-xs text-red-400">{message}</p>}

          <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
            <Btn type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Btn>
            {editing && <Btn type="button" onClick={() => void saveInterview(null, true)} disabled={saving}>Resend confirmation</Btn>}
            <Btn type="submit" variant="primary" disabled={saving}>{saving ? <Spinner size="sm" /> : editing ? "Save changes" : "Schedule & email"}</Btn>
          </div>
        </form>
      </Modal>
    </MembersLayout>
  );
}
