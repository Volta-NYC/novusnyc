"use client";

// Member-facing assignment marketplace. Light theme. Filterable feed of every
// open assignment in the active cycle scoped to the member's track (with a
// cross-track toggle).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember, pickPrimaryTrack } from "@/lib/members/cycleCompute";
import { ALL_TRACKS, TRACK_DOT, TRACK_PILL } from "@/lib/members/constants";

const TRACKS = ALL_TRACKS;

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
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const [hideFull, setHideFull] = useState(false);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    const unsub1 = subscribeCycles(setCycles);
    const unsub2 = subscribeAssignments(setAssignments);
    const unsub3 = subscribeAssignmentClaims(setClaims);
    const unsub4 = subscribeBusinesses(setBusinesses);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => !activeCycle || !a.cycleId || a.cycleId === activeCycle.id)
      .filter((a) => a.status === "Open" || a.status === "In Progress")
      .filter((a) => !trackFilter || (a.track ?? a.primaryTrack) === trackFilter)
      .filter((a) => {
        if (!hideFull) return true;
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
  }, [assignments, activeCycle, trackFilter, hideFull, claimsByAssignment, search, businessById]);

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
    // recommended (default): primary track first, then by credits desc
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
                </>
              ) : `${sorted.length} published assignment${sorted.length === 1 ? "" : "s"} available`}
            </p>
          </div>
          <Link href="/members/me" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
            ← Back to profile
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
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setHideFull((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  hideFull ? "border-black/85 bg-black text-white" : "border-black/15 bg-white text-black/65 hover:border-black/35"
                }`}
              >
                Hide full
              </button>
              <span className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">Sort</span>
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
          </div>
        </section>

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
              const alreadyClaimed = myClaimedIds.has(a.id);
              const otherClaimers = claimList
                .filter((c) => c.status !== "rejected" && c.memberId !== me?.id)
                .map((c) => c.memberName)
                .slice(0, 3);

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
                  <div className="p-4">
                    {/* Top row: track pill + priority badge + credits */}
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
                      </div>
                      <span className="text-[#5C9911] font-display font-bold text-base tabular-nums shrink-0">
                        {a.credits} {a.credits === 1 ? "credit" : "credits"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-semibold text-black/90 mb-1 leading-snug line-clamp-2">{a.title}</h3>

                    {/* Business */}
                    <p className="text-sm text-black/65 mb-2">
                      {business ? business.name : "Volta"}
                      {business?.neighborhood && <span className="text-black/40"> · {business.neighborhood}</span>}
                    </p>

                    {/* Description preview */}
                    {a.description && (
                      <p className="text-xs text-black/50 line-clamp-2 mb-3">
                        {a.description.replace(/<[^>]+>/g, " ").trim()}
                      </p>
                    )}

                    {/* Footer meta */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-black/45 pt-2.5 border-t border-black/6">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUnlimited ? (
                          taken > 0 ? <span>{taken} claiming this</span> : null
                        ) : (
                          <span className={isFull ? "text-red-500 font-medium" : ""}>{taken}/{a.capacity} spots{isFull ? " · Full" : ""}</span>
                        )}
                        {deadline && <span className="text-black/40">Due {deadline}</span>}
                      </div>
                      {alreadyClaimed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#5C9911] font-semibold shrink-0">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#85CC17]" />
                          You&apos;re on this
                        </span>
                      ) : isFull ? (
                        <span className="text-xs text-red-500 font-medium shrink-0">Full</span>
                      ) : (
                        <span className="text-xs text-black/50 font-medium group-hover:text-[#5C9911] transition-colors shrink-0">
                          View &amp; claim →
                        </span>
                      )}
                    </div>

                    {/* Other claimers */}
                    {otherClaimers.length > 0 && (
                      <p className="mt-2 text-[11px] text-black/40 truncate">
                        Also working on this: {otherClaimers.join(", ")}
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
