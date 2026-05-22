"use client";

// Member-facing "My Profile" — XP bar, credit ledger, assignment history, strikes.
// Light theme. Read-only.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignmentClaims, subscribeAssignments, subscribeBusinesses,
  subscribeCycles, subscribeMemberCreditAdjustments, subscribeMemberStrikes, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle,
  type MemberCreditAdjustment, type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeStrikeCount, computeStrikePoints,
  lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

const CLAIM_STATUS_PILL: Record<string, string> = {
  claimed: "bg-blue-100 text-blue-800 border-blue-200",
  "In Progress": "bg-cyan-100 text-cyan-800 border-cyan-200",
  Submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Approved: "bg-violet-100 text-violet-800 border-violet-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

// Deterministic confetti so server/client renders match.
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const CONFETTI_COLORS = ["#85CC17", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#F97316", "#06B6D4"];
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => ({
  left:     seededRand(i * 7 + 0) * 100,
  size:     Math.floor(seededRand(i * 7 + 1) * 7) + 5,
  color:    CONFETTI_COLORS[Math.floor(seededRand(i * 7 + 2) * CONFETTI_COLORS.length)],
  delay:    seededRand(i * 7 + 3) * 0.9,
  duration: 1.3 + seededRand(i * 7 + 4) * 1.2,
  rotate:   Math.floor(seededRand(i * 7 + 5) * 360),
  isCircle: seededRand(i * 7 + 6) > 0.5,
}));

export default function MyRecordPage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [adjustments, setAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeMemberStrikes(setStrikes), []);
  useEffect(() => subscribeMemberCreditAdjustments(setAdjustments), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const cyclesById = useMemo(() => new Map(cycles.map((c) => [c.id, c])), [cycles]);
  const assignmentsById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const myClaims = useMemo(() => me ? claims.filter((c) => c.memberId === me.id) : [], [claims, me]);
  const myStrikes = useMemo(() => me ? strikes.filter((s) => s.memberId === me.id) : [], [strikes, me]);
  const myAdjustments = useMemo(() => me ? adjustments.filter((a) => a.memberId === me.id) : [], [adjustments, me]);

  const myActiveClaims = useMemo(
    () => activeCycle ? myClaims.filter((c) => c.cycleId === activeCycle.id) : [],
    [myClaims, activeCycle],
  );
  const myActiveStrikes = useMemo(
    () => activeCycle ? myStrikes.filter((s) => s.cycleId === activeCycle.id) : [],
    [myStrikes, activeCycle],
  );
  const myActiveAdjustments = useMemo(
    () => activeCycle ? myAdjustments.filter((a) => a.cycleId === activeCycle.id) : [],
    [myAdjustments, activeCycle],
  );

  const ledger = useMemo(() => {
    const credits = new Map<string, number>();
    for (const a of assignments) credits.set(a.id, a.credits);
    return computeCreditLedger({
      claims: myActiveClaims,
      adjustments: myActiveAdjustments,
      assignmentCredits: credits,
    });
  }, [assignments, myActiveClaims, myActiveAdjustments]);

  const classification = me ? classifyMember(me) : null;
  const primaryTrack = me ? pickPrimaryTrack(me) : null;
  const targetCredits =
    me && activeCycle && classification?.cycleRole && primaryTrack
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;

  const strikePoints = computeStrikePoints(myActiveStrikes);
  const strikeCount = activeCycle ? computeStrikeCount(strikePoints, activeCycle) : 0;

  // XP bar calculations
  const earnedPct  = targetCredits > 0 ? Math.min(100, (ledger.total / targetCredits) * 100) : 0;
  const pendingPct = targetCredits > 0 ? Math.min(100 - earnedPct, (ledger.pending / targetCredits) * 100) : 0;
  const isComplete = targetCredits > 0 && ledger.total >= targetCredits;

  // Confetti — fires once when bar first fills.
  const [showConfetti, setShowConfetti] = useState(false);
  const wasCompleteRef = useRef(false);
  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  // Group all-time claims by cycle.
  const claimsByCycle = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of myClaims) {
      const list = map.get(c.cycleId) ?? [];
      list.push(c);
      map.set(c.cycleId, list);
    }
    return map;
  }, [myClaims]);

  const cycleHistory = useMemo(() => {
    const ids = Array.from(claimsByCycle.keys());
    return ids
      .map((id) => cyclesById.get(id))
      .filter((c): c is Cycle => !!c)
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  }, [claimsByCycle, cyclesById]);

  return (
    <MembersLayout>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-1">My Profile</p>
            <h1 className="font-display font-bold text-black text-4xl leading-tight">{me?.name ?? "—"}</h1>
            {me?.role && (
              <p className="text-base text-black/55 font-medium mt-1">{me.role}</p>
            )}
          </div>
          <Link href="/members/work" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
            Browse available work →
          </Link>
        </header>

        {/* ── Active cycle / XP bar ── */}
        {activeCycle ? (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5 relative overflow-hidden">
            {/* Confetti burst */}
            {showConfetti && (
              <div className="absolute inset-x-0 top-0 h-36 overflow-hidden pointer-events-none">
                {CONFETTI_PIECES.map((p, i) => (
                  <div
                    key={i}
                    className="confetti-particle"
                    style={{
                      left: `${p.left}%`,
                      top: "0px",
                      width: p.size,
                      height: p.isCircle ? p.size : p.size * 0.45,
                      backgroundColor: p.color,
                      borderRadius: p.isCircle ? "50%" : "2px",
                      "--cd": `${p.duration}s`,
                      "--cy": `${p.delay}s`,
                      "--cr": `${p.rotate}deg`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}

            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{activeCycle.name}</p>
                <p className="text-xs text-black/45 mt-0.5">{activeCycle.startDate} → {activeCycle.endDate}</p>
              </div>
              {/* Strikes pill */}
              <div className={`rounded-full px-3 py-1 text-xs font-semibold border ${strikeCount >= 3 ? "bg-red-100 text-red-700 border-red-200" : strikeCount >= 2 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-black/5 text-black/50 border-black/10"}`}>
                {strikeCount} / 3 strikes
              </div>
            </div>

            {/* XP bar */}
            {targetCredits > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-black/75">
                    <span className="text-[#5C9911]">{ledger.total}</span>
                    <span className="text-black/35"> / {targetCredits} credits</span>
                  </span>
                  {ledger.pending > 0 && (
                    <span className="text-yellow-700 text-[11px]">+{ledger.pending} pending review</span>
                  )}
                </div>
                <div className="h-5 rounded-full bg-black/8 overflow-hidden flex relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${earnedPct}%`, background: "linear-gradient(90deg, #5C9911, #85CC17)" }}
                  />
                  {pendingPct > 0 && (
                    <div
                      className="h-full rounded-r-full transition-all duration-500"
                      style={{ width: `${pendingPct}%`, background: "repeating-linear-gradient(45deg, #FDE68A, #FDE68A 4px, #FCD34D 4px, #FCD34D 8px)" }}
                    />
                  )}
                </div>
                <p className="text-[10px] text-black/35 mt-1.5">
                  {isComplete
                    ? "🎉 Cycle target reached — our board will review and notify you about promotion soon."
                    : `${targetCredits} credits needed to advance to next rank`}
                </p>
              </>
            ) : (
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-black/35 font-semibold">Earned</p>
                  <p className="font-display font-bold text-2xl text-[#5C9911] tabular-nums">{ledger.total}</p>
                </div>
                {ledger.pending > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-black/35 font-semibold">Pending</p>
                    <p className="font-display font-bold text-2xl text-yellow-700 tabular-nums">{ledger.pending}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <p className="text-sm text-black/45">No cycle is active.</p>
        )}

        {/* ── Strikes — active cycle ── */}
        {activeCycle && myActiveStrikes.length > 0 && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <h2 className="font-display font-bold text-black text-base mb-3">Strikes this cycle</h2>
            <ul className="divide-y divide-black/6">
              {myActiveStrikes
                .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""))
                .map((s) => (
                  <li key={s.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-black/85 font-medium">{s.infractionName}</p>
                      <p className="text-xs text-black/45">
                        {new Date(s.issuedAt).toLocaleDateString()} · issued by {s.issuedBy}
                      </p>
                      {s.note && <p className="text-xs text-black/65 mt-1">{s.note}</p>}
                    </div>
                    <span className="text-[#5C9911] font-mono text-sm flex-shrink-0">{s.points} pts</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* ── Manual credit adjustments ── */}
        {myActiveAdjustments.length > 0 && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <h2 className="font-display font-bold text-black text-base mb-3">Manual credit adjustments</h2>
            <ul className="divide-y divide-black/6">
              {myActiveAdjustments
                .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                .map((a) => (
                  <li key={a.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-black/85">{a.reason || "(no reason)"}</p>
                      <p className="text-xs text-black/45">
                        {new Date(a.createdAt).toLocaleDateString()} · by {a.createdBy}
                      </p>
                    </div>
                    <span className={`font-mono text-sm flex-shrink-0 ${a.points >= 0 ? "text-[#5C9911]" : "text-red-700"}`}>
                      {a.points >= 0 ? "+" : ""}{a.points}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* ── Assignment history ── */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <h2 className="font-display font-bold text-black text-base mb-3">Assignment history</h2>
          {cycleHistory.length === 0 ? (
            <p className="text-sm text-black/45">No assignments claimed yet.</p>
          ) : (
            <div className="space-y-5">
              {cycleHistory.map((cycle) => {
                const list = (claimsByCycle.get(cycle.id) ?? []).sort(
                  (a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""),
                );
                return (
                  <div key={cycle.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{cycle.name}</p>
                      <p className="text-xs text-black/45">{list.length} claim{list.length === 1 ? "" : "s"}</p>
                    </div>
                    <ul className="rounded-lg border border-black/8 divide-y divide-black/6 overflow-hidden">
                      {list.map((c) => {
                        const a = assignmentsById.get(c.assignmentId);
                        const business = a?.businessId ? businessById.get(a.businessId) : undefined;
                        return (
                          <li key={c.id}>
                            <Link
                              href={`/members/work/${c.assignmentId}`}
                              className="block px-3 py-2.5 hover:bg-black/3 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm text-black/85 font-medium truncate">{a?.title ?? "Assignment removed"}</p>
                                  <p className="text-xs text-black/45">
                                    {a?.primaryTrack ?? "—"}
                                    {business?.name && ` · ${business.name}`}
                                    {c.claimedAt && ` · Claimed ${new Date(c.claimedAt).toLocaleDateString()}`}
                                  </p>
                                  {c.status === "rejected" && c.rejectReason && (
                                    <p className="text-xs text-red-700 mt-1">Rejected: {c.rejectReason}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CLAIM_STATUS_PILL[c.status] ?? ""}`}>
                                    {c.status.replace("_", " ")}
                                  </span>
                                  {c.status === "Approved" && (
                                    <span className="text-xs text-[#5C9911] font-mono">+{c.creditsAwarded ?? a?.credits ?? 0} cr</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MembersLayout>
  );
}
