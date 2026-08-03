"use client";

// Member Overview — XP bar, organized active-cycle assignments, credit history.
// Light theme. Read-only.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  lookupCreditTarget, lookupPromotionTargets, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

function formatDate(s: string): string {
  const d = new Date(s + (s.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Deterministic confetti so server/client renders match.
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const CONFETTI_COLORS = ["#F6B78D", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#F97316", "#06B6D4"];
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => ({
  left:     seededRand(i * 7 + 0) * 100,
  size:     Math.floor(seededRand(i * 7 + 1) * 7) + 5,
  color:    CONFETTI_COLORS[Math.floor(seededRand(i * 7 + 2) * CONFETTI_COLORS.length)],
  delay:    seededRand(i * 7 + 3) * 0.9,
  duration: 1.3 + seededRand(i * 7 + 4) * 1.2,
  rotate:   Math.floor(seededRand(i * 7 + 5) * 360),
  isCircle: seededRand(i * 7 + 6) > 0.5,
}));

const STATUS_PILL: Record<string, string> = {
  "In Progress": "bg-cyan-100 text-cyan-800 border-cyan-200",
  claimed:       "bg-cyan-100 text-cyan-800 border-cyan-200",
  Submitted:     "bg-amber-100 text-amber-800 border-amber-200",
  Approved:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected:      "bg-red-100 text-red-800 border-red-200",
};

function ClaimRow({ c, a, biz }: { c: AssignmentClaim; a: Assignment | undefined; biz: Business | undefined }) {
  const credits = c.status === "Approved" ? (c.creditsAwarded ?? a?.credits ?? 0) : (a?.credits ?? 0);
  const isRecurring = a?.recurringEnabled;
  const totalEarned = isRecurring && c.status === "In Progress" ? (c.totalCreditsEarned ?? 0) : null;

  return (
    <li>
      <Link href={`/members/work/${c.assignmentId}`} className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-black/[0.025] transition-colors">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black/90 truncate">{a?.title ?? "Assignment removed"}</p>
          <p className="text-xs text-black/45 mt-0.5">
            {biz?.name ?? "Novus"}
            {c.status === "Submitted" && c.submittedAt && (
              <span className="text-black/30"> · Submitted {formatDate(c.submittedAt)}</span>
            )}
            {c.status === "Approved" && c.approvedAt && (
              <span className="text-black/30"> · Approved {formatDate(c.approvedAt)}</span>
            )}
            {(c.status === "In Progress" || c.status === "claimed") && c.dueDate && (
              <span className="text-black/30"> · Due {formatDate(c.dueDate)}</span>
            )}
          </p>
          {c.status === "rejected" && c.rejectReason && (
            <p className="text-xs text-red-600 mt-1 line-clamp-1">Rejected: {c.rejectReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {c.status === "Approved" ? (
            <span className="text-xs font-bold text-[#8B5E48]">
              +{totalEarned != null ? totalEarned : credits} credits
            </span>
          ) : (
            <span className="text-xs text-black/45">{credits} credits</span>
          )}
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[c.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
            {c.status === "claimed" ? "Claimed" : c.status}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function MyRecordPage() {
  const { user, userProfile, authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authRole === "owner" || authRole === "admin") router.replace("/members/projects");
  }, [loading, authRole, router]);
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

  // Organized active-cycle claims
  const myActiveInProgress = useMemo(
    () => myActiveClaims.filter((c) => c.status === "In Progress" || c.status === "claimed"),
    [myActiveClaims],
  );
  const myActiveSubmitted = useMemo(
    () => myActiveClaims.filter((c) => c.status === "Submitted"),
    [myActiveClaims],
  );
  const myActiveApproved = useMemo(
    () => myActiveClaims.filter((c) => c.status === "Approved"),
    [myActiveClaims],
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

  // XP bar — base requirement
  const earnedPct  = targetCredits > 0 ? Math.min(100, (ledger.total / targetCredits) * 100) : 0;
  const pendingPct = targetCredits > 0 ? Math.min(100 - earnedPct, (ledger.pending / targetCredits) * 100) : 0;
  const isComplete = targetCredits > 0 && ledger.total >= targetCredits;

  // Promotion bar — shown after base is complete
  const promotionTargets = activeCycle ? lookupPromotionTargets(activeCycle) : null;
  const promoThreshold = classification?.cycleRole && promotionTargets
    ? (promotionTargets[classification.cycleRole as keyof typeof promotionTargets] ?? 0)
    : 0;
  const extraCredits = isComplete ? Math.max(0, ledger.total - targetCredits) : 0;
  const promoPct = promoThreshold > 0 ? Math.min(100, (extraCredits / promoThreshold) * 100) : 0;
  const promoReached = promoThreshold > 0 && extraCredits >= promoThreshold;

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

  // Past-cycle history (active cycle shown separately above)
  const claimsByCycle = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of myClaims) {
      if (c.cycleId === activeCycle?.id) continue;
      const list = map.get(c.cycleId) ?? [];
      list.push(c);
      map.set(c.cycleId, list);
    }
    return map;
  }, [myClaims, activeCycle]);

  const cycleHistory = useMemo(() => {
    const ids = Array.from(claimsByCycle.keys());
    return ids
      .map((id) => cyclesById.get(id))
      .filter((c): c is Cycle => !!c)
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  }, [claimsByCycle, cyclesById]);

  if (loading || authRole === "owner" || authRole === "admin") return null;

  return (
    <MembersLayout>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-black text-4xl leading-tight">{me?.name ?? "—"}</h1>
            {me?.role && (
              <p className="text-base text-black/55 font-medium mt-1">{me.role}</p>
            )}
          </div>
          <Link href="/members/work" className="text-xs text-[#8B5E48] hover:text-[#F6B78D] font-medium">
            Browse work →
          </Link>
        </header>

        {/* ── Active cycle / XP bar ── */}
        {activeCycle ? (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5 relative overflow-hidden">
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
                <p className="text-xs text-black/45 mt-0.5">
                  {activeCycle.startDate ? formatDate(activeCycle.startDate) : "—"}
                  {" → "}
                  {activeCycle.endDate ? formatDate(activeCycle.endDate) : "—"}
                </p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold border ${strikeCount >= 3 ? "bg-red-100 text-red-700 border-red-200" : strikeCount >= 2 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-black/5 text-black/50 border-black/10"}`}>
                {strikeCount} / 3 strikes
              </div>
            </div>

            {targetCredits > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-black/75">
                    <span className="text-[#8B5E48]">{ledger.total}</span>
                    <span className="text-black/35"> / {targetCredits} credits</span>
                  </span>
                  {ledger.pending > 0 && (
                    <span className="text-yellow-700 text-[11px]">+{ledger.pending} pending review</span>
                  )}
                </div>
                <div className="h-5 rounded-full bg-black/8 overflow-hidden flex relative border border-black/12">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${earnedPct}%`, background: "linear-gradient(90deg, #8B5E48, #F6B78D)" }}
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
                    ? "🎉 Cycle requirement complete!"
                    : `${targetCredits} credits required to complete the cycle`}
                </p>

                {/* Promotion bar — appears once base is complete */}
                {isComplete && promoThreshold > 0 && (
                  <div className="mt-4 pt-4 border-t border-black/8">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-black/75">
                        <span className="text-violet-600">{extraCredits}</span>
                        <span className="text-black/35"> / {promoThreshold} bonus credits</span>
                      </span>
                      <span className="text-[11px] text-violet-600 font-medium">Promotion consideration</span>
                    </div>
                    <div className="h-4 rounded-full bg-black/8 overflow-hidden flex relative border border-black/10">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${promoPct}%`, background: "linear-gradient(90deg, #7C3AED, #A78BFA)" }}
                      />
                    </div>
                    <p className="text-[10px] text-black/35 mt-1.5">
                      {promoReached
                        ? "🌟 Promotion threshold reached — the board will consider you for advancement."
                        : `Earn ${promoThreshold - extraCredits} more beyond the base to be considered for promotion to the next role.`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-black/75">
                    <span className="text-[#8B5E48]">{ledger.total}</span>
                    <span className="text-black/35"> credits earned</span>
                  </span>
                  {ledger.pending > 0 && (
                    <span className="text-yellow-700 text-[11px]">+{ledger.pending} pending review</span>
                  )}
                </div>
                <div className="h-5 rounded-full bg-black/8 overflow-hidden flex border border-black/12">
                  <div
                    className="h-full rounded-full"
                    style={{ width: ledger.total > 0 ? "100%" : "0%", background: "linear-gradient(90deg, #8B5E48, #F6B78D)" }}
                  />
                </div>
                <p className="text-[10px] text-black/30 mt-1.5">Leadership roles are not subject to cycle credit targets.</p>
              </>
            )}
          </section>
        ) : (
          <p className="text-sm text-black/45">No cycle is active.</p>
        )}

        {/* ── Assignments this cycle ── */}
        {activeCycle && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
              <h2 className="font-display font-bold text-black text-base">Assignments this cycle</h2>
              <Link href="/members/work" className="text-xs text-[#8B5E48] hover:text-[#F6B78D] font-medium">
                View all →
              </Link>
            </div>

            {myActiveClaims.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-black/45 mb-3">No assignments claimed yet this cycle.</p>
                <Link
                  href="/members/work"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#F6B78D]/40 bg-[#F6B78D]/8 px-3 py-1.5 text-sm font-medium text-[#8B5E48] hover:bg-[#F6B78D]/15 transition-colors"
                >
                  Browse available work →
                </Link>
              </div>
            ) : (
              <div>
                {/* In Progress */}
                {myActiveInProgress.length > 0 && (
                  <div>
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                      <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">
                        In Progress · {myActiveInProgress.length}
                      </p>
                    </div>
                    <ul className="divide-y divide-black/6">
                      {myActiveInProgress.map((c) => (
                        <ClaimRow
                          key={c.id}
                          c={c}
                          a={assignmentsById.get(c.assignmentId)}
                          biz={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Submitted */}
                {myActiveSubmitted.length > 0 && (
                  <div className={myActiveInProgress.length > 0 ? "border-t border-black/6" : ""}>
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0" />
                      <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">
                        Awaiting Review · {myActiveSubmitted.length}
                      </p>
                    </div>
                    <ul className="divide-y divide-black/6">
                      {myActiveSubmitted.map((c) => (
                        <ClaimRow
                          key={c.id}
                          c={c}
                          a={assignmentsById.get(c.assignmentId)}
                          biz={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Approved */}
                {myActiveApproved.length > 0 && (
                  <div className={(myActiveInProgress.length > 0 || myActiveSubmitted.length > 0) ? "border-t border-black/6" : ""}>
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-violet-400 flex-shrink-0" />
                      <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">
                        Completed · {myActiveApproved.length}
                      </p>
                    </div>
                    <ul className="divide-y divide-black/6">
                      {myActiveApproved.map((c) => (
                        <ClaimRow
                          key={c.id}
                          c={c}
                          a={assignmentsById.get(c.assignmentId)}
                          biz={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
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
                    <span className="text-[#8B5E48] font-mono text-sm flex-shrink-0">{s.points} {s.points === 1 ? "demerit" : "demerits"}</span>
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
                    <span className={`font-mono text-sm flex-shrink-0 ${a.points >= 0 ? "text-[#8B5E48]" : "text-red-700"}`}>
                      {a.points >= 0 ? "+" : ""}{a.points}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* ── Past cycle history ── */}
        {cycleHistory.length > 0 && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <h2 className="font-display font-bold text-black text-base mb-3">Past cycles</h2>
            <div className="space-y-5">
              {cycleHistory.map((cycle) => {
                const list = (claimsByCycle.get(cycle.id) ?? []).sort(
                  (a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""),
                );
                return (
                  <div key={cycle.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{cycle.name}</p>
                      <p className="text-xs text-black/45">{list.length} assignment{list.length === 1 ? "" : "s"}</p>
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
                                    {c.claimedAt && ` · ${formatDate(c.claimedAt)}`}
                                  </p>
                                  {c.status === "rejected" && c.rejectReason && (
                                    <p className="text-xs text-red-700 mt-1">Rejected: {c.rejectReason}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[c.status] ?? ""}`}>
                                    {c.status === "claimed" ? "Claimed" : c.status}
                                  </span>
                                  {c.status === "Approved" && (
                                    <span className="text-xs text-[#8B5E48] font-mono">+{c.creditsAwarded ?? a?.credits ?? 0} credits</span>
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
          </section>
        )}
      </div>
    </MembersLayout>
  );
}
