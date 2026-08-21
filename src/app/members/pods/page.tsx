"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SkeletonRows, Badge } from "@/components/members/ui";
import {
  subscribePods, subscribePodMembers, subscribePodMeetings, subscribeTeam, subscribeChapters,
  type Pod, type PodMember, type PodMeeting, type TeamMember, type Chapter,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso + "T12:00:00").getTime()) / 86_400_000);
}

export default function PodsPage() {
  const { authRole, userProfile, loading } = useAuth();
  const isAdmin = authRole === "owner" || authRole === "admin";

  const [pods, setPods]         = useState<Pod[] | null>(null);
  const [members, setMembers]   = useState<PodMember[]>([]);
  const [meetings, setMeetings] = useState<PodMeeting[]>([]);
  const [team, setTeam]         = useState<TeamMember[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => subscribePods(setPods), []);
  useEffect(() => subscribePodMembers(setMembers), []);
  useEffect(() => subscribePodMeetings(setMeetings), []);
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeChapters(setChapters), []);

  const nameById = useMemo(() => new Map(team.map((t) => [t.id, t.name])), [team]);
  const myId = userProfile?.id ?? null;

  const rows = useMemo(() => {
    if (!pods) return [];
    const active = members.filter((m) => !m.leftAt);
    return [...pods]
      .filter((p) => p.status !== "Archived")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pod) => {
        const roster = active.filter((m) => m.podId === pod.id);
        const lits   = roster.filter((m) => m.role === "lit");
        const podMeetings = meetings
          .filter((m) => m.podId === pod.id)
          .sort((a, b) => b.meetsOn.localeCompare(a.meetsOn));
        const last = podMeetings[0] ?? null;
        return {
          pod,
          size: roster.length,
          lits: lits.map((l) => nameById.get(l.memberId) ?? "Unknown"),
          last,
          overdue: last ? daysAgo(last.meetsOn) > pod.cadenceDays : podMeetings.length === 0,
          iLead: !!myId && lits.some((l) => l.memberId === myId),
          iAmIn: !!myId && roster.some((m) => m.memberId === myId),
        };
      });
  }, [pods, members, meetings, nameById, myId]);

  const visible = isAdmin ? rows : rows.filter((r) => r.iAmIn);

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title="Pods"
        subtitle={isAdmin
          ? "Marketing and finance. Each pod runs its own meetings and assignments."
          : "The pods you're part of."}
      />

      {pods === null ? (
        <SkeletonRows rows={4} cols={3} />
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/30">You&apos;re not in a pod yet.</p>
      ) : (
        [...chapters].sort((a, b) => a.sortOrder - b.sortOrder).map((chapter) => {
        const inChapter = visible.filter((v) => v.pod.chapterId === chapter.id);
        if (inChapter.length === 0) return null;
        return (
        <div key={chapter.id} className="mb-6">
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-[11px] uppercase tracking-wide text-white/45">{chapter.name}</h2>
          {chapter.status === "Launching" && (
            <span className="text-[10px] text-[#F3E28D]/70">launching</span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {inChapter.map(({ pod, size, lits, last, overdue, iLead }) => (
            <Link
              key={pod.id}
              href={`/members/pods/${pod.slug}`}
              className="group flex flex-col gap-3 rounded-lg border border-white/10 bg-[#111418] p-4 transition-colors hover:border-white/25"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold leading-snug text-white group-hover:text-[#F3E28D]">
                  {pod.name}
                </h2>
                {iLead && <Badge label="lit" />}
              </div>

              <span className={`-mt-1.5 w-fit rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                pod.serves === "clients"
                  ? "border-[#F6B78D]/35 bg-[#F6B78D]/10 text-[#F6B78D]"
                  : "border-[#BEA2BA]/35 bg-[#BEA2BA]/10 text-[#BEA2BA]"
              }`}>
                {pod.serves === "clients" ? "For our clients" : "For Novus itself"}
              </span>

              <p className="line-clamp-2 text-[11px] leading-relaxed text-white/40">
                {pod.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                <span className="text-white/60">
                  <span className="font-mono tabular-nums text-white/85">{size}</span> member{size === 1 ? "" : "s"}
                </span>
                <span className="text-white/40">
                  every {pod.cadenceDays}d · {pod.defaultMeetingHours}h
                </span>
                {last ? (
                  <span className={overdue ? "text-yellow-300/90" : "text-white/40"}>
                    last met {last.meetsOn}
                    {overdue ? ` · ${daysAgo(last.meetsOn)}d ago` : ""}
                  </span>
                ) : (
                  <span className="text-yellow-300/90">no meetings yet</span>
                )}
              </div>

              {lits.length > 0 && (
                <p className="text-[10px] uppercase tracking-wide text-white/30">
                  Led by {lits.join(", ")}
                </p>
              )}
            </Link>
          ))}
        </div>
        </div>
        );
        })
      )}
    </MembersLayout>
  );
}
