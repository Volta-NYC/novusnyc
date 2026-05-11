"use client";

// Right-side drawer for the team directory. Shows everything an admin needs to
// know about a single member's credit-system standing and lets them issue
// strikes, adjust credits, change role, move to Reserve, or clear strikes.
//
// Lives outside the team page itself so the page doesn't balloon further; the
// page just sets a `manageMember` state and renders this component.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  subscribeAssignmentClaims, subscribeAssignments, subscribeCycles,
  subscribeMemberCreditAdjustments, subscribeMemberStrikes,
  deleteMemberStrike, clearMemberStrikes,
  createMemberCreditAdjustment, updateTeamMember,
  type Assignment, type AssignmentClaim, type Cycle,
  type MemberCreditAdjustment, type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeDot, computeStrikeCount,
  computeStrikePoints, lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";
import { Btn, Field, Input, TextArea, Select } from "@/components/members/ui";

const ROLES_LADDER = ["Analyst", "Senior Analyst", "Associate", "Senior Associate", "Board"] as const;
const STATUS_OPTIONS = ["Active", "On Leave", "Alumni", "Inactive", "Reserve"] as const;

const DOT_HEX: Record<string, string> = {
  green: "#16A34A",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#DC2626",
  gray: "#9CA3AF",
};

interface Props {
  member: TeamMember | null;
  reviewerLabel: string;
  onClose: () => void;
}

export default function MemberDrawer({ member, reviewerLabel, onClose }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [adjustments, setAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [roleOverride, setRoleOverride] = useState("");
  const [statusOverride, setStatusOverride] = useState("");

  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeMemberStrikes(setStrikes), []);
  useEffect(() => subscribeMemberCreditAdjustments(setAdjustments), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeAssignments(setAssignments), []);

  // Sync local override state with the live member when one is opened.
  useEffect(() => {
    setRoleOverride(member?.role ?? "");
    setStatusOverride(member?.status ?? "Active");
  }, [member?.id, member?.role, member?.status]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const memberStrikes = useMemo(
    () => member ? strikes.filter((s) => s.memberId === member.id && (!activeCycle || s.cycleId === activeCycle.id)) : [],
    [strikes, member, activeCycle],
  );
  const memberAdjustments = useMemo(
    () => member ? adjustments.filter((a) => a.memberId === member.id && (!activeCycle || a.cycleId === activeCycle.id)) : [],
    [adjustments, member, activeCycle],
  );
  const memberClaims = useMemo(
    () => member ? claims.filter((c) => c.memberId === member.id && (!activeCycle || c.cycleId === activeCycle.id)) : [],
    [claims, member, activeCycle],
  );

  const ledger = useMemo(() => {
    const credits = new Map<string, number>();
    for (const a of assignments) credits.set(a.id, a.credits);
    return computeCreditLedger({
      claims: memberClaims,
      adjustments: memberAdjustments,
      assignmentCredits: credits,
    });
  }, [assignments, memberClaims, memberAdjustments]);

  const classification = member ? classifyMember(member) : null;
  const primaryTrack = member ? pickPrimaryTrack(member) : null;
  const targetCredits =
    member && activeCycle && classification?.cycleRole && primaryTrack
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;

  const strikePoints = computeStrikePoints(memberStrikes);
  const strikeCount = activeCycle ? computeStrikeCount(strikePoints, activeCycle) : 0;

  const dot = member
    ? computeDot({
        cycle: activeCycle,
        member,
        earnedCredits: ledger.total,
        targetCredits,
        hasAnyClaims: memberClaims.length > 0,
      })
    : null;

  if (!member) return null;

  const handleAdjustCredits = async () => {
    if (!activeCycle) return;
    const points = Number(adjustPoints);
    if (!Number.isFinite(points) || points === 0) return;
    if (!adjustReason.trim()) return;
    await createMemberCreditAdjustment({
      memberId: member.id,
      memberName: member.name,
      cycleId: activeCycle.id,
      points,
      reason: adjustReason.trim(),
      createdBy: reviewerLabel,
    });
    setAdjustOpen(false);
    setAdjustPoints("");
    setAdjustReason("");
  };

  const handleRevokeStrike = async (id: string) => {
    if (!confirm("Revoke this strike? It is removed from the member's record.")) return;
    await deleteMemberStrike(id);
  };

  const handleClearStrikes = async () => {
    if (memberStrikes.length === 0) return;
    if (!confirm(`Clear all ${memberStrikes.length} strikes for this cycle?`)) return;
    await clearMemberStrikes(memberStrikes.map((s) => s.id));
  };

  const handleSaveOverrides = async () => {
    const patch: Record<string, unknown> = {};
    if (roleOverride && roleOverride !== member.role) patch.role = roleOverride;
    if (statusOverride && statusOverride !== member.status) patch.status = statusOverride;
    if (Object.keys(patch).length === 0) return;
    await updateTeamMember(member.id, patch as Parameters<typeof updateTeamMember>[1]);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <aside className="fixed top-0 right-0 z-50 h-full w-full md:w-[480px] bg-[#13161D] border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#13161D] border-b border-white/8 px-5 py-3 flex items-center justify-between">
          <h2 className="font-display font-bold text-white text-base">{member.name}</h2>
          <button onClick={onClose} className="text-white/55 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity + dot */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <div className="flex items-center gap-3">
              {dot && (
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: DOT_HEX[dot.color] }}
                  title={dot.label}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/85">{member.role}{primaryTrack ? ` · ${primaryTrack}` : ""}</p>
                <p className="text-xs text-white/55 truncate">{member.email}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">{member.status}</span>
            </div>
          </section>

          {/* Cycle stats */}
          {activeCycle && classification?.status === "participant" && (
            <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-2">
                {activeCycle.name}
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[#85CC17] text-2xl font-bold">{ledger.total}</p>
                  <p className="text-[10px] text-white/45">earned</p>
                </div>
                <div>
                  <p className="text-yellow-300 text-2xl font-bold">{ledger.pending}</p>
                  <p className="text-[10px] text-white/45">pending</p>
                </div>
                <div>
                  <p className="text-white/85 text-2xl font-bold">{targetCredits}</p>
                  <p className="text-[10px] text-white/45">target</p>
                </div>
              </div>
              {dot && (
                <p className="text-xs text-white/55 mt-2 text-center">
                  {dot.label}{dot.checkInsBehind > 0 ? ` · ${dot.checkInsBehind} behind` : ""}
                </p>
              )}
            </section>
          )}

          {classification?.status === "leadership" && (
            <p className="text-xs text-white/55">This member is on leadership and outside the credit system.</p>
          )}
          {classification?.status === "reserve" && (
            <p className="text-xs text-white/55">This member is on Reserve / Inactive — gray dot, no automation.</p>
          )}

          {/* Strikes */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Strikes</p>
              <span className="text-xs text-white/55">{strikePoints} pts · {strikeCount} of 3</span>
            </div>
            {memberStrikes.length === 0 ? (
              <p className="text-xs text-white/45">No strikes this cycle.</p>
            ) : (
              <ul className="space-y-2">
                {memberStrikes
                  .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""))
                  .map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="text-white/85">{s.infractionName}</p>
                        <p className="text-white/45">
                          {new Date(s.issuedAt).toLocaleDateString()} · {s.source === "auto_pace" ? "auto" : s.issuedBy}
                        </p>
                        {s.note && <p className="text-white/65 mt-0.5">{s.note}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[#85CC17] font-mono">{s.points} pts</span>
                        <button
                          type="button"
                          onClick={() => void handleRevokeStrike(s.id)}
                          className="text-[10px] text-red-300/70 hover:text-red-200"
                        >
                          revoke
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/8">
              <Link
                href={`/members/team/infractions?memberId=${encodeURIComponent(member.id)}&memberName=${encodeURIComponent(member.name ?? "")}`}
                className="inline-flex items-center rounded-lg border border-[#85CC17]/40 bg-[#85CC17]/10 px-2.5 py-1 text-xs font-medium text-[#85CC17] hover:bg-[#85CC17]/20 transition-colors"
              >
                Issue infraction →
              </Link>
              {memberStrikes.length > 0 && (
                <Btn size="sm" variant="danger" onClick={() => void handleClearStrikes()}>
                  Clear all
                </Btn>
              )}
            </div>
          </section>

          {/* Credit adjustments */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Credit adjustments</p>
              <span className="text-xs text-white/55">{ledger.adjustments >= 0 ? "+" : ""}{ledger.adjustments}</span>
            </div>
            {memberAdjustments.length === 0 ? (
              <p className="text-xs text-white/45">No manual adjustments.</p>
            ) : (
              <ul className="space-y-1.5">
                {memberAdjustments
                  .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                  .map((a) => (
                    <li key={a.id} className="flex items-start justify-between text-xs">
                      <div className="min-w-0">
                        <p className="text-white/85">{a.reason || "(no reason)"}</p>
                        <p className="text-white/45">{new Date(a.createdAt).toLocaleDateString()} · {a.createdBy}</p>
                      </div>
                      <span className={`font-mono flex-shrink-0 ${a.points >= 0 ? "text-[#85CC17]" : "text-red-300"}`}>
                        {a.points >= 0 ? "+" : ""}{a.points}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
            <Btn size="sm" variant="secondary" className="mt-3" onClick={() => setAdjustOpen(true)} disabled={!activeCycle}>
              Adjust credits
            </Btn>
          </section>

          {/* Role + status overrides */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-3">Overrides</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Role">
                <select
                  value={roleOverride}
                  onChange={(e) => setRoleOverride(e.target.value)}
                  className="w-full bg-[#0F1014] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
                >
                  {ROLES_LADDER.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <Select
                  options={[...STATUS_OPTIONS]}
                  value={statusOverride}
                  onChange={(e) => setStatusOverride(e.target.value)}
                />
              </Field>
            </div>
            <Btn size="sm" variant="primary" className="mt-3" onClick={() => void handleSaveOverrides()}>
              Save overrides
            </Btn>
          </section>

          {/* Recent claims */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-2">Active cycle claims</p>
            {memberClaims.length === 0 ? (
              <p className="text-xs text-white/45">No assignments claimed this cycle.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {memberClaims
                  .sort((a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""))
                  .map((c) => {
                    const a = assignments.find((x) => x.id === c.assignmentId);
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="text-white/80 truncate">{a?.title ?? "—"}</span>
                        <span className="text-white/45 text-[10px] uppercase tracking-wider flex-shrink-0">
                          {c.status.replace("_", " ")}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>
        </div>
      </aside>

      {/* Adjust credits modal */}
      {adjustOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setAdjustOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#13161D] border border-white/10 p-5">
            <h3 className="font-display font-bold text-white text-lg mb-3">Adjust credits</h3>
            <p className="text-xs text-white/55 mb-3">Use a negative value to remove credits. Always include a reason.</p>
            <Field label="Points (±)" required>
              <Input
                type="number"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="e.g. 3 or -2"
              />
            </Field>
            <Field label="Reason" required>
              <TextArea rows={3} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/8">
              <Btn variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={() => void handleAdjustCredits()}
                disabled={!adjustReason.trim() || !adjustPoints.trim() || Number(adjustPoints) === 0}
              >
                Apply
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
