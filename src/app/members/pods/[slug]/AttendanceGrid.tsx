"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/members/ui";
import {
  fetchAttendance, saveAttendance, updatePodMeeting,
  ATTENDANCE_STATUSES,
  type Pod, type PodMeeting, type PodMember, type AttendanceStatus,
} from "@/lib/members/storage";

type Cell = { status: AttendanceStatus; tasksDone: number; note: string; hours: number | null };

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

  useEffect(() => {
    let live = true;
    void fetchAttendance(meeting.id).then((existing) => {
      if (!live) return;
      const byMember = new Map(existing.map((e) => [e.memberId, e]));
      const next: Record<string, Cell> = {};
      for (const m of roster) {
        const found = byMember.get(m.memberId);
        next[m.memberId] = found
          ? { status: found.status, tasksDone: found.tasksDone, note: found.note ?? "", hours: found.hours ?? null }
          : { status: "Present", tasksDone: 0, note: "", hours: null };
      }
      setCells(next);
    });
    return () => { live = false; };
  }, [meeting.id, roster]);

  const totals = useMemo(() => {
    const t = { Present: 0, Excused: 0, Unexcused: 0, tasks: 0, hours: 0 };
    if (!cells) return t;
    const meetingHours = Number(hours) || 0;
    for (const m of roster) {
      const c = cells[m.memberId];
      if (!c) continue;
      t[c.status] += 1;
      t.tasks += c.tasksDone;
      if (c.status !== "Unexcused") t.hours += c.hours ?? meetingHours;
    }
    return t;
  }, [cells, roster, hours]);

  const set = (memberId: string, patch: Partial<Cell>) =>
    setCells((prev) => (prev ? { ...prev, [memberId]: { ...prev[memberId], ...patch } } : prev));

  const save = async () => {
    if (!cells) return;
    setSaving(true);
    try {
      if (Number(hours) !== meeting.hours || title !== meeting.title) {
        await updatePodMeeting(meeting.id, { hours: Number(hours) || 0, title });
      }
      await saveAttendance(
        meeting.id,
        roster.map((m) => ({
          memberId: m.memberId,
          status: cells[m.memberId]?.status ?? "Present",
          tasksDone: cells[m.memberId]?.tasksDone ?? 0,
          hours: cells[m.memberId]?.hours ?? null,
          note: cells[m.memberId]?.note ?? "",
        })),
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
    for (const m of roster) next[m.memberId] = { ...next[m.memberId], status };
    setCells(next);
  };

  if (roster.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111418] p-6 text-center">
        <p className="text-sm text-white/40">Add people to the roster before taking attendance.</p>
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

        <div className="ml-auto flex items-center gap-3 pb-0.5 text-[11px]">
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
                {["Member", "Attendance", "Tasks done", "Note"].map((h) => (
                  <th key={h} className="border-b border-white/10 px-3 py-2 text-left text-[10px] uppercase tracking-wide text-white/40">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map((m) => {
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
