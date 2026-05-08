"use client";

// Admin page A1 — Cycles. One cycle per quarter. Active cycle is pinned at the
// top in expanded edit mode; older cycles collapse below as one-line summaries.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ADMIN_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Field, Input, TextArea, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeCycles, createCycle, updateCycle, deleteCycle, activateCycleExclusive,
  type Cycle, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];

// Sensible starting point for a fresh cycle. Targets are placeholders the admin
// will tune; pacing default of 20% mirrors the spec (6 biweekly check-ins, 100%
// reachable by check-in 5 with the 6th as buffer).
const BLANK_CYCLE: Omit<Cycle, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  startDate: "",
  endDate: "",
  active: false,
  pacingPercentPerCheckin: 20,
  creditTargets: {
    Tech:      { Analyst: 10, "Senior Analyst": 14, Associate: 18 },
    Marketing: { Analyst: 10, "Senior Analyst": 14, Associate: 18 },
    Finance:   { Analyst: 10, "Senior Analyst": 14, Associate: 18 },
  },
  strikeThresholds: { warning: 5, demotion: 10, reserve: 15 },
  autoDemote: { Analyst: true, "Senior Analyst": true, Associate: true },
  crossTrackCountsTowardTarget: true,
  notes: "",
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return "No dates set";
  return `${start || "?"} → ${end || "?"}`;
}

function daysBetween(a: string, b: string): number | null {
  const aMs = Date.parse(a);
  const bMs = Date.parse(b);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return null;
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24));
}

export default function CyclesPage() {
  const { authRole, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [cycles, setCycles] = useState<Cycle[]>([]);
  // editing state keyed by cycle id; null entry = not editing.
  const [editing, setEditing] = useState<Record<string, Cycle>>({});
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Omit<Cycle, "id" | "createdAt" | "updatedAt">>(BLANK_CYCLE);
  // Older cycles collapse by default; expanded set tracks which to show full.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeCycles(setCycles), []);

  // Active cycle pinned at top; remaining cycles ordered by startDate desc so
  // the most recent past cycle sits closest to the active card.
  const sortedCycles = useMemo(() => {
    const active = cycles.filter((c) => c.active);
    const inactive = cycles
      .filter((c) => !c.active)
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    return [...active, ...inactive];
  }, [cycles]);

  const isEditing = (id: string) => Boolean(editing[id]);
  const startEdit = (cycle: Cycle) => setEditing((prev) => ({ ...prev, [cycle.id]: { ...cycle } }));
  const cancelEdit = (id: string) =>
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const patchEdit = (id: string, patch: Partial<Cycle>) =>
    setEditing((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev));

  const saveEdit = async (id: string) => {
    const draft = editing[id];
    if (!draft) return;
    await updateCycle(id, {
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      pacingPercentPerCheckin: draft.pacingPercentPerCheckin,
      creditTargets: draft.creditTargets,
      strikeThresholds: draft.strikeThresholds,
      autoDemote: draft.autoDemote,
      crossTrackCountsTowardTarget: draft.crossTrackCountsTowardTarget,
      notes: draft.notes,
    });
    cancelEdit(id);
  };

  const handleActivate = async (cycle: Cycle) => {
    const allIds = cycles.map((c) => c.id);
    await ask(
      async () => {
        await activateCycleExclusive(cycle.id, allIds);
      },
      `Activate “${cycle.name || "untitled cycle"}”? This will deactivate any other active cycle.`,
    );
  };

  const handleDelete = async (cycle: Cycle) => {
    await ask(
      async () => deleteCycle(cycle.id),
      `Delete “${cycle.name || "untitled cycle"}”? This cannot be undone.`,
    );
  };

  const submitCreate = async () => {
    const trimmedName = createForm.name.trim();
    if (!trimmedName) return;
    await createCycle({ ...createForm, name: trimmedName });
    setCreateForm(BLANK_CYCLE);
    setCreating(false);
  };

  if (loading || authRole !== "admin") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ADMIN_GROUP_TABS} />

      <PageHeader
        title="Cycles"
        subtitle="Define quarterly credit targets, pacing, and strike thresholds. Exactly one cycle is active at a time."
        action={
          <Btn variant="primary" onClick={() => setCreating(true)}>
            + New Cycle
          </Btn>
        }
      />

      {creating && (
        <CycleEditor
          title="New cycle"
          draft={createForm}
          onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          onCancel={() => { setCreating(false); setCreateForm(BLANK_CYCLE); }}
          onSave={submitCreate}
          saveLabel="Create Cycle"
          activeBadge={false}
        />
      )}

      <div className="space-y-4">
        {sortedCycles.map((cycle) => {
          const expanded = cycle.active || expandedIds.has(cycle.id) || isEditing(cycle.id);
          if (isEditing(cycle.id)) {
            const draft = editing[cycle.id];
            return (
              <CycleEditor
                key={cycle.id}
                title={`Editing · ${cycle.name || "untitled"}`}
                draft={draft}
                onChange={(patch) => patchEdit(cycle.id, patch)}
                onCancel={() => cancelEdit(cycle.id)}
                onSave={() => saveEdit(cycle.id)}
                saveLabel="Save"
                activeBadge={cycle.active}
              />
            );
          }
          return (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              expanded={expanded}
              onToggle={() => {
                if (cycle.active) return; // active card stays expanded
                setExpandedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(cycle.id)) next.delete(cycle.id);
                  else next.add(cycle.id);
                  return next;
                });
              }}
              onEdit={() => startEdit(cycle)}
              onActivate={() => handleActivate(cycle)}
              onDelete={() => handleDelete(cycle)}
            />
          );
        })}

        {sortedCycles.length === 0 && !creating && (
          <Empty
            message="No cycles yet. Create one to start running the credit system."
            action={<Btn variant="primary" onClick={() => setCreating(true)}>+ New Cycle</Btn>}
          />
        )}
      </div>
    </MembersLayout>
  );
}

// ── Card components ───────────────────────────────────────────────────────────

function CycleCard({
  cycle,
  expanded,
  onToggle,
  onEdit,
  onActivate,
  onDelete,
}: {
  cycle: Cycle;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const span = daysBetween(cycle.startDate, cycle.endDate);
  return (
    <div className={`rounded-2xl border ${cycle.active ? "border-[#85CC17]/45 bg-[#0F1A12]" : "border-white/10 bg-[#13161D]"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
        disabled={cycle.active}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {cycle.active && (
            <span className="inline-flex items-center rounded-full border border-[#85CC17]/45 bg-[#85CC17]/12 px-2 py-0.5 text-[10px] font-semibold text-[#9BE22B] flex-shrink-0">
              Active
            </span>
          )}
          <h2 className="font-display font-bold text-white text-lg truncate">{cycle.name || "Untitled cycle"}</h2>
          <span className="text-white/45 text-xs truncate">
            {formatDateRange(cycle.startDate, cycle.endDate)}
            {span !== null && span > 0 ? ` · ${span} days` : ""}
          </span>
        </div>
        {!cycle.active && (
          <span className="text-white/30 text-xs flex-shrink-0">{expanded ? "Collapse" : "Expand"}</span>
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-white/8">
          <CycleSummary cycle={cycle} />
          <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/8">
            <Btn size="sm" variant="primary" onClick={onEdit}>Edit</Btn>
            {!cycle.active && (
              <Btn size="sm" variant="secondary" onClick={onActivate}>Activate</Btn>
            )}
            {!cycle.active && (
              <Btn size="sm" variant="danger" onClick={onDelete}>Delete</Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CycleSummary({ cycle }: { cycle: Cycle }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4 text-sm">
      <SummaryBlock title="Pacing">
        <p className="text-white/70">
          Members should aim for{" "}
          <span className="text-[#85CC17]">{cycle.pacingPercentPerCheckin}%</span> of their target every 2 weeks.
        </p>
        <p className="text-white/45 text-xs mt-1">
          Cross-track work {cycle.crossTrackCountsTowardTarget ? "counts toward" : "does not count toward"} the primary-track target.
        </p>
      </SummaryBlock>

      <SummaryBlock title="Strike thresholds">
        <p className="text-white/70">
          Warning at <span className="text-[#85CC17]">{cycle.strikeThresholds.warning}</span> ·
          Demotion at <span className="text-[#85CC17]"> {cycle.strikeThresholds.demotion}</span> ·
          Reserve at <span className="text-[#85CC17]"> {cycle.strikeThresholds.reserve}</span>
        </p>
        <p className="text-white/45 text-xs mt-1">
          Auto-demote on demotion threshold:{" "}
          {ROLES.filter((r) => cycle.autoDemote[r]).join(", ") || "none"}
        </p>
      </SummaryBlock>

      <SummaryBlock title="Credit targets">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40">
                <th className="text-left font-normal pr-3 pb-1">Track</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-right font-normal px-2 pb-1">{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((track) => (
                <tr key={track} className="border-t border-white/5">
                  <td className="text-white/70 py-1 pr-3">{track}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="text-right text-[#85CC17] py-1 px-2">
                      {cycle.creditTargets[track][role]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SummaryBlock>

      {cycle.notes && (
        <SummaryBlock title="Notes" className="md:col-span-2 lg:col-span-3">
          <p className="text-white/70 whitespace-pre-line">{cycle.notes}</p>
        </SummaryBlock>
      )}
    </div>
  );
}

function SummaryBlock({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-[#0F1014] p-3.5 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-1.5">{title}</p>
      {children}
    </div>
  );
}

// ── Editor (used for both new + edit) ─────────────────────────────────────────

function CycleEditor({
  title,
  draft,
  onChange,
  onCancel,
  onSave,
  saveLabel,
  activeBadge,
}: {
  title: string;
  draft: Omit<Cycle, "id" | "createdAt" | "updatedAt"> & { id?: string };
  onChange: (patch: Partial<Cycle>) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saveLabel: string;
  activeBadge: boolean;
}) {
  const setTarget = (track: CycleTrack, role: CycleRole, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    onChange({
      creditTargets: {
        ...draft.creditTargets,
        [track]: { ...draft.creditTargets[track], [role]: value },
      },
    });
  };

  const setThreshold = (key: keyof Cycle["strikeThresholds"], raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    onChange({ strikeThresholds: { ...draft.strikeThresholds, [key]: value } });
  };

  const toggleAutoDemote = (role: CycleRole) => {
    onChange({ autoDemote: { ...draft.autoDemote, [role]: !draft.autoDemote[role] } });
  };

  return (
    <div className={`rounded-2xl border ${activeBadge ? "border-[#85CC17]/45 bg-[#0F1A12]" : "border-white/15 bg-[#13161D]"} mb-4`}>
      <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3">
        {activeBadge && (
          <span className="inline-flex items-center rounded-full border border-[#85CC17]/45 bg-[#85CC17]/12 px-2 py-0.5 text-[10px] font-semibold text-[#9BE22B]">
            Active
          </span>
        )}
        <h2 className="font-display font-bold text-white text-base">{title}</h2>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Cycle name" required>
            <Input
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Summer 2026"
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={draft.startDate || ""}
              onChange={(e) => onChange({ startDate: e.target.value })}
              placeholder={todayISO()}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={draft.endDate || ""}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Pacing — % of target per biweekly check-in">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              max="100"
              value={String(draft.pacingPercentPerCheckin)}
              onChange={(e) => onChange({ pacingPercentPerCheckin: Math.max(1, Math.min(100, Number(e.target.value) || 0)) })}
              className="max-w-[120px]"
            />
            <span className="text-white/45 text-xs">
              Default 20%. Drives the dashboard nudge and the activity dot color thresholds.
            </span>
          </div>
        </Field>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Credit targets</p>
          <div className="rounded-xl border border-white/10 bg-[#0F1014] p-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs">
                  <th className="text-left font-normal pr-3 pb-1.5">Track</th>
                  {ROLES.map((role) => (
                    <th key={role} className="text-right font-normal px-2 pb-1.5">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRACKS.map((track) => (
                  <tr key={track} className="border-t border-white/5">
                    <td className="text-white/70 py-1.5 pr-3">{track}</td>
                    {ROLES.map((role) => (
                      <td key={role} className="px-1 py-1">
                        <input
                          type="number"
                          min="0"
                          value={String(draft.creditTargets[track][role])}
                          onChange={(e) => setTarget(track, role, e.target.value)}
                          className="w-20 ml-auto block bg-[#11141A] border border-white/10 rounded-md px-2 py-1 text-right text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-white/40 mt-1.5">
            Senior Associate and Board are intentionally excluded — they run the system rather than participate in it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Warning threshold (points)">
            <Input
              type="number"
              min="0"
              value={String(draft.strikeThresholds.warning)}
              onChange={(e) => setThreshold("warning", e.target.value)}
            />
          </Field>
          <Field label="Demotion threshold (points)">
            <Input
              type="number"
              min="0"
              value={String(draft.strikeThresholds.demotion)}
              onChange={(e) => setThreshold("demotion", e.target.value)}
            />
          </Field>
          <Field label="Reserve threshold (points)">
            <Input
              type="number"
              min="0"
              value={String(draft.strikeThresholds.reserve)}
              onChange={(e) => setThreshold("reserve", e.target.value)}
            />
          </Field>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Auto-demote on demotion threshold</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => {
              const on = draft.autoDemote[role];
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleAutoDemote(role)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    on
                      ? "border-[#85CC17]/45 bg-[#85CC17]/10 text-[#9BE22B]"
                      : "border-white/15 bg-[#11141A] text-white/65 hover:border-white/35"
                  }`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-[#85CC17]" : "bg-white/30"}`} />
                  {role}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-white/40 mt-1.5">
            Senior Associate and Board are handled case-by-case and do not auto-demote.
          </p>
        </div>

        <Field label="Cross-track credits">
          <label className="inline-flex items-center gap-2.5 text-sm text-white/80 rounded-lg border border-white/10 bg-[#11141A] px-3 py-2">
            <input
              type="checkbox"
              className="members-checkbox"
              checked={draft.crossTrackCountsTowardTarget}
              onChange={(e) => onChange({ crossTrackCountsTowardTarget: e.target.checked })}
            />
            Cross-track work counts toward primary-track target
          </label>
        </Field>

        <Field label="Notes">
          <TextArea
            rows={3}
            value={draft.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Optional context for this cycle (e.g. test run, summer pacing, etc.)"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void onSave()} disabled={!draft.name.trim()}>
            {saveLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
