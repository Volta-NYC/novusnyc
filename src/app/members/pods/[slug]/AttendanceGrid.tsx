"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/members/ui";
import {
  fetchAttendance, saveAttendance, updatePodMeeting,
  subscribeInfractions, subscribeMemberStrikes, createMemberStrike,
  ATTENDANCE_STATUSES,
  type Pod, type PodMeeting, type PodMember, type PodRole, type PodAttendance, type AttendanceStatus,
  type Infraction, type MemberStrike,
} from "@/lib/members/storage";

type Cell = { status: AttendanceStatus | null; tasksDone: number; note: string; hours: number | null };

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  Present:   "bg-green-500/20 text-green-300 border-green-500/30",
  Excused:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Unexcused: "bg-red-500/20 text-red-300 border-red-500/30",
};

// The only screen a LIT has to use. Roster is prefilled, everyone starts
// Present, and the totals are computed — so filling it in is marking the
// exceptions and pressing save once.
export default function AttendanceGrid({
  pod, meeting, roster, nameById, canEdit, myId, onDelete,
}: {
  pod: Pod;
  meeting: PodMeeting;
  roster: PodMember[];
  nameById: Map<string, string>;
  canEdit: boolean;
  myId: string | null;
  onDelete: () => void;
}) {
  const [cells, setCells]   = useState<Record<string, Cell> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [hours, setHours]   = useState(String(meeting.hours));
  const [title, setTitle]   = useState(meeting.title);
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [issuing, setIssuing] = useState<string | null>(null);

  useEffect(() => subscribeInfractions(setInfractions), []);
  useEffect(() => subscribeMemberStrikes(setStrikes), []);

  // The infraction the grid offers for an unexcused absence. Falls back to the
  // repeat version once someone already has one on record, so the escalation
  // doesn't depend on anyone remembering to pick the harsher entry.
  const absenceInfraction = useMemo(
    () => infractions.find((i) => i.name.toLowerCase() === "unexcused absence") ?? null,
    [infractions],
  );
  const repeatInfraction = useMemo(
    () => infractions.find((i) => i.name.toLowerCase() === "repeated unexcused absence") ?? null,
    [infractions],
  );

  const issuedFor = (memberId: string) =>
    strikes.some((s) => s.memberId === memberId && (s.note ?? "").includes(meeting.id));

  const issueAbsence = async (memberId: string, memberName: string) => {
    const priorAbsences = strikes.filter(
      (s) => s.memberId === memberId && /absence/i.test(s.infractionName ?? ""),
    ).length;
    const chosen = (priorAbsences > 0 ? repeatInfraction : absenceInfraction) ?? absenceInfraction;
    if (!chosen) return;
    setIssuing(memberId);
    try {
      await createMemberStrike({
        memberId,
        memberName,
        infractionId: chosen.id,
        infractionName: chosen.name,
        points: chosen.points,
        source: "attendance",
        issuedBy: "attendance grid",
        // The meeting id makes this idempotent: the button won't offer twice.
        note: `${pod.name} meeting ${meeting.meetsOn} (${meeting.id})`,
      });
    } finally {
      setIssuing(null);
    }
  };

  // Row-level security returns only a member's own attendance, so filling the
  // rest of the roster with a Present default would show them a pod that was
  // never marked. Whoever can't edit sees their own row and nothing more.
  const visibleRoster = useMemo(
    () => (canEdit ? roster : roster.filter((m) => m.memberId === myId)),
    [canEdit, roster, myId],
  );

  // Whoever was marked for this meeting stays on it even if they have since
  // left the pod, and a later joiner does not retroactively appear on a meeting
  // they were not at. Only the union is offered a row.
  const [marked, setMarked] = useState<PodAttendance[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setMarked(null);
    setLoadFailed(false);
    fetchAttendance(meeting.id)
      .then((existing) => { if (live) setMarked(existing); })
      .catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [meeting.id]);

  const gridRoster = useMemo(() => {
    if (!marked) return visibleRoster;
    const seen = new Set(visibleRoster.map((m) => m.memberId));
    const departed = marked
      .filter((a) => !seen.has(a.memberId))
      .map((a) => ({ memberId: a.memberId, role: "member" as PodRole, podId: meeting.podId }));
    return [...visibleRoster, ...(canEdit ? departed : [])];
  }, [visibleRoster, marked, canEdit, meeting.podId]);

  useEffect(() => {
    if (!marked) return;
    const byMember = new Map(marked.map((e) => [e.memberId, e]));
    const next: Record<string, Cell> = {};
    for (const m of gridRoster) {
      const found = byMember.get(m.memberId);
      // An unmarked row on an already-marked meeting is genuinely unknown, so
      // it starts blank; only a fresh sheet prefills Present.
      next[m.memberId] = found
        ? { status: found.status, tasksDone: found.tasksDone, note: found.note ?? "", hours: found.hours ?? null }
        : marked.length > 0
          ? { status: null, tasksDone: 0, note: "", hours: null }
          : { status: "Present", tasksDone: 0, note: "", hours: null };
    }
    setCells(next);
  }, [marked, gridRoster]);

  const totals = useMemo(() => {
    const t = { Present: 0, Excused: 0, Unexcused: 0, tasks: 0, hours: 0 };
    if (!cells) return t;
    const meetingHours = Number(hours) || 0;
    for (const m of gridRoster) {
      const c = cells[m.memberId];
      if (!c || !c.status) continue;
      t[c.status] += 1;
      t.tasks += c.tasksDone;
      if (c.status !== "Unexcused") t.hours += c.hours ?? meetingHours;
    }
    return t;
  }, [cells, gridRoster, hours]);

  const set = (memberId: string, patch: Partial<Cell>) =>
    setCells((prev) => (prev ? { ...prev, [memberId]: { ...prev[memberId], ...patch } } : prev));

  const save = async () => {
    if (!cells) return;
    setSaving(true);
    try {
      if (Number(hours) !== meeting.hours || title !== meeting.title) {
        await updatePodMeeting(meeting.id, { hours: Number(hours) || 0, title });
      }
      // Only rows somebody actually marked are written. Defaulting an unset
      // row to Present would certify hours for a meeting nobody recorded.
      await saveAttendance(
        meeting.id,
        gridRoster.flatMap((m) => {
          const c = cells[m.memberId];
          if (!c?.status) return [];
          return [{
            memberId: m.memberId,
            status: c.status,
            tasksDone: c.tasksDone,
            hours: c.hours,
            note: c.note,
          }];
        }),
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    if (!cells) return;
    const next = { ...cells };
    for (const m of gridRoster) next[m.memberId] = { ...next[m.memberId], status };
    setCells(next);
  };

  if (loadFailed) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-300">Attendance for this meeting could not be loaded.</p>
        <p className="mt-1 text-[11px] text-white/45">
          Nothing has been changed. Reload before marking anyone, so an existing sheet isn&apos;t overwritten.
        </p>
      </div>
    );
  }

  if (!marked) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111418] p-6 text-center">
        <p className="text-sm text-white/40">Loading attendance…</p>
      </div>
    );
  }

  if (gridRoster.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111418] p-6 text-center">
        <p className="text-sm text-white/40">
          {canEdit ? "Add people to the roster before taking attendance." : "You weren't on the roster for this meeting."}
        </p>
      </div>
    );
  }

  const field = "rounded-md border border-white/10 bg-[#0F1014] px-2 py-1 text-[12px] text-white/90 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <div className="rounded-lg border border-white/10 bg-[#111418]">
      <div className="flex flex-wrap items-end gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <label htmlFor={`title-${meeting.id}`} className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
            Meeting
          </label>
          <input
            id={`title-${meeting.id}`}
            className={`${field} w-52`}
            placeholder={`${pod.name} · ${meeting.meetsOn}`}
            disabled={!canEdit}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`hrs-${meeting.id}`} className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
            Hours
          </label>
          <input
            id={`hrs-${meeting.id}`}
            type="number" min="0" step="0.25"
            className={`${field} w-20`}
            disabled={!canEdit}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {canEdit && (
          <div className="flex items-center gap-1.5 pb-0.5">
            <span className="text-[10px] uppercase tracking-wide text-white/30">Mark all</span>
            {ATTENDANCE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => markAll(s)}
                className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50 transition-colors hover:border-white/25 hover:text-white/85"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className={`ml-auto items-center gap-3 pb-0.5 text-[11px] ${canEdit ? "flex" : "hidden"}`}>
          <span className="text-green-400">{totals.Present} present</span>
          {totals.Excused > 0 && <span className="text-yellow-300">{totals.Excused} excused</span>}
          {totals.Unexcused > 0 && <span className="text-red-400">{totals.Unexcused} unexcused</span>}
          <span className="text-white/40">{totals.tasks} tasks</span>
          <span className="font-mono tabular-nums text-white/70">{totals.hours.toFixed(2)}h</span>
        </div>
      </div>

      {cells === null ? (
        <div className="p-6 text-center text-[12px] text-white/30">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                {["Member", "Attendance", "Tasks done", "Note", ""].map((h, i) => (
                  <th key={h + i} className="border-b border-white/10 px-3 py-2 text-left text-[10px] uppercase tracking-wide text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gridRoster.map((m) => {
                const c = cells[m.memberId];
                if (!c) return null;
                return (
                  <tr key={m.memberId} className="border-b border-white/5 last:border-b-0">
                    <td className="px-3 py-1.5">
                      <span className={`text-[12px] ${m.memberId === myId ? "text-[#F3E28D]" : "text-white/85"}`}>
                        {nameById.get(m.memberId) ?? "Unknown"}
                      </span>
                      {m.role === "lit" && (
                        <span className="ml-1.5 text-[9px] uppercase tracking-wide text-white/30">LIT</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-1">
                        {ATTENDANCE_STATUSES.map((s) => (
                          <button
                            key={s}
                            disabled={!canEdit}
                            onClick={() => set(m.memberId, { status: s })}
                            className={`rounded border px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-60 ${
                              c.status === s
                                ? STATUS_STYLE[s]
                                : "border-white/10 text-white/35 hover:border-white/25 hover:text-white/70"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={!canEdit || c.tasksDone <= 0}
                          onClick={() => set(m.memberId, { tasksDone: Math.max(0, c.tasksDone - 1) })}
                          className="h-5 w-5 rounded border border-white/10 text-[11px] text-white/50 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30"
                          aria-label="One fewer"
                        >−</button>
                        <span className="w-5 text-center font-mono text-[12px] tabular-nums text-white/85">
                          {c.tasksDone}
                        </span>
                        <button
                          disabled={!canEdit}
                          onClick={() => set(m.memberId, { tasksDone: c.tasksDone + 1 })}
                          className="h-5 w-5 rounded border border-white/10 text-[11px] text-white/50 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30"
                          aria-label="One more"
                        >+</button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className={`${field} w-full`}
                        placeholder="—"
                        disabled={!canEdit}
                        value={c.note}
                        onChange={(e) => set(m.memberId, { note: e.target.value })}
                        aria-label={`Note for ${nameById.get(m.memberId) ?? "member"}`}
                      />
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {c.status === "Unexcused" && canEdit && absenceInfraction && (
                        issuedFor(m.memberId) ? (
                          <span className="text-[10px] text-white/30">Infraction issued</span>
                        ) : (
                          <button
                            disabled={issuing === m.memberId}
                            onClick={() => void issueAbsence(m.memberId, nameById.get(m.memberId) ?? "")}
                            className="rounded border border-red-400/30 px-1.5 py-0.5 text-[10px] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                          >
                            {issuing === m.memberId ? "…" : "Issue infraction"}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <Btn variant="primary" onClick={save} disabled={saving || cells === null}>
            {saving ? "Saving…" : "Save attendance"}
          </Btn>
          {saved && <span className="text-[11px] text-green-400">Saved</span>}
          <button
            onClick={onDelete}
            className="ml-auto text-[11px] text-white/30 transition-colors hover:text-red-400"
          >
            Delete meeting
          </button>
        </div>
      )}
    </div>
  );
}
