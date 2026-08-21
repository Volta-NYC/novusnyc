"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Badge, Empty } from "@/components/members/ui";
import {
  subscribePodAssignments, createPodAssignment, completePodAssignment, deletePodAssignment,
  type Pod, type PodMember, type PodAssignment,
} from "@/lib/members/storage";

// Assignments are pushed to named people, not posted for anyone to claim. The
// browse-and-claim catalog went from 54 people a month to 6 before it was retired.
export default function PodAssignments({
  pod, roster, nameById, canEdit, myId,
}: {
  pod: Pod;
  roster: PodMember[];
  nameById: Map<string, string>;
  canEdit: boolean;
  myId: string | null;
}) {
  const [all, setAll] = useState<PodAssignment[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [hours, setHours] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => subscribePodAssignments(setAll), []);

  const items = useMemo(() => {
    const mine = (all ?? []).filter((a) => a.podId === pod.id);
    return mine
      .filter((a) => showDone || a.status !== "Done")
      .sort((a, b) => {
        if ((a.status === "Done") !== (b.status === "Done")) return a.status === "Done" ? 1 : -1;
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
  }, [all, pod.id, showDone]);

  const doneCount = (all ?? []).filter((a) => a.podId === pod.id && a.status === "Done").length;

  const reset = () => {
    setTitle(""); setDue(""); setHours(""); setPicked([]); setComposing(false);
  };

  const create = async () => {
    if (!title.trim() || picked.length === 0) return;
    await createPodAssignment({
      podId: pod.id,
      title: title.trim(),
      description: "",
      status: "Open",
      assignedMemberIds: picked,
      assignedMemberNames: picked.map((id) => nameById.get(id) ?? ""),
      dueDate: due || null,
      hours: hours ? Number(hours) : null,
    });
    reset();
  };

  const field = "rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 placeholder:text-white/25 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <div className="max-w-3xl">
      {canEdit && (
        composing ? (
          <div className="mb-4 rounded-lg border border-white/10 bg-[#111418] p-4">
            <input
              autoFocus
              className={`${field} mb-2 w-full`}
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="mb-3 flex flex-wrap gap-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">Due</label>
                <input type="date" className={`${field} w-36`} value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">Hours</label>
                <input
                  type="number" min="0" step="0.25"
                  className={`${field} w-24`}
                  placeholder={String(pod.defaultTaskHours)}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">
              Assign to {picked.length > 0 && <span className="text-white/60">{picked.length}</span>}
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {roster.map((m) => {
                const on = picked.includes(m.memberId);
                return (
                  <button
                    key={m.memberId}
                    onClick={() => setPicked((p) => on ? p.filter((x) => x !== m.memberId) : [...p, m.memberId])}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      on ? "border-[#F3E28D]/40 bg-[#F3E28D]/15 text-[#F3E28D]"
                         : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                    }`}
                  >
                    {nameById.get(m.memberId) ?? "Unknown"}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="primary" onClick={create} disabled={!title.trim() || picked.length === 0}>
                Assign
              </Btn>
              <Btn variant="ghost" onClick={reset}>Cancel</Btn>
              {picked.length === 0 && (
                <span className="text-[11px] text-white/30">Pick at least one person.</span>
              )}
            </div>
          </div>
        ) : (
          <Btn variant="primary" className="mb-4" onClick={() => setComposing(true)}>+ New assignment</Btn>
        )
      )}

      {all === null ? null : items.length === 0 ? (
        <Empty message={showDone ? "Nothing here yet." : "No open assignments."} />
      ) : (
        <div className="divide-y divide-white/5 rounded-lg border border-white/10">
          {items.map((a) => {
            const names = a.assignedMemberIds.map((id) => nameById.get(id) ?? "Unknown");
            const overdue = a.status !== "Done" && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10);
            const isMine = !!myId && a.assignedMemberIds.includes(myId);
            return (
              <div key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#F3E28D]"
                  checked={a.status === "Done"}
                  disabled={!canEdit && !isMine}
                  onChange={(e) => void completePodAssignment(a.id, e.target.checked)}
                  aria-label={`Mark ${a.title} done`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] ${a.status === "Done" ? "text-white/35 line-through" : "text-white/90"}`}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/35">
                    {names.join(", ")}
                    {a.dueDate && (
                      <span className={overdue ? " text-red-400" : ""}> · due {a.dueDate}</span>
                    )}
                    <span> · {a.hours ?? pod.defaultTaskHours}h</span>
                  </p>
                </div>
                {a.status === "Done" && <Badge label="Done" />}
                {canEdit && (
                  <button
                    onClick={() => { if (window.confirm(`Delete "${a.title}"?`)) void deletePodAssignment(a.id); }}
                    className="text-[11px] text-white/25 transition-colors hover:text-red-400"
                    aria-label={`Delete ${a.title}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {doneCount > 0 && (
        <button
          onClick={() => setShowDone((s) => !s)}
          className="mt-3 text-[11px] text-white/35 transition-colors hover:text-white/70"
        >
          {showDone ? "Hide" : "Show"} {doneCount} completed
        </button>
      )}
    </div>
  );
}
