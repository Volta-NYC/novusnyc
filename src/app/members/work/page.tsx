"use client";

// Member-facing assignment marketplace. Light theme. Filterable feed of every
// open assignment in the active cycle scoped to the member's track (with a
// cross-track toggle).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignmentClaims, subscribeAssignments, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember, pickPrimaryTrack } from "@/lib/members/cycleCompute";

const TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
};

const TRACK_PILL: Record<CycleTrack, string> = {
  Tech: "bg-blue-100 text-blue-800 border-blue-200",
  Marketing: "bg-lime-100 text-lime-900 border-lime-200",
  Finance: "bg-amber-100 text-amber-900 border-amber-200",
};

type SortKey = "recommended" | "credits" | "deadline" | "newest";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

export default function MarketplacePage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<"" | CycleTrack>("");
  const [showCrossTrack, setShowCrossTrack] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recommended");

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

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

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const myClaimedIds = useMemo(() => {
    if (!me) return new Set<string>();
    const set = new Set<string>();
    for (const c of claims) if (c.memberId === me.id) set.add(c.assignmentId);
    return set;
  }, [claims, me]);

  const difficulties = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) if (a.difficulty) set.add(a.difficulty);
    return Array.from(set).sort();
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!activeCycle) return [];
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => a.cycleId === activeCycle.id)
      .filter((a) => a.status === "open" || a.status === "claimed")
      .filter((a) => {
        const visible = a.visibleTracks?.length ? a.visibleTracks : [a.primaryTrack];
        if (trackFilter) return visible.includes(trackFilter);
        if (!primaryTrack) return true;
        if (showCrossTrack) return true;
        return visible.includes(primaryTrack);
      })
      .filter((a) => !difficultyFilter || a.difficulty === difficultyFilter)
      .filter((a) => {
        if (!q) return true;
        const business = a.businessId ? businessById.get(a.businessId) : undefined;
        return [
          a.title,
          a.description?.replace(/<[^>]+>/g, " "),
          a.difficulty,
          business?.name,
          business?.neighborhood,
        ].some((v) => String(v ?? "").toLowerCase().includes(q));
      });
  }, [assignments, activeCycle, primaryTrack, showCrossTrack, trackFilter, difficultyFilter, search, businessById]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortKey === "credits") return copy.sort((a, b) => b.credits - a.credits);
    if (sortKey === "deadline") {
      return copy.sort((a, b) => {
        const aMs = a.deadline ? Date.parse(a.deadline) : Number.MAX_SAFE_INTEGER;
        const bMs = b.deadline ? Date.parse(b.deadline) : Number.MAX_SAFE_INTEGER;
        return aMs - bMs;
      });
    }
    if (sortKey === "newest") return copy.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    // recommended (default): primary track first, then by credits desc
    return copy.sort((a, b) => {
      const aPrimary = primaryTrack && a.primaryTrack === primaryTrack ? 1 : 0;
      const bPrimary = primaryTrack && b.primaryTrack === primaryTrack ? 1 : 0;
      if (aPrimary !== bPrimary) return bPrimary - aPrimary;
      return b.credits - a.credits;
    });
  }, [filtered, sortKey, primaryTrack]);

  const isLeadership = classification?.status === "leadership";
  const isReserve = classification?.status === "reserve";

  return (
    <MembersLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-bold text-black text-2xl">Available work</h1>
            <p className="text-sm text-black/55 mt-1">
              {activeCycle ? (
                <>
                  {activeCycle.name} · {sorted.length} assignment{sorted.length === 1 ? "" : "s"} for you
                  {primaryTrack && !showCrossTrack && !trackFilter && (
                    <span className="text-black/40"> in {primaryTrack}</span>
                  )}
                </>
              ) : "No active cycle yet."}
            </p>
          </div>
          <Link href="/members/dashboard" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
            ← Back to dashboard
          </Link>
        </header>

        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isLeadership
              ? "You're on leadership and don't claim from the marketplace. This view is read-only for you."
              : "Your account isn't currently active in the credit system, so claiming is disabled."}
          </div>
        )}

        {/* Filters */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-4 space-y-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, business, neighborhood…"
            className="w-full rounded-lg border border-black/10 bg-black/3 px-3 py-2 text-sm text-black/85 placeholder-black/35 focus:outline-none focus:border-[#85CC17]/55 focus:bg-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mr-1">Track</span>
            {primaryTrack && (
              <button
                type="button"
                onClick={() => setTrackFilter("")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  trackFilter === "" ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                My track
              </button>
            )}
            {TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrackFilter(trackFilter === t ? "" : t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  trackFilter === t ? `${TRACK_PILL[t]} border-black/85` : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[t]}`} />
                {t}
              </button>
            ))}

            <label className="ml-2 inline-flex items-center gap-2 text-xs text-black/65">
              <input
                type="checkbox"
                checked={showCrossTrack}
                onChange={(e) => setShowCrossTrack(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-black/30"
              />
              Show cross-track work
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mr-1">Difficulty</span>
            <button
              type="button"
              onClick={() => setDifficultyFilter("")}
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                !difficultyFilter ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
              }`}
            >
              Any
            </button>
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficultyFilter(difficultyFilter === d ? "" : d)}
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  difficultyFilter === d ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                {d}
              </button>
            ))}

            <span className="ml-auto text-[10px] uppercase tracking-wider text-black/40 font-semibold">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs text-black/85 focus:outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="credits">Most credits</option>
              <option value="deadline">Soonest deadline</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </section>

        {/* Results */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-8 text-center">
            <p className="text-sm text-black/55">
              {activeCycle ? "Nothing matches these filters right now." : "No active cycle. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map((a) => {
              const business = a.businessId ? businessById.get(a.businessId) : undefined;
              const claimList = claimsByAssignment.get(a.id) ?? [];
              const taken = claimList.filter((c) => c.status !== "rejected").length;
              const isFull = taken >= a.capacity;
              const alreadyClaimed = myClaimedIds.has(a.id);
              const otherClaimers = claimList
                .filter((c) => c.status !== "rejected" && c.memberId !== me?.id)
                .map((c) => c.memberName)
                .slice(0, 4);

              return (
                <Link
                  key={a.id}
                  href={`/members/work/${a.id}`}
                  className="block rounded-2xl border border-black/8 bg-white p-4 hover:border-[#85CC17]/55 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL[a.primaryTrack]}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[a.primaryTrack]}`} />
                      {a.primaryTrack}
                    </span>
                    <span className="text-[#5C9911] font-mono font-semibold text-sm">{a.credits} cr</span>
                  </div>
                  <h3 className="text-base font-semibold text-black/90 mb-1 line-clamp-2">{a.title}</h3>
                  {business && (
                    <p className="text-xs text-black/55 mb-2">
                      {business.name}
                      {business.neighborhood && <span className="text-black/35"> · {business.neighborhood}</span>}
                    </p>
                  )}
                  {a.description && (
                    <p className="text-xs text-black/55 line-clamp-2 mb-2">
                      {a.description.replace(/<[^>]+>/g, " ").trim()}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-black/45">
                    <div className="flex items-center gap-2">
                      <span>{taken} / {a.capacity} spots</span>
                      {a.estimatedHours > 0 && <span>·</span>}
                      {a.estimatedHours > 0 && <span>~{a.estimatedHours}h</span>}
                      {a.difficulty && <span>· {a.difficulty}</span>}
                    </div>
                    {a.deadline && <span>Due {a.deadline}</span>}
                  </div>
                  {otherClaimers.length > 0 && (
                    <p className="mt-2 text-[11px] text-black/45 truncate">
                      Working on this: {otherClaimers.join(", ")}
                    </p>
                  )}
                  <div className="mt-2 pt-2 border-t border-black/6 flex items-center justify-end">
                    {alreadyClaimed ? (
                      <span className="text-xs text-[#5C9911] font-medium">You&apos;re on this assignment →</span>
                    ) : isFull ? (
                      <span className="text-xs text-black/35">Full</span>
                    ) : (
                      <span className="text-xs text-black/65 font-medium">View &amp; claim →</span>
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
