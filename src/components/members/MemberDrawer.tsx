"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  subscribeAssignmentClaims, subscribeAssignments, subscribeCycles,
  subscribeMemberStrikes, subscribeInfractions,
  deleteMemberStrike, clearMemberStrikes,
  createMemberStrike,
  type Assignment, type AssignmentClaim, type Cycle,
  type Infraction, type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeDot, computeStrikeCount,
  computeStrikePoints, lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";
import { Btn, Field, Input, useConfirm } from "@/components/members/ui";

const DOT_HEX: Record<string, string> = {
  green: "#16A34A",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#DC2626",
  gray: "#9CA3AF",
};

const CLAIM_STATUS_CLASS: Record<string, string> = {
  Approved:    "bg-emerald-500/15 text-emerald-300",
  Submitted:   "bg-yellow-500/15 text-yellow-300",
  "In Progress": "bg-blue-500/15 text-blue-300",
  claimed:     "bg-white/10 text-white/55",
  rejected:    "bg-red-500/15 text-red-300",
};

interface Props {
  member: TeamMember | null;
  reviewerLabel: string;
  onClose: () => void;
}

export default function MemberDrawer({ member, reviewerLabel, onClose }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueInfractionId, setIssueInfractionId] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [issuePointsOverride, setIssuePointsOverride] = useState("");
  const [issueStatus, setIssueStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const drawerRef = useRef<HTMLElement>(null);
  const drawerTitleId = useId();
  const onCloseRef = useRef(onClose);
  const memberId = member?.id;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeMemberStrikes(setStrikes), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeInfractions(setInfractions), []);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const memberStrikes = useMemo(
    () => member ? strikes.filter((s) => s.memberId === member.id && (!activeCycle || s.cycleId === activeCycle.id)) : [],
    [strikes, member, activeCycle],
  );
  const memberClaims = useMemo(
    () => member ? claims.filter((c) => c.memberId === member.id && (!activeCycle || c.cycleId === activeCycle.id)) : [],
    [claims, member, activeCycle],
  );

  const sortedInfractions = useMemo(
    () => [...infractions].sort((a, b) => (a.points - b.points) || a.name.localeCompare(b.name)),
    [infractions],
  );

  const ledger = useMemo(() => {
    const credits = new Map<string, number>();
    for (const a of assignments) credits.set(a.id, a.credits);
    return computeCreditLedger({ claims: memberClaims, adjustments: [], assignmentCredits: credits });
  }, [assignments, memberClaims]);

  const classification = member ? classifyMember(member) : null;
  const primaryTrack = member ? pickPrimaryTrack(member) : null;
  const targetCredits =
    member && activeCycle && classification?.cycleRole && primaryTrack
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;

  const strikePoints = computeStrikePoints(memberStrikes);
  const strikeCount = activeCycle ? computeStrikeCount(strikePoints, activeCycle) : 0;

  const dot = member
    ? computeDot({ cycle: activeCycle, member, earnedCredits: ledger.total, targetCredits, hasAnyClaims: memberClaims.length > 0 })
    : null;

  // Weekly (bi-weekly) target: pacingPercentPerCheckin of cycle target
  const weeklyTarget = activeCycle && targetCredits
    ? Math.ceil(targetCredits * (activeCycle.pacingPercentPerCheckin / 100))
    : 0;

  // Claims grouped by status for the assignments section
  const claimsWithAssignment = useMemo(() => {
    return memberClaims
      .map((c) => ({ claim: c, assignment: assignments.find((a) => a.id === c.assignmentId) ?? null }))
      .sort((a, b) => (b.claim.claimedAt ?? "").localeCompare(a.claim.claimedAt ?? ""));
  }, [memberClaims, assignments]);

  // Called before the early return below: hooks cannot sit behind a condition.
  const { ask: askConfirm, Dialog: ConfirmDialog } = useConfirm();

  useEffect(() => {
    if (!memberId) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const timer = window.setTimeout(() => drawer?.querySelector<HTMLElement>('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [memberId]);

  if (!member) return null;

  const handleRevokeStrike = (id: string) => {
    askConfirm(
      async () => { await deleteMemberStrike(id); },
      "Revoke this strike? It is removed from the member's record.",
    );
  };

  const handleClearStrikes = () => {
    if (memberStrikes.length === 0) return;
    askConfirm(
      async () => { await clearMemberStrikes(memberStrikes.map((s) => s.id)); },
      `Clear all ${memberStrikes.length} strikes for this cycle?`,
    );
  };

  const handleIssueStrike = async () => {
    const infraction = sortedInfractions.find((i) => i.id === issueInfractionId);
    if (!infraction || !member || !activeCycle) return;
    setIssueStatus("busy");
    try {
      const points = issuePointsOverride.trim()
        ? Math.max(0, Number(issuePointsOverride) || 0)
        : infraction.points;
      await createMemberStrike({
        memberId: member.id,
        memberName: member.name,
        cycleId: activeCycle.id,
        infractionId: infraction.id,
        infractionName: infraction.name,
        points,
        issuedBy: reviewerLabel,
        note: issueNote.trim(),
        source: "manual",
      });
      setIssueStatus("done");
      setIssueInfractionId("");
      setIssueNote("");
      setIssuePointsOverride("");
    } catch {
      setIssueStatus("error");
    }
  };

  const earnedPct = targetCredits > 0 ? Math.min(100, Math.round((ledger.total / targetCredits) * 100)) : 0;
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, Math.round((ledger.total / weeklyTarget) * 100)) : 0;

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={drawerTitleId} className="fixed top-0 right-0 z-50 h-full w-full md:w-[480px] bg-[#13161D] border-l border-white/10 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#13161D] border-b border-white/8 px-5 py-3 flex items-center justify-between">
          <h2 id={drawerTitleId} className="font-display font-bold text-white text-base">{member.name}</h2>
          <button type="button" aria-label="Close member details" onClick={onClose} className="rounded text-white/55 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <div className="flex items-center gap-3">
              {dot && (
                <span
                  className="inline-block h-3 w-3 rounded-full flex-shrink-0"
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

          {/* Assignments + progress */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-3">
              {activeCycle ? activeCycle.name : "Assignments"}
            </p>

            {activeCycle && classification?.status === "participant" && (
              <div className="space-y-3 mb-4">
                {/* Cycle progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/55">Cycle target</span>
                    <span className="text-white/85 font-mono">{ledger.total} / {targetCredits} credits</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${earnedPct}%`, backgroundColor: earnedPct >= 100 ? "#F6B78D" : earnedPct >= 60 ? "#EAB308" : "#DC2626" }}
                    />
                  </div>
                </div>
                {/* Bi-weekly pace */}
                {weeklyTarget > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/55">Bi-weekly pace ({activeCycle.pacingPercentPerCheckin}%)</span>
                      <span className="text-white/85 font-mono">{ledger.total} / {weeklyTarget} credits</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${weeklyPct}%`, backgroundColor: weeklyPct >= 100 ? "#F6B78D" : weeklyPct >= 60 ? "#EAB308" : "#DC2626" }}
                      />
                    </div>
                  </div>
                )}
                {dot && (
                  <p className="text-xs text-white/45">
                    {dot.label}{dot.checkInsBehind > 0 ? ` · ${dot.checkInsBehind} check-in${dot.checkInsBehind === 1 ? "" : "s"} behind` : ""}
                  </p>
                )}
              </div>
            )}

            {claimsWithAssignment.length === 0 ? (
              <p className="text-xs text-white/45">No assignments claimed this cycle.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {claimsWithAssignment.map(({ claim, assignment: a }) => (
                  <li key={claim.id} className="flex items-center justify-between gap-2">
                    <span className="text-white/80 truncate">{a?.title ?? "—"}</span>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CLAIM_STATUS_CLASS[claim.status] ?? "bg-white/10 text-white/55"}`}>
                      {claim.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Strikes + Issue infraction */}
          <section className="rounded-xl border border-white/10 bg-[#0F1014] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Infractions this cycle</p>
              <span className="text-xs text-white/55">{strikePoints} pts · strike {strikeCount} of 3</span>
            </div>

            {memberStrikes.length === 0 ? (
              <p className="text-xs text-white/45 mb-3">No infractions issued this cycle.</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {memberStrikes
                  .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""))
                  .map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="text-white/85 font-medium">{s.infractionName}</p>
                        <p className="text-white/45">
                          {new Date(s.issuedAt).toLocaleDateString()} · {s.source === "auto_pace" ? "auto" : s.issuedBy}
                        </p>
                        {s.note && <p className="text-white/60 mt-0.5 italic">{s.note}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[#F6B78D] font-mono text-[11px]">{s.points} {s.points === 1 ? "demerit" : "demerits"}</span>
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

            <div className="pt-3 border-t border-white/8 space-y-2">
              {!issueOpen ? (
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" variant="secondary" onClick={() => { setIssueOpen(true); setIssueStatus("idle"); }} disabled={!activeCycle}>
                    Issue infraction
                  </Btn>
                  {memberStrikes.length > 0 && (
                    <Btn size="sm" variant="danger" onClick={() => void handleClearStrikes()}>Clear all</Btn>
                  )}
                  {!activeCycle && <span className="text-[11px] text-white/40 self-center">No active cycle</span>}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label="Infraction" required>
                    <select
                      value={issueInfractionId}
                      onChange={(e) => { setIssueInfractionId(e.target.value); setIssueStatus("idle"); }}
                      className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F6B78D]/45"
                    >
                      <option value="">— Select infraction —</option>
                      {sortedInfractions.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.points} {i.points === 1 ? "demerit" : "demerits"})</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Demerits override (optional)">
                      <Input
                        type="number"
                        min="0"
                        value={issuePointsOverride}
                        onChange={(e) => setIssuePointsOverride(e.target.value)}
                        placeholder={sortedInfractions.find((i) => i.id === issueInfractionId)?.points?.toString() ?? "default"}
                      />
                    </Field>
                    <Field label="Note (optional)">
                      <Input
                        value={issueNote}
                        onChange={(e) => setIssueNote(e.target.value)}
                        placeholder="Context…"
                      />
                    </Field>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn
                      size="sm"
                      variant="primary"
                      disabled={!issueInfractionId || issueStatus === "busy"}
                      onClick={() => void handleIssueStrike()}
                    >
                      {issueStatus === "busy" ? "Issuing…" : "Issue"}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setIssueOpen(false); setIssueStatus("idle"); }}>Cancel</Btn>
                    {issueStatus === "done" && <span className="text-xs text-emerald-400">✓ Issued</span>}
                    {issueStatus === "error" && <span className="text-xs text-red-400">Failed — try again</span>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
      <ConfirmDialog />
    </>
  );
}
