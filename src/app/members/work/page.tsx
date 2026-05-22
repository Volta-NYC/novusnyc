"use client";

// Member Work tab — shows the member's active/submitted/completed assignments
// for the current cycle, then the full browseable catalog of available work.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember, pickPrimaryTrack } from "@/lib/members/cycleCompute";
import { ALL_TRACKS, TRACK_DOT, TRACK_PILL, TRACK_PILL_BASE } from "@/lib/members/constants";

type SortKey = "recommended" | "credits" | "deadline" | "newest";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

function formatDate(s: string): string {
  const d = new Date(s + (s.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

// ── My assignment row ────────────────────────────────────────────────────────

function MyClaimRow({
  claim,
  assignment,
  business,
}: {
  claim: AssignmentClaim;
  assignment: Assignment | undefined;
  business: Business | undefined;
}) {
  if (!assignment) return null;
  const track = (assignment.track ?? assignment.primaryTrack ?? "General") as CycleTrack;
  const deadline = claim.dueDate ?? assignment.deadlines?.[0]?.date ?? assignment.deadline ?? "";
  const days = deadline ? daysUntil(deadline) : null;
  const isOverdue = days != null && days <= 0;
  const creditsDisplay = claim.status === "Approved"
    ? (claim.creditsAwarded ?? assignment.credits)
    : (claim.totalCreditsEarned ?? null) ?? assignment.credits;

  return (
    <Link
      href={`/members/work/${claim.assignmentId}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-black/[0.025] transition-colors group"
    >
      {/* Track dot */}
      <div className="mt-1 flex-shrink-0">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${TRACK_DOT[track]}`} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black/90 group-hover:text-black truncate">{assignment.title}</p>
        <p className="text-xs text-black/50 mt-0.5">
          {business?.name ?? "Volta"}
          {business?.neighborhood && <span className="text-black/35"> · {business.neighborhood}</span>}
        </p>

        {/* Status-specific detail */}
        {(claim.status === "In Progress" || claim.status === "claimed") && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {deadline ? (
              <span className={`font-medium ${isOverdue ? "text-red-600" : days != null && days <= 3 ? "text-orange-600" : "text-black/55"}`}>
                {isOverdue ? `Overdue by ${Math.abs(days!)} day${Math.abs(days!) !== 1 ? "s" : ""}` : `Due ${formatDate(deadline)} · ${days}d left`}
              </span>
            ) : (
              <span className="text-black/40">No deadline set</span>
            )}
            <span className="text-[#5C9911] font-medium">Submit work to earn {creditsDisplay} cr →</span>
          </div>
        )}

        {claim.status === "Submitted" && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {claim.submittedAt && (
              <span className="text-black/45">Submitted {formatDate(claim.submittedAt)}</span>
            )}
            {claim.deliverableUrl && (
              <span className="text-black/40 truncate max-w-[200px]">{claim.deliverableUrl}</span>
            )}
          </div>
        )}

        {claim.status === "Approved" && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {claim.approvedAt && (
              <span className="text-black/45">Approved {formatDate(claim.approvedAt)}</span>
            )}
            {claim.rejectReason && (
              <span className="text-black/45 italic">&ldquo;{claim.rejectReason}&rdquo;</span>
            )}
          </div>
        )}

        {claim.status === "rejected" && (
          <div className="mt-2 text-xs text-red-700">
            Rejected{claim.rejectReason ? `: ${claim.rejectReason}` : ""}
            <span className="ml-2 text-[#5C9911] font-medium">Resubmit →</span>
          </div>
        )}
      </div>

      {/* Credits + status */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {claim.status === "Approved" ? (
          <span className="text-sm font-bold text-[#5C9911]">+{creditsDisplay} cr</span>
        ) : (
          <span className="text-xs text-black/40">{assignment.credits} cr</span>
        )}
        <StatusBadge status={claim.status} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "In Progress": "bg-cyan-100 text-cyan-800 border-cyan-200",
    claimed:       "bg-blue-100 text-blue-800 border-blue-200",
    Submitted:     "bg-yellow-100 text-yellow-800 border-yellow-200",
    Approved:      "bg-violet-100 text-violet-800 border-violet-200",
    rejected:      "bg-red-100 text-red-800 border-red-200",
  };
  const label = status === "claimed" ? "Claimed" : status;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {label}
    </span>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
      <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">
        {label} · {count}
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function WorkPage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [search, setSearch] = useState("");
  const [trackFilters, setTrackFilters] = useState<Set<CycleTrack>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const trackInitRef = useRef(false);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    const u1 = subscribeCycles(setCycles);
    const u2 = subscribeAssignments(setAssignments);
    const u3 = subscribeAssignmentClaims(setClaims);
    const u4 = subscribeBusinesses(setBusinesses);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const primaryTrack = me ? pickPrimaryTrack(me) : null;
  const classification = me ? classifyMember(me) : null;
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);
  const assignmentsById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  // Default track filter to member's primary track + General once me resolves.
  useEffect(() => {
    if (trackInitRef.current || !primaryTrack) return;
    trackInitRef.current = true;
    setTrackFilters(new Set([primaryTrack, "General" as CycleTrack]));
  }, [primaryTrack]);

  const toggleTrack = (t: CycleTrack) => {
    setTrackFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  // My claims this cycle
  const myClaims = useMemo(() => {
    if (!me || !activeCycle) return [];
    return claims.filter((c) => c.memberId === me.id && c.cycleId === activeCycle.id);
  }, [claims, me, activeCycle]);

  const myInProgress = useMemo(
    () => myClaims.filter((c) => c.status === "In Progress" || c.status === "claimed"),
    [myClaims],
  );
  const mySubmitted = useMemo(
    () => myClaims.filter((c) => c.status === "Submitted"),
    [myClaims],
  );
  const myApproved = useMemo(
    () => myClaims.filter((c) => c.status === "Approved"),
    [myClaims],
  );
  const myRejected = useMemo(
    () => myClaims.filter((c) => c.status === "rejected"),
    [myClaims],
  );

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const myClaimedAssignmentIds = useMemo(() => {
    return new Set(myClaims.filter((c) => c.status !== "rejected").map((c) => c.assignmentId));
  }, [myClaims]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => !activeCycle || !a.cycleId || a.cycleId === activeCycle.id)
      .filter((a) => a.status === "Open" || a.status === "In Progress")
      .filter((a) => {
        if (trackFilters.size === 0) return true;
        return trackFilters.has((a.track ?? a.primaryTrack ?? "General") as CycleTrack);
      })
      .filter((a) => {
        if (!hideUnavailable) return true;
        const isUnlimited = a.capacity === 0;
        if (isUnlimited) return true;
        const taken = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
        return taken < a.capacity;
      })
      .filter((a) => {
        if (!q) return true;
        const business = a.businessId ? businessById.get(a.businessId) : undefined;
        return [
          a.title,
          a.description?.replace(/<[^>]+>/g, " "),
          business?.name ?? "Volta",
          business?.neighborhood,
        ].some((v) => String(v ?? "").toLowerCase().includes(q));
      });
  }, [assignments, activeCycle, trackFilters, hideUnavailable, claimsByAssignment, search, businessById]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortKey === "credits") return copy.sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || b.credits - a.credits);
    if (sortKey === "deadline") {
      return copy.sort((a, b) => {
        const aDeadline = a.deadlines?.[0]?.date ?? a.deadline;
        const bDeadline = b.deadlines?.[0]?.date ?? b.deadline;
        const aMs = aDeadline ? Date.parse(aDeadline) : Number.MAX_SAFE_INTEGER;
        const bMs = bDeadline ? Date.parse(bDeadline) : Number.MAX_SAFE_INTEGER;
        const priorityDelta = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
        if (priorityDelta !== 0) return priorityDelta;
        return aMs - bMs;
      });
    }
    if (sortKey === "newest") return copy.sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    // "Best match": priority first → member's primary track → most credits
    return copy.sort((a, b) => {
      const priorityDelta = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
      if (priorityDelta !== 0) return priorityDelta;
      const aPrimary = primaryTrack && (a.track ?? a.primaryTrack) === primaryTrack ? 1 : 0;
      const bPrimary = primaryTrack && (b.track ?? b.primaryTrack) === primaryTrack ? 1 : 0;
      if (aPrimary !== bPrimary) return bPrimary - aPrimary;
      return b.credits - a.credits;
    });
  }, [filtered, sortKey, primaryTrack]);

  const isLeadership = classification?.status === "leadership";
  const isReserve = classification?.status === "reserve";
  const hasMyClaims = myClaims.length > 0;

  return (
    <MembersLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-black text-3xl">Work</h1>
            <p className="text-sm text-black/50 mt-1">
              {activeCycle ? activeCycle.name : "All published assignments"}
              {hasMyClaims && ` · ${myClaims.length} active`}
            </p>
          </div>
          <Link href="/members/me" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
            ← Overview
          </Link>
        </header>

        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isLeadership
              ? "You're on leadership — this view is read-only for you."
              : "Your account isn't active in the credit system — claiming is disabled."}
          </div>
        )}

        {/* ── My Assignments ── */}
        {activeCycle && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
              <h2 className="font-display font-bold text-black text-base">My Assignments</h2>
              {hasMyClaims && (
                <span className="text-xs text-black/40">{activeCycle.name}</span>
              )}
            </div>

            {!hasMyClaims ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-black/45 mb-1">You haven&apos;t claimed any assignments this cycle yet.</p>
                <p className="text-xs text-black/35 mb-4">Browse the catalog below and sign up for something that matches your skills.</p>
              </div>
            ) : (
              <div>
                {/* In Progress */}
                {myInProgress.length > 0 && (
                  <>
                    <SectionHeader dot="bg-cyan-400" label="In Progress" count={myInProgress.length} />
                    <div className="divide-y divide-black/6">
                      {myInProgress.map((c) => (
                        <MyClaimRow
                          key={c.id}
                          claim={c}
                          assignment={assignmentsById.get(c.assignmentId)}
                          business={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Awaiting Review */}
                {mySubmitted.length > 0 && (
                  <div className={myInProgress.length > 0 ? "border-t border-black/6" : ""}>
                    <SectionHeader dot="bg-yellow-400" label="Awaiting Review" count={mySubmitted.length} />
                    <div className="divide-y divide-black/6">
                      {mySubmitted.map((c) => (
                        <MyClaimRow
                          key={c.id}
                          claim={c}
                          assignment={assignmentsById.get(c.assignmentId)}
                          business={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed */}
                {myApproved.length > 0 && (
                  <div className={(myInProgress.length > 0 || mySubmitted.length > 0) ? "border-t border-black/6" : ""}>
                    <SectionHeader dot="bg-violet-400" label="Completed" count={myApproved.length} />
                    <div className="divide-y divide-black/6">
                      {myApproved.map((c) => (
                        <MyClaimRow
                          key={c.id}
                          claim={c}
                          assignment={assignmentsById.get(c.assignmentId)}
                          business={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected — needs resubmission */}
                {myRejected.length > 0 && (
                  <div className="border-t border-black/6">
                    <SectionHeader dot="bg-red-400" label="Needs Resubmission" count={myRejected.length} />
                    <div className="divide-y divide-black/6">
                      {myRejected.map((c) => (
                        <MyClaimRow
                          key={c.id}
                          claim={c}
                          assignment={assignmentsById.get(c.assignmentId)}
                          business={(() => { const a = assignmentsById.get(c.assignmentId); return a?.businessId ? businessById.get(a.businessId) : undefined; })()}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Browse Available Work ── */}
        <section>
          <h2 className="font-display font-bold text-black text-lg mb-3">Available Work</h2>

          {/* Filters */}
          <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-4 space-y-3 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, business, neighborhood…"
              className="w-full rounded-lg border border-black/10 bg-black/3 px-3 py-2 text-sm text-black/85 placeholder-black/35 focus:outline-none focus:border-[#85CC17]/55 focus:bg-white"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mr-1">Track</span>
              {/* All button */}
              <button
                type="button"
                onClick={() => setTrackFilters(new Set())}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  trackFilters.size === 0 ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                All
              </button>
              {ALL_TRACKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrack(t)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    trackFilters.has(t) ? `${TRACK_PILL_BASE[t]} border-black/85` : "border-black/15 bg-white text-black/65 hover:border-black/35"
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[t]}`} />
                  {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHideUnavailable((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    hideUnavailable ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
                  }`}
                >
                  Available spots only
                </button>
                <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">Sort</span>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs text-black/85 focus:outline-none"
                >
                  <option value="recommended">Best match</option>
                  <option value="credits">Most credits</option>
                  <option value="deadline">Soonest deadline</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-8 text-center">
              <p className="text-sm text-black/55">Nothing matches these filters right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sorted.map((a) => {
                const business = a.businessId ? businessById.get(a.businessId) : undefined;
                const track = (a.track ?? a.primaryTrack ?? "Tech") as CycleTrack;
                const deadline = a.deadlines?.[0]?.date ?? a.deadline ?? "";
                const claimList = claimsByAssignment.get(a.id) ?? [];
                const taken = claimList.filter((c) => c.status !== "rejected").length;
                const isUnlimited = a.capacity === 0;
                const isFull = !isUnlimited && taken >= a.capacity;
                const myClaim = claimList.find((c) => c.memberId === me?.id && c.status !== "rejected");
                const alreadyClaimed = myClaimedAssignmentIds.has(a.id);
                const otherClaimers = claimList
                  .filter((c) => c.status !== "rejected" && c.memberId !== me?.id)
                  .map((c) => c.memberName)
                  .slice(0, 3);
                const days = deadline ? daysUntil(deadline) : null;

                return (
                  <Link
                    key={a.id}
                    href={`/members/work/${a.id}`}
                    className={`block rounded-2xl border bg-white transition-all group
                      ${a.priority
                        ? "border-l-4 border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:shadow-md"
                        : "border-black/8 hover:border-[#85CC17]/55 hover:shadow-md"
                      }`}
                  >
                    <div className="p-5">
                      {/* Track pill + priority + credits */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL[track]}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[track]}`} />
                            {track}
                          </span>
                          {a.priority && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                              ⚡ Priority
                            </span>
                          )}
                          {a.recurringEnabled && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                              ↻ Recurring
                            </span>
                          )}
                        </div>
                        <span className="text-[#5C9911] font-display font-bold text-base tabular-nums shrink-0">
                          {a.credits} {a.recurringEnabled ? "cr / check-in" : a.credits === 1 ? "credit" : "credits"}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-[15px] font-semibold text-black/90 mb-1 leading-snug line-clamp-2">{a.title}</h3>

                      {/* Business */}
                      <p className="text-sm text-black/60 mb-2">
                        {business ? business.name : "Volta"}
                        {business?.neighborhood && <span className="text-black/40"> · {business.neighborhood}</span>}
                      </p>

                      {/* Description */}
                      {a.description && (
                        <p className="text-xs text-black/50 line-clamp-2 mb-3">
                          {a.description.replace(/<[^>]+>/g, " ").trim()}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-black/45 pt-3 border-t border-black/6">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isUnlimited && (
                            <span className={isFull ? "text-red-500 font-medium" : ""}>
                              {taken}/{a.capacity} spots{isFull ? " · Full" : ""}
                            </span>
                          )}
                          {isUnlimited && taken > 0 && (
                            <span>{taken} member{taken !== 1 ? "s" : ""} working on this</span>
                          )}
                          {deadline && (
                            <span className={days != null && days <= 3 ? "text-orange-600 font-medium" : ""}>
                              Due {deadline}
                              {days != null && days <= 7 && ` · ${days}d left`}
                            </span>
                          )}
                          {a.estimatedHours > 0 && (
                            <span>~{a.estimatedHours}h</span>
                          )}
                        </div>
                        {alreadyClaimed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: "#5C9911" }}>
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#85CC17]" />
                            {myClaim?.status === "Submitted" ? "Submitted" : myClaim?.status === "Approved" ? "Completed" : "In Progress"}
                          </span>
                        ) : isFull ? (
                          <span className="text-xs text-red-500 font-medium shrink-0">Full</span>
                        ) : (
                          <span className="text-xs text-black/50 font-medium group-hover:text-[#5C9911] transition-colors shrink-0">
                            View &amp; sign up →
                          </span>
                        )}
                      </div>

                      {/* Other claimers */}
                      {otherClaimers.length > 0 && (
                        <p className="mt-2 text-[11px] text-black/40 truncate">
                          Also working: {otherClaimers.join(", ")}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </MembersLayout>
  );
}
