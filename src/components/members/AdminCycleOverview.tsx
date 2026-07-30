"use client";

// Admin overview — active cycle only. Member credit progress + strike alerts.
// Past cycles appear as a compact list at the bottom (activate / edit / delete).

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Btn, Field, Input, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeCycles, subscribeTeam, subscribeAssignments, subscribeAssignmentClaims,
  subscribeMemberCreditAdjustments, subscribeMemberStrikes,
  createCycle, updateCycle, deleteCycle, activateCycleExclusive,
  type Cycle, type TeamMember, type Assignment, type AssignmentClaim,
  type MemberCreditAdjustment, type MemberStrike,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeStrikeCount, computeStrikePoints,
  lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";

const BLANK_CYCLE: Omit<Cycle, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  startDate: "",
  endDate: "",
  active: false,
  pacingPercentPerCheckin: 20,
  creditTargets: {
    baseRequirement: 40,
    promotionTargets: { Analyst: 20, "Senior Analyst": 40, Associate: 60 },
  },
  strikeThresholds: { warning: 0, demotion: 0, reserve: 0 },
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminCycleOverview() {
  const { ask, Dialog } = useConfirm();

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [adjustments, setAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Omit<Cycle, "id" | "createdAt" | "updatedAt">>(BLANK_CYCLE);

  useEffect(() => {
    const unsubs = [
      subscribeCycles(setCycles),
      subscribeTeam(setTeam),
      subscribeAssignments(setAssignments),
      subscribeAssignmentClaims(setClaims),
      subscribeMemberCreditAdjustments(setAdjustments),
      subscribeMemberStrikes(setStrikes),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const inactiveCycles = useMemo(
    () => cycles.filter((c) => !c.active).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || "")),
    [cycles],
  );

  const assignmentCredits = useMemo(() => new Map(assignments.map((a) => [a.id, a.credits])), [assignments]);

  const memberProgress = useMemo(() => {
    if (!activeCycle) return [];
    return team
      .filter((m) => classifyMember(m).status === "participant")
      .map((m) => {
        const cls = classifyMember(m);
        const track = pickPrimaryTrack(m);
        const target = cls.cycleRole ? lookupCreditTarget(activeCycle, track, cls.cycleRole) : 0;
        const mClaims = claims.filter((c) => c.memberId === m.id && c.cycleId === activeCycle.id);
        const mAdj = adjustments.filter((a) => a.memberId === m.id && a.cycleId === activeCycle.id);
        const mStrikes = strikes.filter((s) => s.memberId === m.id && s.cycleId === activeCycle.id);
        const ledger = computeCreditLedger({ claims: mClaims, adjustments: mAdj, assignmentCredits });
        const sp = computeStrikePoints(mStrikes);
        return {
          member: m,
          credits: ledger.total,
          pending: ledger.pending,
          target,
          strikeCount: computeStrikeCount(sp, activeCycle),
          strikePoints: sp,
        };
      })
      .sort((a, b) => b.credits - a.credits);
  }, [activeCycle, team, claims, adjustments, strikes, assignmentCredits]);

  const progressBuckets = useMemo(() => {
    if (!activeCycle || memberProgress.length === 0) return [];
    const base = activeCycle.creditTargets.baseRequirement;
    const t75 = Math.floor(base * 0.75);
    const t50 = Math.floor(base * 0.5);
    const t25 = Math.floor(base * 0.25);
    return [
      {
        label: `${base}+ credits`,
        sublabel: "Target met",
        colorClass: "text-[#F6B78D]",
        bgClass: "bg-[#F6B78D]/8 border-[#F6B78D]/20",
        members: memberProgress.filter((p) => p.credits >= base),
      },
      {
        label: `${t75}–${base - 1}`,
        sublabel: "75% of target",
        colorClass: "text-blue-400",
        bgClass: "bg-blue-500/8 border-blue-500/20",
        members: memberProgress.filter((p) => p.credits >= t75 && p.credits < base),
      },
      {
        label: `${t50}–${t75 - 1}`,
        sublabel: "50% of target",
        colorClass: "text-yellow-400",
        bgClass: "bg-yellow-500/8 border-yellow-500/20",
        members: memberProgress.filter((p) => p.credits >= t50 && p.credits < t75),
      },
      {
        label: `${t25}–${t50 - 1}`,
        sublabel: "25% of target",
        colorClass: "text-orange-400",
        bgClass: "bg-orange-500/8 border-orange-500/20",
        members: memberProgress.filter((p) => p.credits >= t25 && p.credits < t50),
      },
      {
        label: t25 > 0 ? `0–${t25 - 1}` : "0",
        sublabel: "< 25%",
        colorClass: "text-red-400",
        bgClass: "bg-red-500/8 border-red-500/20",
        members: memberProgress.filter((p) => p.credits < t25),
      },
    ];
  }, [activeCycle, memberProgress]);

  const strikeBuckets = useMemo(() => [
    {
      label: "Strike 3 — Reserve",
      colorClass: "text-red-400",
      members: memberProgress.filter((p) => p.strikeCount === 3),
    },
    {
      label: "Strike 2 — Demotion risk",
      colorClass: "text-orange-400",
      members: memberProgress.filter((p) => p.strikeCount === 2),
    },
    {
      label: "Strike 1 — Warning issued",
      colorClass: "text-yellow-400",
      members: memberProgress.filter((p) => p.strikeCount === 1),
    },
  ].filter((b) => b.members.length > 0), [memberProgress]);

  const totalParticipants = memberProgress.length;
  const metTarget = activeCycle
    ? memberProgress.filter((p) => p.credits >= activeCycle.creditTargets.baseRequirement).length
    : 0;
  const avgCredits = totalParticipants > 0
    ? Math.round(memberProgress.reduce((s, p) => s + p.credits, 0) / totalParticipants)
    : 0;

  const handleActivate = async (cycle: Cycle) => {
    await ask(
      async () => activateCycleExclusive(cycle.id, cycles.map((c) => c.id)),
      `Activate "${cycle.name || "untitled cycle"}"? This deactivates any other active cycle.`,
    );
  };

  const handleDelete = async (cycle: Cycle) => {
    const warning = cycle.active ? " This cycle is currently active." : "";
    await ask(
      async () => deleteCycle(cycle.id),
      `Delete "${cycle.name || "untitled cycle"}"?${warning} This cannot be undone.`,
    );
  };

  const submitCreate = async () => {
    if (!createForm.name.trim()) return;
    await createCycle({ ...createForm, name: createForm.name.trim() });
    setCreateForm(BLANK_CYCLE);
    setCreating(false);
  };

  const saveEdit = async () => {
    if (!editingCycle) return;
    await updateCycle(editingCycle.id, {
      name: editingCycle.name,
      startDate: editingCycle.startDate,
      endDate: editingCycle.endDate,
      pacingPercentPerCheckin: editingCycle.pacingPercentPerCheckin,
      creditTargets: editingCycle.creditTargets,
      strikeThresholds: editingCycle.strikeThresholds,
    });
    setEditingCycle(null);
  };

  if (creating) {
    return (
      <MembersLayout>
        <Dialog />
        <CycleEditor
          title="New cycle"
          draft={createForm}
          onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          onCancel={() => { setCreating(false); setCreateForm(BLANK_CYCLE); }}
          onSave={submitCreate}
          saveLabel="Create Cycle"
          activeBadge={false}
        />
      </MembersLayout>
    );
  }

  if (editingCycle) {
    return (
      <MembersLayout>
        <Dialog />
        <CycleEditor
          title={`Editing · ${editingCycle.name || "untitled"}`}
          draft={editingCycle}
          onChange={(patch) => setEditingCycle((prev) => prev ? { ...prev, ...patch } : null)}
          onCancel={() => setEditingCycle(null)}
          onSave={saveEdit}
          saveLabel="Save"
          activeBadge={editingCycle.active}
        />
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Overview"
        subtitle={activeCycle ? `${activeCycle.name} · ${activeCycle.startDate} → ${activeCycle.endDate}` : "No active cycle"}
        action={<Btn variant="primary" onClick={() => setCreating(true)}>+ New Cycle</Btn>}
      />

      {!activeCycle && (
        <Empty
          message="No active cycle. Create one to start running the credit system."
          action={<Btn variant="primary" onClick={() => setCreating(true)}>+ New Cycle</Btn>}
        />
      )}

      {activeCycle && (
        <div className="space-y-5">
          {/* Active cycle header */}
          <div className="rounded-2xl border border-[#F6B78D]/30 bg-[#0F1A12] px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center rounded-full border border-[#F6B78D]/45 bg-[#F6B78D]/12 px-2 py-0.5 text-[10px] font-semibold text-[#F3E28D]">
                  Active
                </span>
                <h2 className="font-display font-bold text-white text-xl">{activeCycle.name}</h2>
              </div>
              <p className="text-white/50 text-sm">
                {activeCycle.startDate} → {activeCycle.endDate}
                <span className="mx-2 text-white/25">·</span>
                <span className="text-white/35">Base requirement: {activeCycle.creditTargets.baseRequirement} credits</span>
                <span className="mx-2 text-white/25">·</span>
                <span className="text-white/35">{activeCycle.pacingPercentPerCheckin}% pacing per check-in</span>
              </p>
              <p className="text-white/30 text-xs mt-1.5">
                Strikes: {activeCycle.strikeThresholds.warning} demerits = warning ·{" "}
                {activeCycle.strikeThresholds.demotion} = demotion ·{" "}
                {activeCycle.strikeThresholds.reserve} = reserve
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Btn size="sm" variant="secondary" onClick={() => setEditingCycle(activeCycle)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => handleDelete(activeCycle)}>Delete</Btn>
            </div>
          </div>

          {/* Summary stats */}
          {totalParticipants > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={totalParticipants} label="Participants" />
              <StatCard value={metTarget} label="Met Target" accent />
              <StatCard value={avgCredits} label="Avg Credits" />
            </div>
          )}

          {/* Progress buckets */}
          {progressBuckets.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-[#13161D] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/8">
                <h3 className="font-display font-semibold text-white text-base">Credit progress</h3>
                <p className="text-white/35 text-xs mt-0.5">All active participants grouped by earnings this cycle</p>
              </div>
              <div className="divide-y divide-white/5">
                {progressBuckets.map((bucket) => (
                  <div key={bucket.label} className="px-5 py-3.5">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className={`text-sm font-bold ${bucket.colorClass}`}>{bucket.label}</span>
                      <span className="text-white/30 text-xs">{bucket.sublabel}</span>
                      <span className="ml-auto text-white/45 text-xs tabular-nums">
                        {bucket.members.length} {bucket.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    {bucket.members.length === 0 ? (
                      <span className="text-white/20 text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {bucket.members.map((p) => (
                          <span key={p.member.id} className="text-xs text-white/65">
                            {p.member.name}
                            <span className="text-white/30 ml-1">
                              ({p.credits}{p.pending > 0 ? ` + ${p.pending} pending` : ""})
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No participants yet */}
          {totalParticipants === 0 && (
            <div className="rounded-2xl border border-white/8 bg-[#13161D] px-5 py-8 text-center">
              <p className="text-white/35 text-sm">No active participants yet for this cycle.</p>
              <p className="text-white/20 text-xs mt-1">Members show here once their role is set to Analyst, Senior Analyst, or Associate.</p>
            </div>
          )}

          {/* Strike alerts */}
          {strikeBuckets.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-[#13161D] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/8">
                <h3 className="font-display font-semibold text-white text-base">Strike alerts</h3>
                <p className="text-white/35 text-xs mt-0.5">Members who have accumulated strikes this cycle</p>
              </div>
              <div className="divide-y divide-white/5">
                {strikeBuckets.map((bucket) => (
                  <div key={bucket.label} className="px-5 py-3.5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-sm font-semibold ${bucket.colorClass}`}>{bucket.label}</span>
                      <span className="ml-auto text-white/45 text-xs tabular-nums">{bucket.members.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {bucket.members.map((p) => (
                        <span key={p.member.id} className="text-xs text-white/65">
                          {p.member.name}
                          <span className="text-white/30 ml-1">
                            ({p.strikePoints} {p.strikePoints === 1 ? "demerit" : "demerits"})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past cycles — compact */}
      {inactiveCycles.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/25 mb-3">Past cycles</p>
          <div className="space-y-2">
            {inactiveCycles.map((cycle) => (
              <div
                key={cycle.id}
                className="rounded-xl border border-white/8 bg-[#13161D] px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-white/65 text-sm font-medium truncate">{cycle.name || "Untitled cycle"}</p>
                  <p className="text-white/30 text-xs">{cycle.startDate} → {cycle.endDate}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Btn size="sm" variant="secondary" onClick={() => handleActivate(cycle)}>Activate</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setEditingCycle(cycle)}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={() => handleDelete(cycle)}>Delete</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </MembersLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#13161D] p-4 text-center">
      <p className={`text-3xl font-display font-bold tabular-nums ${accent ? "text-[#F6B78D]" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/35 mt-1">{label}</p>
    </div>
  );
}

// ── Cycle editor (new + edit) ─────────────────────────────────────────────────

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
  const ct = draft.creditTargets;
  const baseReq = ct.baseRequirement;
  const promoTargets = ct.promotionTargets;

  const setBase = (raw: string) => {
    onChange({
      creditTargets: {
        baseRequirement: Math.max(0, Number(raw) || 0),
        promotionTargets: promoTargets,
      },
    });
  };

  const setPromo = (role: keyof typeof promoTargets, raw: string) => {
    onChange({
      creditTargets: {
        baseRequirement: baseReq,
        promotionTargets: { ...promoTargets, [role]: Math.max(0, Number(raw) || 0) },
      },
    });
  };

  const setThreshold = (key: keyof Cycle["strikeThresholds"], raw: string) => {
    onChange({ strikeThresholds: { ...draft.strikeThresholds, [key]: Math.max(0, Number(raw) || 0) } });
  };

  return (
    <div className={`rounded-2xl border ${activeBadge ? "border-[#F6B78D]/45 bg-[#0F1A12]" : "border-white/15 bg-[#13161D]"} mb-4`}>
      <div className="px-5 py-3 border-b border-white/8 flex items-center gap-3">
        {activeBadge && (
          <span className="inline-flex items-center rounded-full border border-[#F6B78D]/45 bg-[#F6B78D]/12 px-2 py-0.5 text-[10px] font-semibold text-[#F3E28D]">
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
              Default 20%. Drives the pacing dot color thresholds and check-in nudge emails.
            </span>
          </div>
        </Field>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Credit targets</p>
          <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
            Every member must earn the base requirement each quarter. Extra credits beyond the base count toward promotion consideration.
          </p>
          <div className="rounded-xl border border-white/10 bg-[#0F1014] p-3 space-y-3">
            <Field label="Base requirement (credits to complete the cycle)">
              <Input
                type="number"
                min="0"
                value={String(baseReq)}
                onChange={(e) => setBase(e.target.value)}
                className="max-w-[120px]"
              />
            </Field>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-white/35">Additional credits for promotion consideration</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Analyst → Sr Analyst">
                <Input
                  type="number"
                  min="0"
                  value={String(promoTargets.Analyst)}
                  onChange={(e) => setPromo("Analyst", e.target.value)}
                />
              </Field>
              <Field label="Sr Analyst → Associate">
                <Input
                  type="number"
                  min="0"
                  value={String(promoTargets["Senior Analyst"])}
                  onChange={(e) => setPromo("Senior Analyst", e.target.value)}
                />
              </Field>
              <Field label="Associate → next tier">
                <Input
                  type="number"
                  min="0"
                  value={String(promoTargets.Associate)}
                  onChange={(e) => setPromo("Associate", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Strike thresholds (demerits)</p>
          <p className="text-[11px] text-white/55 mb-3 leading-relaxed">
            Members accumulate demerits from infractions. Each level triggers an action:
            <br />
            • <span className="text-yellow-300">1st strike</span> — warning email.
            <br />
            • <span className="text-orange-300">2nd strike</span> — auto-demotion (Associate → Sr Analyst, Sr Analyst → Analyst, Analyst → Reserve).
            <br />
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

