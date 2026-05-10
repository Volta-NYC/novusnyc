"use client";

// Member-facing overview. Light theme. Replaces the older project-summary page.
// Centerpiece of the credit system: cycle status, my work, recommended work,
// rules card. Goal — admin emails members once a month and points them here.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  getAssignmentClaimsList, getAssignmentsList, getBusinessesList,
  getCyclesList, getInfractionsList, getMemberCreditAdjustmentsList,
  getMemberStrikesList, getTeamMembersList,
  type Assignment, type AssignmentClaim, type Business, type Cycle,
  type Infraction, type MemberCreditAdjustment, type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeDot, computeStrikeCount, computeStrikePoints,
  lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";

const TRACK_DOT: Record<string, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
};

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

function daysBetween(now: Date, target: string): number | null {
  const ms = Date.parse(target);
  if (!Number.isFinite(ms)) return null;
  return Math.ceil((ms - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Severity is implicit in point value: 1 = minor (yellow), 2 = major (orange),
// 3+ = severe (red). Used for the rules-card pill.
function pointsPill(points: number): string {
  if (points >= 3) return "bg-red-100 text-red-800 border-red-300";
  if (points >= 2) return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-yellow-100 text-yellow-800 border-yellow-300";
}

const DOT_COLOR_HEX: Record<string, string> = {
  green: "#16A34A",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#DC2626",
  gray: "#9CA3AF",
};

export default function MemberOverviewPage() {
  const { user, userProfile } = useAuth();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [strikes, setStrikes] = useState<MemberStrike[]>([]);
  const [adjustments, setAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [strikeDrawerOpen, setStrikeDrawerOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      getTeamMembersList().then(setTeam),
      getCyclesList().then(setCycles),
      getAssignmentsList().then(setAssignments),
      getAssignmentClaimsList().then(setClaims),
      getMemberStrikesList().then(setStrikes),
      getMemberCreditAdjustmentsList().then(setAdjustments),
      getInfractionsList().then(setInfractions),
      getBusinessesList().then(setBusinesses),
    ]);
  }, []);

  // Resolve which TeamMember corresponds to the signed-in user. Match on email
  // first, fall back to alternate email; if no match, render an onboarding prompt.
  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  // Filter ledger inputs to this member + active cycle.
  const myClaims = useMemo(
    () => me ? claims.filter((c) => c.memberId === me.id && (!activeCycle || c.cycleId === activeCycle.id)) : [],
    [claims, me, activeCycle],
  );
  const myStrikes = useMemo(
    () => me ? strikes.filter((s) => s.memberId === me.id && (!activeCycle || s.cycleId === activeCycle.id)) : [],
    [strikes, me, activeCycle],
  );
  const myAdjustments = useMemo(
    () => me ? adjustments.filter((a) => a.memberId === me.id && (!activeCycle || a.cycleId === activeCycle.id)) : [],
    [adjustments, me, activeCycle],
  );

  const assignmentsById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const ledger = useMemo(() => {
    const credits = new Map<string, number>();
    for (const a of assignments) credits.set(a.id, a.credits);
    return computeCreditLedger({
      claims: myClaims,
      adjustments: myAdjustments,
      assignmentCredits: credits,
    });
  }, [assignments, myClaims, myAdjustments]);

  const strikePoints = computeStrikePoints(myStrikes);
  const classification = me ? classifyMember(me) : null;
  const primaryTrack = me ? pickPrimaryTrack(me) : null;
  const targetCredits =
    me && activeCycle && classification?.cycleRole && primaryTrack
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;

  const dot = me
    ? computeDot({
        cycle: activeCycle,
        member: me,
        earnedCredits: ledger.total,
        targetCredits,
        hasAnyClaims: myClaims.length > 0,
      })
    : null;

  const strikeCount = activeCycle ? computeStrikeCount(strikePoints, activeCycle) : 0;

  // Cycle date math for the hero. Memoize the timestamp so it doesn't churn
  // every render and re-trigger downstream useMemo dependencies.
  const now = useMemo(() => new Date(), []);
  const daysRemaining = activeCycle ? Math.max(0, daysBetween(now, activeCycle.endDate) ?? 0) : 0;
  const targetReached = targetCredits > 0 ? Math.min(100, (ledger.total / targetCredits) * 100) : 0;

  // My-work buckets.
  const inProgress = myClaims.filter((c) => c.status === "claimed" || c.status === "in_progress");
  const pending = myClaims.filter((c) => c.status === "submitted");
  const recentlyApproved = myClaims
    .filter((c) => c.status === "approved")
    .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""))
    .slice(0, 5);

  // Recommended work — score open assignments by simple heuristics.
  const recommended = useMemo(() => {
    if (!me || !primaryTrack || !activeCycle) return [];
    const claimedAssignmentIds = new Set(myClaims.map((c) => c.assignmentId));
    const claimsByAssignment = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = claimsByAssignment.get(c.assignmentId) ?? [];
      list.push(c);
      claimsByAssignment.set(c.assignmentId, list);
    }
    const open = assignments
      .filter((a) => a.status === "open" || a.status === "claimed")
      .filter((a) => a.cycleId === activeCycle.id)
      .filter((a) => !claimedAssignmentIds.has(a.id))
      .filter((a) => {
        const taken = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
        return taken < a.capacity;
      });
    const score = (a: Assignment) => {
      let s = 0;
      if (a.primaryTrack === primaryTrack) s += 10;
      // Closer deadlines float higher
      if (a.deadline) {
        const days = daysBetween(now, a.deadline);
        if (days !== null && days >= 0 && days <= 14) s += 3;
      }
      return s;
    };
    return open
      .map((a) => ({ a, score: score(a) }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 4)
      .map((entry) => entry.a);
  }, [assignments, claims, myClaims, me, primaryTrack, activeCycle, now]);

  // Rules card: sort by points (low→high), then by name. No active/sortIndex
  // anymore — admins delete what they don't want, and order is canonical.
  const visibleInfractions = useMemo(
    () => [...infractions].sort((a, b) => (a.points - b.points) || a.name.localeCompare(b.name)),
    [infractions],
  );

  // Onboarding: signed-in user has no team record yet.
  if (user && !me && team.length > 0) {
    return (
      <MembersLayout>
        <div className="max-w-lg mx-auto mt-16 text-center text-black/75">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="font-display font-bold text-2xl mb-3 text-black">Welcome to Volta</h1>
          <p className="text-black/55 text-sm leading-relaxed">
            Your portal account is set up, but your email isn&apos;t linked to a team profile yet.
            Ask an admin to add{" "}
            <span className="text-[#5C9911] font-mono">{userProfile?.email ?? user.email}</span>{" "}
            to your team record so your overview can populate.
          </p>
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* ── Hero card — cycle status ── */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">
                {activeCycle ? "Active cycle" : "Cycle status"}
              </p>
              <h1 className="font-display font-bold text-black text-2xl mt-0.5">
                {activeCycle?.name ?? "No active cycle"}
              </h1>
              {activeCycle && (
                <p className="text-black/55 text-sm mt-1">
                  {activeCycle.startDate} → {activeCycle.endDate}
                  {daysRemaining > 0 && (
                    <span className="ml-2 text-black/40">· {daysRemaining} days remaining</span>
                  )}
                </p>
              )}
            </div>
            {dot && (
              <div className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DOT_COLOR_HEX[dot.color] }}
                />
                <span className="text-xs font-medium text-black/70">{dot.label}</span>
              </div>
            )}
          </div>

          {activeCycle && classification?.status === "participant" && (
            <>
              <div className="flex items-end gap-3 mb-3">
                <p className="text-4xl font-display font-bold text-black tabular-nums">
                  {ledger.total}
                </p>
                <p className="text-black/55 text-sm pb-1.5">
                  of <span className="text-black/85 font-medium">{targetCredits}</span> credits earned
                </p>
                {ledger.pending > 0 && (
                  <p className="text-black/40 text-xs pb-2 ml-2">
                    + {ledger.pending} pending approval
                  </p>
                )}
              </div>

              <div className="h-2 w-full rounded-full bg-black/8 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${targetReached}%`,
                    backgroundColor: dot ? DOT_COLOR_HEX[dot.color] : "#85CC17",
                  }}
                />
              </div>

              <p className="text-xs text-black/55">
                Aim for ~{activeCycle.pacingPercentPerCheckin}% of your target every two weeks.
                {dot && dot.checkInsBehind > 0 && (
                  <span className="text-black/85 ml-1">You&apos;re {dot.checkInsBehind} check-in{dot.checkInsBehind === 1 ? "" : "s"} behind.</span>
                )}
              </p>

              {/* Strike dots + view record */}
              <div className="mt-4 pt-4 border-t border-black/6 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/55">Strikes:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          i <= strikeCount
                            ? i === 1 ? "bg-yellow-400" : i === 2 ? "bg-orange-400" : "bg-red-500"
                            : "bg-black/15"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-black/45 ml-1">
                    ({strikePoints} pts · {strikeCount} of 3)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStrikeDrawerOpen((v) => !v)}
                  className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium"
                >
                  {strikeDrawerOpen ? "Hide my record" : "View my record"}
                </button>
              </div>

              {strikeDrawerOpen && (
                <div className="mt-3 rounded-lg bg-black/3 p-3 text-sm text-black/75 space-y-2">
                  {myStrikes.length === 0 ? (
                    <p className="text-black/45">No strikes this cycle.</p>
                  ) : (
                    myStrikes
                      .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""))
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-black/85 text-sm font-medium truncate">{s.infractionName}</p>
                            <p className="text-black/45 text-xs">
                              {new Date(s.issuedAt).toLocaleDateString()}
                              {s.note ? ` · ${s.note}` : ""}
                            </p>
                          </div>
                          <span className="text-[#5C9911] font-mono text-sm flex-shrink-0">
                            {s.points} pts
                          </span>
                        </div>
                      ))
                  )}
                </div>
              )}
            </>
          )}

          {activeCycle && classification?.status === "leadership" && (
            <p className="text-sm text-black/65">
              You&apos;re on leadership ({me?.role}). The credit system doesn&apos;t apply to you — you run it. Open the admin tools to manage cycles, assignments, and approvals.
            </p>
          )}

          {activeCycle && classification?.status === "reserve" && (
            <p className="text-sm text-black/65">
              Your status is currently <strong>{me?.status}</strong>. You&apos;re outside the active credit system this cycle. Reach out if you&apos;d like to be reactivated.
            </p>
          )}

          {!activeCycle && (
            <p className="text-sm text-black/55">No cycle is currently active. Check back soon.</p>
          )}
        </section>

        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-4">
          <p className="text-sm text-black/60">
            Credit guide: <span className="font-semibold text-black/80">1 credit is roughly 1 hour of expected work.</span>
          </p>
        </section>

        {/* ── My work ── */}
        {activeCycle && classification?.status === "participant" && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MyWorkCard
              title="In Progress"
              count={inProgress.length}
              entries={inProgress.slice(0, 2).map((c) => ({
                id: c.id,
                title: assignmentsById.get(c.assignmentId)?.title ?? "—",
                subtitle: c.status === "in_progress" ? "In progress" : "Claimed",
              }))}
              accent="text-blue-700"
            />
            <MyWorkCard
              title="Pending Approval"
              count={pending.length}
              entries={pending.slice(0, 2).map((c) => ({
                id: c.id,
                title: assignmentsById.get(c.assignmentId)?.title ?? "—",
                subtitle: c.submittedAt ? `Submitted ${new Date(c.submittedAt).toLocaleDateString()}` : "Submitted",
              }))}
              accent="text-yellow-700"
            />
            <MyWorkCard
              title="Recently Approved"
              count={recentlyApproved.length}
              entries={recentlyApproved.slice(0, 2).map((c) => ({
                id: c.id,
                title: assignmentsById.get(c.assignmentId)?.title ?? "—",
                subtitle: `+${c.creditsAwarded ?? 0} credits`,
              }))}
              accent="text-violet-700"
            />
          </section>
        )}

        {/* ── Recommended work ── */}
        {activeCycle && classification?.status === "participant" && recommended.length > 0 && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-black text-lg">Available work</h2>
              <Link href="/members/work" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
                Browse all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommended.map((a) => (
                <RecommendedCard
                  key={a.id}
                  assignment={a}
                  business={a.businessId ? businessById.get(a.businessId) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Rules & expectations ── */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setRulesExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-black/3 transition-colors"
          >
            <div>
              <h2 className="font-display font-bold text-black text-base">Rules &amp; expectations</h2>
              <p className="text-xs text-black/55 mt-0.5">
                {visibleInfractions.length} ways to earn points · {rulesExpanded ? "click to collapse" : "click to expand"}
              </p>
            </div>
            <span className="text-black/45 text-sm">{rulesExpanded ? "▴" : "▾"}</span>
          </button>
          {rulesExpanded && (
            <div className="px-5 pb-5 border-t border-black/8 pt-3">
              {visibleInfractions.length === 0 ? (
                <p className="text-sm text-black/45 py-4">No infractions configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleInfractions.map((i) => (
                    <div key={i.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-black/5 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-black/85 font-medium">{i.name}</p>
                        {i.description && <p className="text-xs text-black/55 mt-0.5">{i.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pointsPill(i.points)}`}>
                          {i.points} pt{i.points === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </MembersLayout>
  );
}

// ── Card components ──────────────────────────────────────────────────────────

function MyWorkCard({
  title, count, entries, accent,
}: {
  title: string;
  count: number;
  entries: { id: string; title: string; subtitle: string }[];
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">{title}</p>
        <p className={`font-display font-bold text-2xl ${accent}`}>{count}</p>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-black/45">Nothing here right now.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id}>
              <p className="text-sm text-black/85 truncate">{entry.title}</p>
              <p className="text-[11px] text-black/45">{entry.subtitle}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendedCard({ assignment, business }: { assignment: Assignment; business: Business | undefined }) {
  return (
    <Link
      href={`/members/work/${assignment.id}`}
      className="block rounded-xl border border-black/8 bg-white p-3.5 hover:border-[#85CC17]/55 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[assignment.primaryTrack]}`} />
        <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">{assignment.primaryTrack}</p>
        <span className="ml-auto text-sm text-[#5C9911] font-mono font-semibold">{assignment.credits} cr</span>
      </div>
      <p className="text-sm font-medium text-black/90 mb-1 line-clamp-2">{assignment.title}</p>
      {business && (
        <p className="text-xs text-black/55">
          {business.name}
          {business.neighborhood && <span className="text-black/35"> · {business.neighborhood}</span>}
        </p>
      )}
      <div className="flex items-center justify-between mt-2 text-[11px] text-black/45">
        <span>{assignment.estimatedHours > 0 ? `~${assignment.estimatedHours}h` : ""}</span>
        {assignment.deadline && <span>Due {assignment.deadline}</span>}
      </div>
    </Link>
  );
}
