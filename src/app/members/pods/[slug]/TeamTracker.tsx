"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge, Btn, Empty, Input, LoadError, Select,
} from "@/components/members/ui";
import {
  ATTENDANCE_STATUSES,
  addPodMember,
  fetchAttendanceForMeetings,
  removePodMember,
  saveAttendance,
  setPodMemberRole,
  type AttendanceStatus,
  type Pod,
  type PodAssignment,
  type PodAttendance,
  type PodMeeting,
  type PodMember,
  type PodRole,
  type TeamMember,
} from "@/lib/members/storage";
import { isInactiveMember } from "@/lib/members/roles";

type TrackerCell = {
  status: AttendanceStatus | null;
  tasksDone: number;
  hours: number | null;
  note: string;
};

const EMPTY_CELL: TrackerCell = { status: null, tasksDone: 0, hours: null, note: "" };
const RECENT_MEETING_COUNT = 8;

function shortDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TeamTracker({
  pod,
  roster,
  meetings,
  assignments,
  team,
  nameById,
  canEdit,
  myId,
  onScheduleMeeting,
  onOpenMeeting,
}: {
  pod: Pod;
  roster: PodMember[];
  meetings: PodMeeting[];
  assignments: PodAssignment[];
  team: TeamMember[];
  nameById: Map<string, string>;
  canEdit: boolean;
  myId: string | null;
  onScheduleMeeting: () => void;
  onOpenMeeting: (meetingId: string) => void;
}) {
  const [attendance, setAttendance] = useState<PodAttendance[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<string, TrackerCell>>>({});
  const [dirtyMeetingIds, setDirtyMeetingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [manageRoster, setManageRoster] = useState(false);

  useEffect(() => {
    let live = true;
    setAttendance(null);
    setLoadError("");
    fetchAttendanceForMeetings(meetings.map((meeting) => meeting.id))
      .then((rows) => { if (live) setAttendance(rows); })
      .catch((error) => { if (live) setLoadError(error instanceof Error ? error.message : "Attendance could not be loaded."); });
    return () => { live = false; };
  }, [meetings]);

  const attendanceByMeeting = useMemo(() => {
    const result = new Map<string, Map<string, PodAttendance>>();
    for (const row of attendance ?? []) {
      const rows = result.get(row.meetingId) ?? new Map<string, PodAttendance>();
      rows.set(row.memberId, row);
      result.set(row.meetingId, rows);
    }
    return result;
  }, [attendance]);

  useEffect(() => {
    if (!attendance) return;
    const next: Record<string, Record<string, TrackerCell>> = {};
    for (const meeting of meetings) {
      const rows = attendanceByMeeting.get(meeting.id);
      next[meeting.id] = {};
      for (const member of roster) {
        const value = rows?.get(member.memberId);
        next[meeting.id][member.memberId] = value
          ? { status: value.status, tasksDone: value.tasksDone, hours: value.hours ?? null, note: value.note ?? "" }
          : { ...EMPTY_CELL };
      }
    }
    setDrafts(next);
    setDirtyMeetingIds(new Set());
  }, [attendance, attendanceByMeeting, meetings, roster]);

  const displayedMeetings = useMemo(() => {
    const chronological = [...meetings].sort((a, b) => a.meetsOn.localeCompare(b.meetsOn));
    return showAllMeetings ? chronological : chronological.slice(-RECENT_MEETING_COUNT);
  }, [meetings, showAllMeetings]);

  const visibleRoster = useMemo(() => {
    const shownIds = new Set(displayedMeetings.map((meeting) => meeting.id));
    return roster
      .filter((member) => {
        if (!canEdit) return member.memberId === myId;
        if (!member.leftAt) return true;
        return (attendance ?? []).some((row) => row.memberId === member.memberId && shownIds.has(row.meetingId));
      })
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "lit" ? -1 : 1;
        return (nameById.get(a.memberId) ?? "").localeCompare(nameById.get(b.memberId) ?? "");
      });
  }, [attendance, canEdit, displayedMeetings, myId, nameById, roster]);

  const setCell = (meetingId: string, memberId: string, patch: Partial<TrackerCell>) => {
    setDrafts((current) => ({
      ...current,
      [meetingId]: {
        ...current[meetingId],
        [memberId]: { ...(current[meetingId]?.[memberId] ?? EMPTY_CELL), ...patch },
      },
    }));
    setDirtyMeetingIds((current) => new Set(current).add(meetingId));
    setSaved(false);
  };

  const markAllPresent = (meetingId: string) => {
    for (const member of visibleRoster.filter((row) => !row.leftAt)) {
      setCell(meetingId, member.memberId, { status: "Present" });
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    setSaveError("");
    try {
      for (const meetingId of dirtyMeetingIds) {
        const meeting = meetings.find((item) => item.id === meetingId);
        if (!meeting) continue;
        const cells = Object.entries(drafts[meetingId] ?? {}).flatMap(([memberId, cell]) => cell.status ? [{
          memberId,
          status: cell.status,
          tasksDone: cell.tasksDone,
          hours: cell.hours,
          note: cell.note,
        }] : []);
        await saveAttendance(meeting.id, cells, { title: meeting.title, hours: meeting.hours });
      }
      setDirtyMeetingIds(new Set());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The tracker was not saved.");
    } finally {
      setSaving(false);
    }
  };

  const summaryByMember = useMemo(() => {
    const result = new Map<string, { attendanceCredit: number; marked: number; approvedWork: number; unexcused: number; meetingHours: number }>();
    const meetingById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
    for (const member of roster) {
      const rows = (attendance ?? []).filter((row) => row.memberId === member.memberId);
      const present = rows.filter((row) => row.status === "Present").length;
      const late = rows.filter((row) => row.status === "Late").length;
      const unexcused = rows.filter((row) => row.status === "Unexcused").length;
      const meetingHours = rows.reduce((total, row) => {
        const meeting = meetingById.get(row.meetingId);
        if (!meeting?.attendanceFinalizedAt) return total;
        if (row.status === "Present") return total + (row.hours ?? meeting.hours);
        if (row.status === "Late") return total + (row.hours ?? meeting.hours / 2);
        return total;
      }, 0);
      const approvedWork = assignments.filter((assignment) => assignment.status === "Done" && assignment.assignedMemberIds.includes(member.memberId)).length;
      result.set(member.memberId, { attendanceCredit: present + late * 0.5, marked: rows.length, approvedWork, unexcused, meetingHours });
    }
    return result;
  }, [assignments, attendance, meetings, roster]);

  if (loadError) return <LoadError message={loadError} onRetry={() => window.location.reload()} />;
  if (attendance === null) return <div className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />;

  return (
    <section aria-labelledby="team-tracker-title" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#15181F] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="team-tracker-title" className="font-display text-lg font-semibold text-white">Team tracker</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-white/50">
            Roster, attendance, completed work, and meeting history in one sheet. Member names stay visible while you scroll through dates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meetings.length > RECENT_MEETING_COUNT && (
            <Btn size="sm" variant="secondary" onClick={() => setShowAllMeetings((value) => !value)}>
              {showAllMeetings ? `Recent ${RECENT_MEETING_COUNT}` : `All ${meetings.length} meetings`}
            </Btn>
          )}
          {canEdit && <Btn size="sm" variant="secondary" onClick={() => setManageRoster((value) => !value)}>{manageRoster ? "Close team manager" : "Manage team"}</Btn>}
          {canEdit && <Btn size="sm" variant="primary" onClick={onScheduleMeeting}>+ Schedule meeting</Btn>}
        </div>
      </div>

      {manageRoster && canEdit && (
        <RosterManager pod={pod} roster={roster.filter((member) => !member.leftAt)} team={team} nameById={nameById} />
      )}

      {meetings.length === 0 ? (
        <Empty message="Schedule the first pod call to create the team tracker." action={canEdit ? <Btn variant="primary" onClick={onScheduleMeeting}>Schedule first meeting</Btn> : undefined} />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#15181F]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
            <p className="text-[11px] text-white/45">Scroll sideways for older meetings. Select a date to open notes, detailed attendance, or corrections.</p>
            {canEdit && (
              <div className="flex items-center gap-3">
                {saved && <span className="text-[11px] text-green-400">Saved</span>}
                {saveError && <span role="alert" className="text-[11px] text-red-400">{saveError}</span>}
                <Btn size="sm" variant="primary" disabled={saving || dirtyMeetingIds.size === 0} onClick={() => void saveChanges()}>
                  {saving ? "Saving…" : dirtyMeetingIds.size ? `Save ${dirtyMeetingIds.size} meeting${dirtyMeetingIds.size === 1 ? "" : "s"}` : "Saved"}
                </Btn>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="members-grid-table min-w-max border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 min-w-[220px] border-b border-r border-white/10 bg-[#15181F] px-3 text-left">Member</th>
                  <th className="min-w-[92px] border-b border-r border-white/10 px-3 text-center">Attendance</th>
                  <th className="min-w-[82px] border-b border-r border-white/10 px-3 text-center">Meeting h</th>
                  <th className="min-w-[90px] border-b border-r border-white/10 px-3 text-center">Approved work</th>
                  <th className="min-w-[86px] border-b border-r border-white/10 px-3 text-center">Unexcused</th>
                  {displayedMeetings.map((meeting) => (
                    <th key={meeting.id} className="min-w-[178px] border-b border-r border-white/10 px-2 py-2 text-left last:border-r-0">
                      <div className="flex items-start justify-between gap-2">
                        <Btn size="sm" variant="ghost" className="min-h-0 px-0 py-0 font-semibold" onClick={() => onOpenMeeting(meeting.id)}>
                          {shortDate(meeting.meetsOn)}
                        </Btn>
                        {meeting.attendanceFinalizedAt ? <Badge label="Complete" /> : meeting.meetsOn < new Date().toISOString().slice(0, 10) ? <span className="text-[9px] text-red-400">Due</span> : null}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-normal normal-case tracking-normal text-white/35">
                        <span>Attendance · work</span>
                        {canEdit && <Btn size="sm" variant="ghost" className="min-h-0 px-0 py-0 text-[9px]" onClick={() => markAllPresent(meeting.id)}>All present</Btn>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRoster.map((member) => {
                  const summary = summaryByMember.get(member.memberId) ?? { attendanceCredit: 0, marked: 0, approvedWork: 0, unexcused: 0, meetingHours: 0 };
                  return (
                    <tr key={member.id}>
                      <td className="sticky left-0 z-20 border-r border-white/10 bg-[#15181F] px-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12px] font-semibold text-white/90">{nameById.get(member.memberId) ?? "Unknown"}</span>
                          {member.role === "lit" && <Badge label="LIT" />}
                          {member.leftAt && <span className="text-[9px] text-white/35">Former</span>}
                        </div>
                      </td>
                      <td className="border-r border-white/10 px-3 text-center font-mono text-[11px] tabular-nums text-white/70">
                        {summary.marked ? `${Math.round((summary.attendanceCredit / summary.marked) * 100)}%` : "—"}
                      </td>
                      <td className="border-r border-white/10 px-3 text-center font-mono text-[11px] tabular-nums text-white/70">{summary.meetingHours.toFixed(1)}</td>
                      <td className="border-r border-white/10 px-3 text-center font-mono text-[11px] tabular-nums text-white/70">{summary.approvedWork}</td>
                      <td className={`border-r border-white/10 px-3 text-center font-mono text-[11px] tabular-nums ${summary.unexcused ? "text-red-400" : "text-white/45"}`}>{summary.unexcused}</td>
                      {displayedMeetings.map((meeting) => {
                        const cell = drafts[meeting.id]?.[member.memberId] ?? EMPTY_CELL;
                        return (
                          <td key={meeting.id} className="border-r border-white/10 px-2 last:border-r-0">
                            <div className="grid grid-cols-[minmax(112px,1fr)_42px] gap-1.5 py-1">
                              <Select
                                aria-label={`${shortDate(meeting.meetsOn)} attendance for ${nameById.get(member.memberId) ?? "member"}`}
                                className="min-h-8 py-1 pl-2 pr-7 text-[11px]"
                                value={cell.status ?? ""}
                                disabled={!canEdit || !!member.leftAt}
                                onChange={(event) => setCell(meeting.id, member.memberId, { status: event.target.value ? event.target.value as AttendanceStatus : null })}
                              >
                                <option value="">—</option>
                                {ATTENDANCE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                              </Select>
                              <Input
                                aria-label={`${shortDate(meeting.meetsOn)} completed work for ${nameById.get(member.memberId) ?? "member"}`}
                                title="Completed work"
                                type="number"
                                min="0"
                                step="1"
                                className="min-h-8 px-1 py-1 text-center text-[11px]"
                                value={cell.tasksDone}
                                disabled={!canEdit || !!member.leftAt}
                                onChange={(event) => setCell(meeting.id, member.memberId, { tasksDone: Math.max(0, Number(event.target.value) || 0) })}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function RosterManager({ pod, roster, team, nameById }: {
  pod: Pod;
  roster: PodMember[];
  team: TeamMember[];
  nameById: Map<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inPod = useMemo(() => new Map(roster.map((member) => [member.memberId, member.role as PodRole])), [roster]);
  const q = query.trim().toLowerCase();
  const candidates = q ? team
    .filter((member) => !isInactiveMember(member.status))
    .filter((member) => member.name.toLowerCase().includes(q) || (member.email ?? "").toLowerCase().includes(q))
    .sort((a, b) => Number(inPod.has(b.id)) - Number(inPod.has(a.id)) || a.name.localeCompare(b.name))
    .slice(0, 20) : [];

  const run = async (memberId: string, action: () => Promise<void>) => {
    setBusy(memberId);
    setError("");
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The roster did not save."); }
    finally { setBusy(null); }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#15181F] p-4">
      <div className="mb-3">
        <h3 className="font-display text-[15px] font-semibold text-white">Manage team</h3>
        <p className="mt-1 text-[11px] text-white/45">Search the directory to add people. Removing someone preserves their meeting history and certified hours.</p>
      </div>
      <Input placeholder="Search by name or email…" value={query} onChange={(event) => setQuery(event.target.value)} />
      {error && <p role="alert" className="mt-2 text-[11px] text-red-400">{error}</p>}
      {q && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-white/10">
          {candidates.map((member) => {
            const role = inPod.get(member.id);
            return (
              <div key={member.id} className="flex items-center gap-2 border-b border-white/5 px-3 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white/85">{member.name}</p>
                  <p className="truncate text-[10px] text-white/40">{member.email || "No email"}</p>
                </div>
                {role && <Btn size="sm" variant={role === "lit" ? "primary" : "secondary"} disabled={busy === member.id} onClick={() => void run(member.id, () => setPodMemberRole(pod.id, member.id, role === "lit" ? "member" : "lit"))}>{role === "lit" ? "LIT" : "Make LIT"}</Btn>}
                <Btn size="sm" variant={role ? "danger" : "secondary"} disabled={busy === member.id} onClick={() => void run(member.id, () => role ? removePodMember(pod.id, member.id) : addPodMember(pod.id, member.id, "member"))}>{role ? "Remove" : "Add"}</Btn>
              </div>
            );
          })}
          {candidates.length === 0 && <p className="px-3 py-4 text-[11px] text-white/40">No active member matches “{query.trim()}”.</p>}
        </div>
      )}
      {!q && roster.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {roster.map((member) => <span key={member.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/75">{nameById.get(member.memberId) ?? "Unknown"}{member.role === "lit" && <Badge label="LIT" />}</span>)}
        </div>
      )}
    </div>
  );
}
