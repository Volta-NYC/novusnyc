"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Btn, Badge, Empty, Field, Input, LoadError, Modal, SkeletonRows, StatCard } from "@/components/members/ui";
import {
  subscribePods, subscribePodMembers, subscribePodMeetings, subscribeTeam, subscribeChapters,
  subscribePodAssignments, createPodMeeting, deletePodMeeting, updatePod, updatePodMeeting,
  addPodMember, removePodMember, setPodMemberRole,
  type Pod, type PodMember, type PodMeeting, type TeamMember, type PodRole, type Chapter, type PodAssignment,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { isInactiveMember } from "@/lib/members/roles";
import { getPodDivision, POD_DIVISION_META } from "@/lib/members/constants";
import AttendanceGrid from "./AttendanceGrid";
import PodAssignments from "./PodAssignments";
import GrantTracker from "./GrantTracker";

type Tab = "overview" | "meetings" | "tasks" | "schedule" | "grants" | "roster" | "settings";

export default function PodDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { authRole, userProfile, loading } = useAuth();
  const isAdmin = authRole === "owner" || authRole === "admin";

  const [pods, setPods]         = useState<Pod[] | null>(null);
  const [members, setMembers]   = useState<PodMember[] | null>(null);
  const [meetings, setMeetings] = useState<PodMeeting[]>([]);
  const [assignments, setAssignments] = useState<PodAssignment[]>([]);
  const [team, setTeam]         = useState<TeamMember[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tab, setTab]           = useState<Tab>("overview");
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<PodMeeting | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, string | null>>({});
  const rememberError = (key: string, error: string | null) => setLoadErrors((current) => current[key] === error ? current : { ...current, [key]: error });

  useEffect(() => subscribePods((rows, state) => { setPods(rows); rememberError("pods", state.error); }), []);
  useEffect(() => subscribePodMembers((rows, state) => { setMembers(rows); rememberError("roster", state.error); }), []);
  useEffect(() => subscribePodMeetings((rows, state) => { setMeetings(rows); rememberError("meetings", state.error); }), []);
  useEffect(() => subscribePodAssignments((rows, state) => { setAssignments(rows); rememberError("assignments", state.error); }), []);
  useEffect(() => subscribeTeam((rows, state) => { setTeam(rows); rememberError("team", state.error); }), []);
  useEffect(() => subscribeChapters((rows, state) => { setChapters(rows); rememberError("chapters", state.error); }), []);

  const pod = useMemo(() => (pods ?? []).find((p) => p.slug === slug) ?? null, [pods, slug]);
  const myId = userProfile?.id ?? null;

  const roster = useMemo(
    () => (members ?? []).filter((m) => m.podId === pod?.id && !m.leftAt),
    [members, pod],
  );
  const fullRoster = useMemo(
    () => (members ?? []).filter((m) => m.podId === pod?.id),
    [members, pod],
  );
  const isLit = !!myId && roster.some((m) => m.memberId === myId && m.role === "lit");
  const canRun = isAdmin || isLit;

  const nameById = useMemo(() => new Map(team.map((t) => [t.id, t.name])), [team]);

  const podMeetings = useMemo(
    () => meetings.filter((m) => m.podId === pod?.id).sort((a, b) => b.meetsOn.localeCompare(a.meetsOn)),
    [meetings, pod],
  );

  // Land on the newest meeting so the common case — "I just ran the call" — is
  // one click from a filled grid.
  useEffect(() => {
    if (!openMeeting && podMeetings.length) setOpenMeeting(podMeetings[0].id);
  }, [podMeetings, openMeeting]);

  if (loading || pods === null || members === null) {
    return <MembersLayout><div className="p-2"><SkeletonRows rows={6} cols={4} /></div></MembersLayout>;
  }

  const loadError = Object.entries(loadErrors).find(([, error]) => error)?.map(String).join(": ") ?? null;
  if (loadError) return <MembersLayout><LoadError message={loadError} onRetry={() => window.location.reload()} /></MembersLayout>;

  if (!pod) {
    return (
      <MembersLayout>
        <Empty message="No pod at that address." action={<Link href="/members/pods" className="text-[#F3E28D] text-sm">Back to pods</Link>} />
      </MembersLayout>
    );
  }

  // Pods are readable by anyone signed in, so the address of a pod you are not
  // in is guessable. Nothing secret sits behind it, but a page whose meetings
  // and tasks are all empty reads as broken rather than as not-yours.
  if (!isAdmin && !roster.some((m) => m.memberId === myId)) {
    return (
      <MembersLayout>
        <Empty
          message={`You're not in ${pod.name}.`}
          action={<Link href="/members/pods" className="text-[#F3E28D] text-sm">Back to your pods</Link>}
        />
      </MembersLayout>
    );
  }

  const lits = roster.filter((m) => m.role === "lit").map((m) => nameById.get(m.memberId) ?? "Unknown");
  const selected = podMeetings.find((m) => m.id === openMeeting) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = podMeetings.filter((meeting) => meeting.meetsOn >= today).sort((a, b) => a.meetsOn.localeCompare(b.meetsOn));
  const attendanceDue = podMeetings.filter((meeting) => meeting.meetsOn < today && !meeting.attendanceFinalizedAt);
  const podAssignments = assignments.filter((assignment) => assignment.podId === pod.id);
  const activeAssignments = podAssignments.filter((assignment) => assignment.status !== "Done");
  const overdueAssignments = activeAssignments.filter((assignment) => assignment.dueDate && assignment.dueDate < today);
  const reviewAssignments = activeAssignments.filter((assignment) => assignment.status === "In Review");
  const division = getPodDivision(pod.name);
  const divisionMeta = POD_DIVISION_META[division];
  const isFinancePod = division === "Finance";

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "meetings", label: attendanceDue.length ? `Attendance · ${attendanceDue.length}` : "Attendance" },
    { key: "tasks", label: reviewAssignments.length ? `Assignments · ${reviewAssignments.length}` : "Assignments" },
    { key: "schedule", label: "Schedule" },
    ...(isFinancePod ? [{ key: "grants" as Tab, label: "Grant tracker" }] : []),
    { key: "roster", label: `Roster · ${roster.length}` },
    ...(canRun ? [{ key: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <MembersLayout>
      <div className="mb-1">
        <Link href="/members/pods" className="text-[11px] text-white/35 hover:text-white/70">← Pods</Link>
      </div>
      <PageHeader
        title={pod.name}
        subtitle={[
          chapters.find((c) => c.id === pod.chapterId)?.name,
          lits.length ? `led by ${lits.join(", ")}` : "no LIT assigned yet",
        ].filter(Boolean).join(" · ")}
        action={<div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${divisionMeta.soft} ${divisionMeta.accent} ${divisionMeta.border}`}>{division}</span>
          {canRun && <Btn variant="primary" onClick={() => { setEditingMeeting(null); setScheduleOpen(true); }}>+ Schedule meeting</Btn>}
        </div>}
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#15181F] p-1" role="tablist" aria-label={`${pod.name} sections`}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            role="tab"
            aria-selected={tab === t.key}
            className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-colors ${
              tab === t.key
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="People" value={roster.length} color="text-sky-300" />
            <StatCard label="Open assignments" value={activeAssignments.length} color="text-[#F6B78D]" />
            <StatCard label="Needs review" value={reviewAssignments.length} color="text-yellow-300" />
            <StatCard label="Attendance due" value={attendanceDue.length} color={attendanceDue.length ? "text-red-400" : "text-green-400"} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewPanel title="Next meeting" action={canRun ? <button className="text-[11px] text-[#F6B78D] hover:underline" onClick={() => { setEditingMeeting(upcomingMeetings[0] ?? null); setScheduleOpen(true); }}>{upcomingMeetings[0] ? "Edit" : "Schedule"}</button> : undefined}>
              {upcomingMeetings[0] ? <MeetingSummary meeting={upcomingMeetings[0]} /> : <OverviewEmpty text="No upcoming meeting scheduled." />}
            </OverviewPanel>
            <OverviewPanel title="What needs attention">
              <div className="space-y-2">
                {attendanceDue.length > 0 && <ActionRow tone="red" label={`${attendanceDue.length} meeting${attendanceDue.length === 1 ? "" : "s"} need attendance`} onClick={() => { setOpenMeeting(attendanceDue[0].id); setTab("meetings"); }} />}
                {reviewAssignments.length > 0 && <ActionRow tone="yellow" label={`${reviewAssignments.length} assignment${reviewAssignments.length === 1 ? "" : "s"} ready for review`} onClick={() => setTab("tasks")} />}
                {overdueAssignments.length > 0 && <ActionRow tone="red" label={`${overdueAssignments.length} overdue assignment${overdueAssignments.length === 1 ? "" : "s"}`} onClick={() => setTab("tasks")} />}
                {attendanceDue.length + reviewAssignments.length + overdueAssignments.length === 0 && <OverviewEmpty text="Nothing urgent. This pod is up to date." />}
              </div>
            </OverviewPanel>
          </div>
          <OverviewPanel title="Roster" action={<button className="text-[11px] text-[#F6B78D] hover:underline" onClick={() => setTab("roster")}>Manage roster</button>}>
            <div className="flex flex-wrap gap-2">
              {roster.map((member) => <span key={member.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[11px] text-white/70">
                {nameById.get(member.memberId) ?? "Unknown"}{member.role === "lit" && <Badge label="lit" />}
              </span>)}
              {roster.length === 0 && <OverviewEmpty text="No one is assigned to this pod yet." />}
            </div>
          </OverviewPanel>
        </div>
      )}

      {tab === "meetings" && (
        podMeetings.length === 0 ? (
          <Empty
            message="No meetings yet. Schedule the first call to create an attendance sheet."
            action={canRun ? <Btn variant="primary" onClick={() => { setEditingMeeting(null); setScheduleOpen(true); }}>+ Schedule meeting</Btn> : undefined}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {podMeetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpenMeeting(m.id)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-left transition-colors lg:shrink ${
                    openMeeting === m.id
                      ? "border-[#F3E28D]/40 bg-[#F3E28D]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className={`font-mono text-[12px] tabular-nums ${openMeeting === m.id ? "text-[#F3E28D]" : "text-white/85"}`}>
                    {m.meetsOn}
                  </div>
                  <div className="text-[10px] text-white/35">
                    {m.title || `${m.hours}h`} · {m.attendanceFinalizedAt ? "complete" : m.meetsOn < today ? "attendance due" : "upcoming"}
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <AttendanceGrid
                key={selected.id}
                pod={pod}
                meeting={selected}
                roster={fullRoster}
                nameById={nameById}
                canEdit={canRun}
                myId={myId}
                onEditSchedule={() => { setEditingMeeting(selected); setScheduleOpen(true); }}
                onDelete={async () => {
                  if (!window.confirm(`Delete the ${selected.meetsOn} meeting and its attendance?`)) return;
                  await deletePodMeeting(selected.id);
                  setOpenMeeting(null);
                }}
              />
            )}
          </div>
        )
      )}

      {tab === "roster" && (
        <Roster
          pod={pod} roster={roster} team={team} canEdit={canRun} nameById={nameById}
        />
      )}

      {tab === "tasks" && (
        <PodAssignments pod={pod} roster={roster} nameById={nameById} canEdit={canRun} myId={myId} />
      )}

      {tab === "schedule" && <PodSchedule meetings={podMeetings} assignments={podAssignments} pod={pod} onOpenMeeting={(id) => { setOpenMeeting(id); setTab("meetings"); }} />}

      {tab === "grants" && isFinancePod && <GrantTracker pod={pod} canEdit={canRun} />}

      {tab === "settings" && canRun && <Settings pod={pod} />}

      <ScheduleMeetingModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        pod={pod}
        meeting={editingMeeting}
        onCreated={(id) => { setOpenMeeting(id); setScheduleOpen(false); setTab("meetings"); }}
      />
    </MembersLayout>
  );
}

function OverviewPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-xl border border-white/10 bg-[#15181F] p-4">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{title}</h2>{action}</div>
    {children}
  </section>;
}

function OverviewEmpty({ text }: { text: string }) { return <p className="text-[12px] text-white/40">{text}</p>; }

function ActionRow({ label, tone, onClick }: { label: string; tone: "red" | "yellow"; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${tone === "red" ? "border-red-400/25 bg-red-400/[0.06] text-red-300 hover:bg-red-400/10" : "border-yellow-400/25 bg-yellow-400/[0.06] text-yellow-300 hover:bg-yellow-400/10"}`}><span>{label}</span><span aria-hidden="true">→</span></button>;
}

function MeetingSummary({ meeting }: { meeting: PodMeeting }) {
  const when = meeting.startsAt ? new Date(meeting.startsAt).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : meeting.meetsOn;
  return <div><p className="text-[15px] font-semibold text-white/90">{meeting.title || "Pod meeting"}</p><p className="mt-1 text-[12px] text-white/50">{when} · {meeting.hours}h</p>{meeting.meetingUrl && <a className="mt-2 inline-block text-[11px] text-sky-300 hover:underline" href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer">Open meeting link ↗</a>}</div>;
}

function PodSchedule({ meetings, assignments, pod, onOpenMeeting }: { meetings: PodMeeting[]; assignments: PodAssignment[]; pod: Pod; onOpenMeeting: (id: string) => void }) {
  const events = [
    ...meetings.map((meeting) => ({ id: `m-${meeting.id}`, date: meeting.meetsOn, kind: "Meeting", title: meeting.title || `${pod.name} meeting`, meta: `${meeting.hours}h`, onClick: () => onOpenMeeting(meeting.id) })),
    ...assignments.filter((assignment) => assignment.dueDate).map((assignment) => ({ id: `a-${assignment.id}`, date: assignment.dueDate!, kind: "Assignment", title: assignment.title, meta: assignment.status, onClick: undefined })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return <section><div className="mb-4"><h2 className="font-display text-lg font-semibold text-white">Pod schedule</h2><p className="mt-1 text-[12px] text-white/45">Meetings and assignment deadlines in one chronological view.</p></div>
    {events.length === 0 ? <Empty message="Nothing is scheduled yet." /> : <div className="overflow-hidden rounded-xl border border-white/10 bg-[#15181F]">{events.map((event) => {
      const Component = event.onClick ? "button" : "div";
      return <Component key={event.id} {...(event.onClick ? { type: "button" as const, onClick: event.onClick } : {})} className="grid w-full grid-cols-[96px_88px_minmax(0,1fr)] items-center gap-3 border-b border-white/7 px-4 py-3 text-left last:border-0 hover:bg-white/[0.03]">
        <span className="font-mono text-[11px] tabular-nums text-white/55">{event.date}</span><Badge label={event.kind === "Meeting" ? "Upcoming" : event.meta} /><span className="min-w-0"><span className="block truncate text-[13px] text-white/85">{event.title}</span><span className="text-[10px] text-white/35">{event.kind === "Meeting" ? event.meta : "Assignment deadline"}</span></span>
      </Component>;
    })}</div>}
  </section>;
}

function ScheduleMeetingModal({ open, onClose, pod, meeting, onCreated }: { open: boolean; onClose: () => void; pod: Pod; meeting: PodMeeting | null; onCreated: (id: string) => void }) {
  const defaultStart = () => { const date = new Date(); date.setDate(date.getDate() + 7); date.setHours(18, 0, 0, 0); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); };
  const [title, setTitle] = useState(`${pod.name} call`);
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(String(pod.defaultMeetingHours));
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const localStart = meeting?.startsAt ? (() => { const date = new Date(meeting.startsAt); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); })() : defaultStart();
    setTitle(meeting?.title || `${pod.name} call`);
    setStart(localStart);
    setDuration(String(meeting?.hours ?? pod.defaultMeetingHours));
    setUrl(meeting?.meetingUrl ?? "");
    setError("");
  }, [meeting, open, pod.defaultMeetingHours, pod.name]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!start) return;
    setSaving(true); setError("");
    try {
      const begins = new Date(start); const hours = Math.max(0, Number(duration) || 0); const ends = new Date(begins.getTime() + hours * 3_600_000);
      const value = { meetsOn: start.slice(0, 10), title: title.trim(), hours, startsAt: begins.toISOString(), endsAt: ends.toISOString(), meetingUrl: url.trim() };
      const id = meeting ? (await updatePodMeeting(meeting.id, value), meeting.id) : await createPodMeeting(pod.id, value);
      onCreated(id);
    } catch (err) { setError(err instanceof Error ? err.message : "The meeting was not scheduled."); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title={meeting ? "Edit pod meeting" : "Schedule pod meeting"}><form className="space-y-4" onSubmit={submit}>
    <Field label="Meeting title" required><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Date and time" required><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field><Field label="Duration (hours)"><Input type="number" min="0" step="0.25" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field></div>
    <Field label="Meeting link"><Input type="url" placeholder="Zoom or Google Meet URL" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
    <p className="rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-sky-200">Everyone in the pod gets the normal automated reminder. After the call, this meeting becomes the attendance sheet.</p>
    {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    <div className="flex gap-2"><Btn type="submit" variant="primary" disabled={saving || !start}>{saving ? "Saving…" : meeting ? "Save schedule" : "Schedule meeting"}</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div>
  </form></Modal>;
}

// ── Roster ───────────────────────────────────────────────────────────────────

function Roster({
  pod, roster, team, canEdit, nameById,
}: {
  pod: Pod;
  roster: PodMember[];
  team: TeamMember[];
  canEdit: boolean;
  nameById: Map<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inPod = useMemo(
    () => new Map(roster.map((m) => [m.memberId, m.role as PodRole])),
    [roster],
  );

  const run = async (memberId: string, fn: () => Promise<void>) => {
    setBusy(memberId);
    setError(null);
    try { await fn(); }
    catch (err) { setError(err instanceof Error ? err.message : "That didn't save. Try again."); }
    finally { setBusy(null); }
  };

  // The roster itself is already listed above as chips, so this list exists to
  // add someone. It shows results for a search rather than ninety names.
  const q = query.trim().toLowerCase();
  const candidates = !q ? [] : team
    .filter((t) => !isInactiveMember(t.status))
    .filter((t) => t.name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q))
    .sort((a, b) => {
      const aOn = inPod.has(a.id), bOn = inPod.has(b.id);
      if (aOn !== bOn) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 25);

  return (
    <div className="max-w-2xl">
      {roster.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {roster.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/80">
              {nameById.get(m.memberId) ?? "Unknown"}
              {m.role === "lit" && <Badge label="lit" />}
              {canEdit && (
                <button
                  onClick={() => void run(m.memberId, () => removePodMember(pod.id, m.memberId))}
                  disabled={busy === m.memberId}
                  aria-label={`Remove ${nameById.get(m.memberId) ?? "member"} from ${pod.name}`}
                  className="text-white/30 transition-colors hover:text-red-400"
                >✕</button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mb-2 text-[11px] text-red-400">{error}</p>}

      {canEdit ? (
        <>
          <input
            className="mb-2 min-h-10 w-full rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-[12px] text-white/90 placeholder:text-white/25 focus:border-[#F3E28D]/40 focus:outline-none"
            placeholder="Search everyone by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-[26rem] overflow-y-auto rounded-md border border-white/10 bg-[#0F1014]">
            {candidates.map((t) => {
              const role = inPod.get(t.id);
              const isBusy = busy === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 border-b border-white/5 px-2.5 py-1.5 last:border-b-0 hover:bg-white/[0.03] ${isBusy ? "opacity-50" : ""}`}
                >
                  <button
                    onClick={() => void run(t.id, () => role
                      ? removePodMember(pod.id, t.id)
                      : addPodMember(pod.id, t.id, "member"))}
                    disabled={isBusy}
                    aria-pressed={!!role}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        role ? "border-sky-400/50 bg-sky-400/20 text-sky-300" : "border-white/20 text-transparent"
                    }`}>✓</span>
                    <span className={`truncate text-[12px] ${role ? "text-white" : "text-white/55"}`}>{t.name}</span>
                    {(t.divisions ?? []).length > 0 && (
                      <span className="shrink-0 text-[9px] uppercase tracking-wide text-white/25">
                        {(t.divisions ?? []).join(" · ")}
                      </span>
                    )}
                  </button>

                  {role && (
                    <button
                      onClick={() => void run(t.id, () => setPodMemberRole(pod.id, t.id, role === "lit" ? "member" : "lit"))}
                      disabled={isBusy}
                      aria-pressed={role === "lit"}
                      title={role === "lit" ? "Demote to member" : "Make LIT of this pod"}
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                        role === "lit" ? "bg-sky-400/15 text-sky-300" : "text-white/30 hover:text-white/70"
                      }`}
                    >LIT</button>
                  )}
                </div>
              );
            })}
            {candidates.length === 0 && (
              <p className="px-2.5 py-3 text-[11px] text-white/30">
                {q ? `No active member matches “${query.trim()}”.`
                   : "Search for someone by name or email to add them."}
              </p>
            )}
          </div>
          <p className="mt-2 text-[10px] text-white/25">
            Removing someone who has attended a meeting keeps their hours.
          </p>
        </>
      ) : (
        roster.length === 0 && <Empty message="No one in this pod yet." />
      )}
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function Settings({ pod }: { pod: Pod }) {
  const [cadence, setCadence]   = useState(String(pod.cadenceDays));
  const [meetingH, setMeetingH] = useState(String(pod.defaultMeetingHours));
  const [taskH, setTaskH]       = useState(String(pod.defaultTaskHours));
  const [saved, setSaved]       = useState(false);

  const dirty =
    Number(cadence) !== pod.cadenceDays ||
    Number(meetingH) !== pod.defaultMeetingHours ||
    Number(taskH) !== pod.defaultTaskHours;

  const save = async () => {
    await updatePod(pod.id, {
      cadenceDays: Math.max(1, Number(cadence) || pod.cadenceDays),
      defaultMeetingHours: Math.max(0, Number(meetingH)),
      defaultTaskHours: Math.max(0, Number(taskH)),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const field = "w-28 rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[11px] leading-relaxed text-white/40">
        Prefills — any meeting or task can override its own hours.
      </p>

      {([
        ["Meets every", cadence, setCadence, "days", ""],
        ["Default meeting", meetingH, setMeetingH, "hours", "Certified only for people marked Present."],
        ["Default task", taskH, setTaskH, "hours", "Earned when the task is marked done."],
      ] as const).map(([label, value, setter, unit, hint]) => (
        <div key={label} className="flex items-start gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-white/60">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step={unit === "days" ? "1" : "0.25"}
                className={field}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
              <span className="text-[11px] text-white/35">{unit}</span>
            </div>
          </div>
          {hint && <p className="mt-6 flex-1 text-[10px] leading-relaxed text-white/25">{hint}</p>}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <Btn variant="primary" onClick={save} disabled={!dirty}>Save</Btn>
        {saved && <span className="text-[11px] text-green-400">Saved</span>}
      </div>
    </div>
  );
}
