"use client";

// Member-facing "My Profile" — full receipt drawer for everything credit-system.
// Light theme. Shows: ledger breakdown, every claim across cycles, every strike,
// every credit adjustment. Read-only.

import { useEffect, useMemo, useState } from "react";
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
  in_progress: "bg-cyan-100 text-cyan-800 border-cyan-200",
  submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-violet-100 text-violet-800 border-violet-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

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
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-black text-2xl">My Profile</h1>
            <p className="text-sm text-black/55 mt-1">
              {me?.name ?? "—"}
              {me?.role && <span className="text-black/40"> · {me.role}</span>}
            </p>
          </div>
          <Link href="/members/overview" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
            ← Back to overview
          </Link>
        </header>

        {/* Active cycle summary */}
        {activeCycle ? (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{activeCycle.name}</p>
                <p className="text-xs text-black/55">{activeCycle.startDate} → {activeCycle.endDate}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Earned" value={ledger.total} accent="text-[#5C9911]" />
              <Stat label="Pending" value={ledger.pending} accent="text-yellow-700" />
              <Stat label="Target" value={targetCredits} accent="text-black/85" />
              <Stat label="Strikes" value={`${strikeCount} / 3`} accent="text-red-700" sub={`${strikePoints} pts`} />
            </div>
          </section>
        ) : (
          <p className="text-sm text-black/45">No cycle is active.</p>
        )}

        {/* Strikes — active cycle */}
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

        {/* Adjustments */}
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

        {/* All claims by cycle */}
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
                          <li key={c.id} className="px-3 py-2.5 hover:bg-black/3">
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
                                {c.status === "approved" && (
                                  <span className="text-xs text-[#5C9911] font-mono">+{c.creditsAwarded ?? a?.credits ?? 0} cr</span>
                                )}
                              </div>
                            </div>
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

function Stat({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-black/8 bg-black/3 p-3">
      <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{label}</p>
      <p className={`font-display font-bold text-2xl tabular-nums mt-1 ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-black/45 mt-0.5">{sub}</p>}
    </div>
  );
}
