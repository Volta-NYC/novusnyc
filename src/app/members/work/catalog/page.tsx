"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export default function CatalogPage() {
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

  useEffect(() => {
    if (trackInitRef.current || !primaryTrack) return;
    trackInitRef.current = true;
    setTrackFilters(new Set([primaryTrack, "General" as CycleTrack]));
  }, [primaryTrack]);

  const toggleTrack = useCallback((t: CycleTrack) => {
    setTrackFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

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
    if (!me) return new Set<string>();
    return new Set(
      claims.filter((c) => c.memberId === me.id && c.status !== "rejected").map((c) => c.assignmentId)
    );
  }, [claims, me]);

  const myApprovedAssignmentIds = useMemo(() => {
    if (!me) return new Set<string>();
    return new Set(
      claims.filter((c) => c.memberId === me.id && c.status === "Approved").map((c) => c.assignmentId)
    );
  }, [claims, me]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => !activeCycle || !a.cycleId || a.cycleId === activeCycle.id)
      .filter((a) => a.status === "Open" || a.status === "In Progress")
      // Hide assignments this member already completed (unless allowMultipleCompletions)
      .filter((a) => !myApprovedAssignmentIds.has(a.id) || a.allowMultipleCompletions === true)
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
  }, [assignments, activeCycle, trackFilters, hideUnavailable, claimsByAssignment, search, businessById, myApprovedAssignmentIds]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortKey === "credits") return copy.sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || b.credits - a.credits);
    if (sortKey === "deadline") {
      return copy.sort((a, b) => {
        const aMs = a.deadlines?.[0]?.date ? Date.parse(a.deadlines[0].date) : Number.MAX_SAFE_INTEGER;
        const bMs = b.deadlines?.[0]?.date ? Date.parse(b.deadlines[0].date) : Number.MAX_SAFE_INTEGER;
        const priorityDelta = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
        if (priorityDelta !== 0) return priorityDelta;
        return aMs - bMs;
      });
    }
    if (sortKey === "newest") return copy.sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
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
  const isReserve    = classification?.status === "reserve";

  return (
    <MembersLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="font-display font-bold text-black text-3xl">Assignment Catalog</h1>
          <p className="text-sm text-black/50 mt-1">
            {sorted.length} assignment{sorted.length !== 1 ? "s" : ""} available
          </p>
        </header>

        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isLeadership
              ? "You're on leadership — assignments are read-only for you."
              : "Your account isn't active in the credit system — claiming is disabled."}
          </div>
        )}

        {/* Filters */}
        <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, business, neighborhood…"
            className="w-full rounded-lg border border-black/10 bg-black/3 px-3 py-2 text-sm text-black/85 placeholder-black/35 focus:outline-none focus:border-[#85CC17]/55 focus:bg-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mr-1">Track</span>
            {ALL_TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrack(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  trackFilters.has(t) ? `${TRACK_PILL_BASE[t]} border-black/70 ring-1 ring-black/25` : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[t]}`} />
                {t}
              </button>
            ))}
            {trackFilters.size === 0 && (
              <span className="text-[11px] text-black/35 ml-1">All tracks shown — select one to filter</span>
            )}
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
                        {a.applicationRequired && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            ✉ Apply first
                          </span>
                        )}
                        {a.requiresApproval === false && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            ✓ Auto-approved
                          </span>
                        )}
                      </div>
                      <span className="text-[#5C9911] font-display font-bold text-base tabular-nums shrink-0">
                        {a.credits} {a.recurringEnabled ? "credits / check-in" : a.credits === 1 ? "credit" : "credits"}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-semibold text-black/90 mb-1 leading-snug line-clamp-2">{a.title}</h3>

                    <p className="text-sm text-black/60 mb-2">
                      {business ? business.name : "Volta"}
                      {business?.neighborhood && <span className="text-black/40"> · {business.neighborhood}</span>}
                    </p>

                    {a.description && (
                      <p className="text-xs text-black/50 line-clamp-2 mb-3">
                        {a.description.replace(/<[^>]+>/g, " ").trim()}
                      </p>
                    )}

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
                        {a.recurringEnabled && a.checkinIntervalDays && (
                          <span className="text-purple-600 font-medium">
                            Check-in every {a.checkinIntervalDays} day{a.checkinIntervalDays !== 1 ? "s" : ""}
                          </span>
                        )}
                        {!a.recurringEnabled && a.deadlineType === "offset" && a.deadlineOffsetDays && (
                          <span>Due {a.deadlineOffsetDays} {a.deadlineOffsetDays === 1 ? "day" : "days"} after signing up</span>
                        )}
                        {!a.recurringEnabled && a.deadlineType !== "offset" && deadline && (
                          <span className={days != null && days <= 3 ? "text-orange-600 font-medium" : ""}>
                            Due {deadline}{days != null && days <= 7 && ` · ${days}d left`}
                          </span>
                        )}
                        {a.estimatedHours > 0 && <span>~{a.estimatedHours}h</span>}
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
      </div>
    </MembersLayout>
  );
}
