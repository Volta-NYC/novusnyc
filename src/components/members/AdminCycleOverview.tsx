"use client";

// Admin overview. One quarterly cycle drives the entire
// credit/strike system. Active cycle pinned at top in expanded inline-edit mode;
// older cycles collapse below. Targets, pacing, and strike thresholds are
// fully editable post-creation.

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Btn, Field, Input, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeCycles, createCycle, updateCycle, deleteCycle, activateCycleExclusive,
  type Cycle, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";

const TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];

// Default starting point for a fresh cycle. Targets are placeholders; thresholds
// follow the spec — 1st strike at 3 points (one severe / two majors / three minors),
// 2nd at 6, 3rd at 9.
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
  strikeThresholds: { warning: 3, demotion: 6, reserve: 9 },
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

export default function AdminCycleOverview() {
  const { ask, Dialog } = useConfirm();

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [editing, setEditing] = useState<Record<string, Cycle>>({});
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Omit<Cycle, "id" | "createdAt" | "updatedAt">>(BLANK_CYCLE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => subscribeCycles(setCycles), []);

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

  // Save edits — every cycle field stays editable post-creation (targets,
  // thresholds, dates, pacing). Activation status is managed separately via the
  // dedicated button so the "exactly one active" invariant stays atomic.
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
    });
    cancelEdit(id);
  };

  const handleActivate = async (cycle: Cycle) => {
    const allIds = cycles.map((c) => c.id);
    await ask(
      async () => {
        await activateCycleExclusive(cycle.id, allIds);
      },
      `Activate “${cycle.name || "untitled cycle"}”? This deactivates any other active cycle.`,
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

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Overview"
        subtitle="Quarterly periods that drive credit targets, pacing, and strike thresholds. Exactly one cycle is active at a time. Every field is editable after creation."
        action={<Btn variant="primary" onClick={() => setCreating(true)}>+ New Cycle</Btn>}
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
                if (cycle.active) return;
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
          Bi-weekly check-in reminder emails fire automatically (template editable on the Email page).
        </p>
      </SummaryBlock>

      <SummaryBlock title="Strike thresholds">
        <p className="text-white/70 text-xs leading-relaxed">
          1st strike at <span className="text-[#85CC17]">{cycle.strikeThresholds.warning}</span> pts (warning) ·
          2nd at <span className="text-[#85CC17]"> {cycle.strikeThresholds.demotion}</span> pts (auto-demote
          for Analyst → Reserve, Sr Analyst → Analyst, Associate → Sr Analyst) ·
          3rd at <span className="text-[#85CC17]"> {cycle.strikeThresholds.reserve}</span> pts (Reserve)
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
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Strike thresholds (points)</p>
          <p className="text-[11px] text-white/55 mb-3 leading-relaxed">
            Members accumulate points from infractions. Each level triggers an action:
            <br/>
            • <span className="text-yellow-300">1st strike</span> — warning email.
            <br/>
            • <span className="text-orange-300">2nd strike</span> — auto-demotion (Associate → Sr Analyst, Sr Analyst → Analyst, Analyst → Reserve).
            <br/>
            • <span className="text-red-300">3rd strike</span> — moved to Reserve regardless of role.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="1st strike threshold">
              <Input
                type="number"
                min="0"
                value={String(draft.strikeThresholds.warning)}
                onChange={(e) => setThreshold("warning", e.target.value)}
              />
            </Field>
            <Field label="2nd strike threshold">
              <Input
                type="number"
                min="0"
                value={String(draft.strikeThresholds.demotion)}
                onChange={(e) => setThreshold("demotion", e.target.value)}
              />
            </Field>
            <Field label="3rd strike threshold">
              <Input
                type="number"
                min="0"
                value={String(draft.strikeThresholds.reserve)}
                onChange={(e) => setThreshold("reserve", e.target.value)}
              />
            </Field>
          </div>
        </div>

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
