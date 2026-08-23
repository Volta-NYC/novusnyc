"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Badge, LoadError } from "@/components/members/ui";
import {
  subscribeBusinesses, subscribeTeam, subscribePods, subscribePodMembers,
  subscribePodMeetings, subscribePodAssignments, fetchHoursTotals,
  TECH_PIPELINE,
  type Business, type TeamMember, type Pod, type PodMember,
  type PodMeeting, type PodAssignment, type HoursTotals,
} from "@/lib/members/storage";

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date + "T12:00:00").getTime()) / 86_400_000);
}

export default function AdminDashboard() {
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [team, setTeam]               = useState<TeamMember[]>([]);
  const [pods, setPods]               = useState<Pod[]>([]);
  const [podMembers, setPodMembers]   = useState<PodMember[]>([]);
  const [meetings, setMeetings]       = useState<PodMeeting[]>([]);
  const [assignments, setAssignments] = useState<PodAssignment[]>([]);
  const [hours, setHours]             = useState<HoursTotals[]>([]);
  // Every headline here is a count. If a query failed, the honest thing is to
  // say so — a dashboard reading 0 across the board looks like a quiet week.
  const [loadError, setLoadError]     = useState<string | null>(null);

  useEffect(() => subscribeBusinesses((rows, state) => {
    setBusinesses(rows);
    if (state.error) setLoadError(state.error);
  }), []);
  useEffect(() => subscribeTeam((rows, state) => {
    setTeam(rows);
    if (state.error) setLoadError(state.error);
  }), []);
  useEffect(() => subscribePods((rows, state) => {
    setPods(rows);
    if (state.error) setLoadError(state.error);
  }), []);
  useEffect(() => subscribePodMembers(setPodMembers), []);
  useEffect(() => subscribePodMeetings(setMeetings), []);
  useEffect(() => subscribePodAssignments(setAssignments), []);
  useEffect(() => { void fetchHoursTotals().then(setHours); }, []);

  const live = useMemo(() => businesses.filter((b) => !b.archived), [businesses]);

  const pipeline = useMemo(() => {
    const c = new Map<string, number>();
    for (const b of live) {
      if (b.intakeSource === "website_form" || b.intakeSource === "discovery") continue;
      const k = b.techStatus ?? "Backlog";
      c.set(k, (c.get(k) ?? 0) + 1);
    }
    return c;
  }, [live]);

  const nameById = useMemo(() => new Map(team.map((t) => [t.id, t.name])), [team]);

  // A pod goes quiet when its LIT does, and that takes fifteen people with it.
  // Surfacing it here is the whole point of the dashboard.
  const podHealth = useMemo(() => {
    return [...pods]
      .filter((p) => p.status !== "Archived")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pod) => {
        const roster = podMembers.filter((m) => m.podId === pod.id && !m.leftAt);
        const lits = roster.filter((m) => m.role === "lit");
        const mine = meetings
          .filter((m) => m.podId === pod.id)
          .sort((a, b) => b.meetsOn.localeCompare(a.meetsOn));
        const last = mine[0] ?? null;
        const since = last ? daysSince(last.meetsOn) : null;
        const openTasks = assignments.filter((a) => a.podId === pod.id && a.status !== "Done").length;
        const overdue = assignments.filter(
          (a) => a.podId === pod.id && a.status !== "Done" && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10),
        ).length;

        let state: "ok" | "watch" | "stalled" = "ok";
        if (!last) state = "stalled";
        else if (since !== null && since > pod.cadenceDays * 2) state = "stalled";
        else if (since !== null && since > pod.cadenceDays) state = "watch";
        if (lits.length === 0) state = "stalled";

        return { pod, size: roster.length, lits, last, since, openTasks, overdue, state };
      });
  }, [pods, podMembers, meetings, assignments]);

  const totalHours = useMemo(
    () => hours.reduce((s, h) => s + Number(h.totalHours ?? 0), 0),
    [hours],
  );

  const activeMembers = useMemo(
    () => hours.filter((h) => h.lastActivity && daysSince(h.lastActivity) <= 30).length,
    [hours],
  );

  const topMembers = useMemo(
    () => [...hours]
      .sort((a, b) => Number(b.totalHours ?? 0) - Number(a.totalHours ?? 0))
      .slice(0, 8),
    [hours],
  );

  const liveSites = live.filter((b) => !!b.liveUrl).length;
  const unassigned = live.filter((b) => (b.techStatus ?? "Backlog") === "Backlog"
    && b.intakeSource !== "website_form" && b.intakeSource !== "discovery").length;

  const STATE_STYLE = {
    ok:      "border-white/10",
    watch:   "border-yellow-500/30 bg-yellow-500/[0.04]",
    stalled: "border-red-500/30 bg-red-500/[0.04]",
  } as const;

  return (
    <MembersLayout>
      <PageHeader title="Dashboard" />

      {loadError && (
        <div className="mb-4">
          <LoadError message={loadError} onRetry={() => window.location.reload()} />
        </div>
      )}

      {/* Headline numbers */}
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
        {[
          { label: "Live sites", value: liveSites, href: "/members/projects" },
          { label: "Unassigned", value: unassigned, href: "/members/projects" },
          { label: "Active members (30d)", value: activeMembers, href: "/members/team" },
          { label: "Hours logged", value: totalHours.toFixed(0), href: "/members/team" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group bg-[#111418] px-4 py-3 transition-colors hover:bg-[#151920]">
            <p className="font-mono text-2xl font-semibold tabular-nums text-white/90 group-hover:text-[#F3E28D]">
              {s.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Tech pipeline */}
      <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Project pipeline</h2>
      <Link
        href="/members/projects"
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-[#111418] px-4 py-3 transition-colors hover:border-white/25"
      >
        {TECH_PIPELINE.map((s) => (
          <span key={s} className="flex items-baseline gap-1.5">
            <span className="font-mono text-[15px] font-semibold tabular-nums text-white/85">
              {pipeline.get(s) ?? 0}
            </span>
            <span className="text-[11px] text-white/45">{s}</span>
          </span>
        ))}
      </Link>

      {/* Pod health */}
      <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Pods</h2>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {podHealth.map(({ pod, size, lits, last, since, openTasks, overdue, state }) => (
          <Link
            key={pod.id}
            href={`/members/pods/${pod.slug}`}
            className={`flex flex-col gap-2 rounded-lg border bg-[#111418] p-3 transition-colors hover:border-white/30 ${STATE_STYLE[state]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium text-white/90">{pod.name}</span>
              <span className="font-mono text-[11px] tabular-nums text-white/45">{size}</span>
            </div>

            <p className="text-[11px]">
              {lits.length === 0 ? (
                <span className="text-red-400">No LIT assigned</span>
              ) : (
                <span className="text-white/45">
                  {lits.map((l) => nameById.get(l.memberId) ?? "Unknown").join(", ")}
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              {last ? (
                <span className={
                  state === "stalled" ? "text-red-400"
                    : state === "watch" ? "text-yellow-300"
                    : "text-white/45"
                }>
                  met {since}d ago
                </span>
              ) : (
                <span className="text-red-400">never met</span>
              )}
              {openTasks > 0 && <span className="text-white/45">{openTasks} open</span>}
              {overdue > 0 && <span className="text-red-400">{overdue} overdue</span>}
            </div>
          </Link>
        ))}
        {podHealth.length === 0 && (
          <p className="text-[12px] text-white/30">No pods yet.</p>
        )}
      </div>

      {/* Hours leaders */}
      {topMembers.length > 0 && (
        <>
          <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Most hours</h2>
          <div className="overflow-hidden rounded-lg border border-white/10">
            {topMembers.map((h) => (
              <div key={h.memberId} className="flex items-center gap-3 border-b border-white/5 px-3 py-1.5 last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">
                  {nameById.get(h.memberId) ?? "Unknown"}
                </span>
                {h.lastActivity && daysSince(h.lastActivity) > 45 && <Badge label="Inactive" />}
                <span className="font-mono text-[12px] tabular-nums text-white/70">
                  {Number(h.totalHours ?? 0).toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </MembersLayout>
  );
}
