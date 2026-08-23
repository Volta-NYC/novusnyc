"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { Badge, LoadError, PageHeader, SkeletonRows, StatCard } from "@/components/members/ui";
import {
  subscribeChapters, subscribePodAssignments, subscribePodMeetings,
  subscribePodMembers, subscribePods, subscribeTeam,
  type Chapter, type Pod, type PodAssignment, type PodMeeting,
  type PodMember, type TeamMember,
} from "@/lib/members/storage";
import { getPodDivision, POD_DIVISION_META } from "@/lib/members/constants";
import { useAuth } from "@/lib/members/authContext";

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PodsPage() {
  const { authRole, userProfile, loading } = useAuth();
  const isAdmin = authRole === "owner" || authRole === "admin";
  const [pods, setPods] = useState<Pod[] | null>(null);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [meetings, setMeetings] = useState<PodMeeting[]>([]);
  const [tasks, setTasks] = useState<PodAssignment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadErrors, setLoadErrors] = useState<Record<string, string | null>>({});
  const rememberError = (key: string, error: string | null) => setLoadErrors((current) => current[key] === error ? current : { ...current, [key]: error });

  useEffect(() => subscribePods((rows, state) => { setPods(rows); rememberError("pods", state.error); }), []);
  useEffect(() => subscribePodMembers((rows, state) => { setMembers(rows); rememberError("roster", state.error); }), []);
  useEffect(() => subscribePodMeetings((rows, state) => { setMeetings(rows); rememberError("meetings", state.error); }), []);
  useEffect(() => subscribePodAssignments((rows, state) => { setTasks(rows); rememberError("assignments", state.error); }), []);
  useEffect(() => subscribeTeam((rows, state) => { setTeam(rows); rememberError("team", state.error); }), []);
  useEffect(() => subscribeChapters((rows, state) => { setChapters(rows); rememberError("chapters", state.error); }), []);

  const myId = userProfile?.id ?? null;
  const nameById = useMemo(() => new Map(team.map((member) => [member.id, member.name])), [team]);
  const rows = useMemo(() => {
    const activeRoster = members.filter((member) => !member.leftAt);
    return (pods ?? []).filter((pod) => pod.status !== "Archived").sort((a, b) => a.sortOrder - b.sortOrder).map((pod) => {
      const roster = activeRoster.filter((member) => member.podId === pod.id);
      const lits = roster.filter((member) => member.role === "lit");
      const podMeetings = meetings.filter((meeting) => meeting.podId === pod.id);
      const upcoming = podMeetings.filter((meeting) => meeting.meetsOn >= today())
        .sort((a, b) => a.meetsOn.localeCompare(b.meetsOn))[0] ?? null;
      const openTasks = tasks.filter((task) => task.podId === pod.id && task.status !== "Done");
      const overdueTasks = openTasks.filter((task) => !!task.dueDate && task.dueDate < today()).length;
      const attendanceDue = podMeetings.filter(
        (meeting) => meeting.meetsOn < today() && !meeting.attendanceFinalizedAt,
      ).length;
      return {
        pod, roster, lits, upcoming, openTasks, overdueTasks, attendanceDue,
        iLead: !!myId && lits.some((member) => member.memberId === myId),
        iAmIn: !!myId && roster.some((member) => member.memberId === myId),
      };
    });
  }, [pods, members, meetings, tasks, myId]);

  const visible = isAdmin ? rows : rows.filter((row) => row.iAmIn);
  const totals = useMemo(() => ({
    people: new Set(visible.flatMap((row) => row.roster.map((member) => member.memberId))).size,
    tasks: visible.reduce((sum, row) => sum + row.openTasks.length, 0),
    attendance: visible.reduce((sum, row) => sum + row.attendanceDue, 0),
    unstaffed: visible.filter((row) => row.lits.length === 0).length,
  }), [visible]);
  const loadError = Object.entries(loadErrors).find(([, error]) => error)?.map(String).join(": ") ?? null;

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title="Marketing & Finance"
        subtitle={isAdmin
          ? "Run weekly pods, attendance, assignments, deadlines, grants, and service hours in one place."
          : "Your meetings, assignments, deadlines, and service hours."}
      />

      {loadError ? <LoadError message={loadError} onRetry={() => window.location.reload()} />
      : pods === null ? <SkeletonRows rows={4} cols={4} />
      : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#111418] px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold text-white/80">You&apos;re not in a pod yet.</p>
          <p className="mt-1 text-[12px] text-white/40">Once a LIT adds you, your meetings and assignments appear here.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="People" value={totals.people} color="text-[#8B5E48]" />
            <StatCard label="Open assignments" value={totals.tasks} color="text-violet-700" />
            <StatCard label="Attendance due" value={totals.attendance} color={totals.attendance ? "text-red-600" : "text-emerald-700"} />
            <StatCard label="Pods without a LIT" value={totals.unstaffed} color={totals.unstaffed ? "text-amber-700" : "text-emerald-700"} />
          </div>

          {[...chapters].sort((a, b) => a.sortOrder - b.sortOrder).map((chapter) => {
            const chapterRows = visible.filter((row) => row.pod.chapterId === chapter.id);
            if (chapterRows.length === 0) return null;
            const launchingEmpty = chapter.status === "Launching" && chapterRows.every((row) => row.roster.length === 0);
            return (
              <section key={chapter.id} className="mb-7">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-white/60">{chapter.name}</h2>
                  {chapter.status === "Launching" && <Badge label="Planning" />}
                  {launchingEmpty && <span className="text-[11px] text-white/35">No active roster yet</span>}
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {chapterRows.map((row) => {
                    const division = getPodDivision(row.pod.name);
                    const meta = POD_DIVISION_META[division];
                    const primaryAlert = row.attendanceDue
                      ? `${row.attendanceDue} attendance sheet${row.attendanceDue === 1 ? "" : "s"} to finish`
                      : row.overdueTasks
                        ? `${row.overdueTasks} overdue assignment${row.overdueTasks === 1 ? "" : "s"}`
                        : row.lits.length === 0 ? "Assign a LIT"
                        : row.upcoming ? `Next meeting ${formatDate(row.upcoming.meetsOn)}` : "Schedule the next meeting";
                    const alertTone = row.attendanceDue || row.overdueTasks
                      ? "text-red-600" : row.lits.length === 0 ? "text-amber-700" : "text-white/55";
                    return (
                      <Link
                        key={row.pod.id}
                        href={`/members/pods/${row.pod.slug}`}
                        className={`group relative overflow-hidden rounded-xl border bg-[#111418] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${meta.border}`}
                      >
                        <div className={`absolute inset-y-0 left-0 w-1 ${division === "Finance" ? "bg-n-yellow" : "bg-n-orange"}`} />
                        <div className="flex items-start justify-between gap-4 pl-1">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${meta.soft} ${meta.accent}`}>{meta.label}</span>
                              {row.iLead && <Badge label="lit" />}
                            </div>
                            <h3 className="font-display text-lg font-semibold text-white group-hover:text-[#8B5E48]">{row.pod.name}</h3>
                            <p className="mt-1 truncate text-[11px] text-white/45">
                              {row.lits.length
                                ? <>Led by {row.lits.map((lit) => nameById.get(lit.memberId) ?? "Unknown").join(", ")}</>
                                : "No LIT assigned"}
                            </p>
                          </div>
                          <span aria-hidden="true" className="text-xl text-white/25 transition group-hover:translate-x-1 group-hover:text-white/60">→</span>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
                          <div><p className="font-mono text-base font-semibold text-white/85">{row.roster.length}</p><p className="text-[9px] uppercase tracking-wide text-white/35">People</p></div>
                          <div><p className="font-mono text-base font-semibold text-white/85">{row.openTasks.length}</p><p className="text-[9px] uppercase tracking-wide text-white/35">Open work</p></div>
                          <div><p className="font-mono text-base font-semibold text-white/85">{row.pod.defaultMeetingHours}h</p><p className="text-[9px] uppercase tracking-wide text-white/35">Per meeting</p></div>
                        </div>
                        <p className={`mt-3 text-[11px] font-medium ${alertTone}`}>{primaryAlert}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </MembersLayout>
  );
}
