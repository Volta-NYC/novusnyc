"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Badge, Empty, SkeletonRows } from "@/components/members/ui";
import {
  subscribePods, subscribePodMembers, subscribePodAssignments,
  completePodAssignment, fetchMemberHours, subscribeBusinesses,
  type Pod, type PodMember, type PodAssignment, type HoursEntry, type Business,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const SOURCE_LABEL: Record<HoursEntry["source"], string> = {
  meeting: "Meeting",
  task: "Task",
  project: "Project",
  adjustment: "Adjustment",
};

export default function MyWorkPage() {
  const { userProfile, loading } = useAuth();
  const myId = userProfile?.id ?? null;

  const [pods, setPods]               = useState<Pod[]>([]);
  const [podMembers, setPodMembers]   = useState<PodMember[]>([]);
  const [assignments, setAssignments] = useState<PodAssignment[] | null>(null);
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [hours, setHours]             = useState<HoursEntry[] | null>(null);

  useEffect(() => subscribePods(setPods), []);
  useEffect(() => subscribePodMembers(setPodMembers), []);
  useEffect(() => subscribePodAssignments(setAssignments), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

  useEffect(() => {
    if (!myId) return;
    let live = true;
    void fetchMemberHours(myId).then((h) => { if (live) setHours(h); });
    return () => { live = false; };
  }, [myId]);

  const myPods = useMemo(() => {
    const ids = new Set(podMembers.filter((m) => m.memberId === myId && !m.leftAt).map((m) => m.podId));
    return pods.filter((p) => ids.has(p.id));
  }, [pods, podMembers, myId]);

  const litOf = useMemo(
    () => new Set(podMembers.filter((m) => m.memberId === myId && m.role === "lit" && !m.leftAt).map((m) => m.podId)),
    [podMembers, myId],
  );

  const myTasks = useMemo(() => {
    if (!assignments || !myId) return [];
    return assignments
      .filter((a) => a.assignedMemberIds.includes(myId))
      .sort((a, b) => {
        if ((a.status === "Done") !== (b.status === "Done")) return a.status === "Done" ? 1 : -1;
        return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      });
  }, [assignments, myId]);

  const myProjects = useMemo(
    () => businesses.filter((b) => !b.archived && (b.assignees ?? []).includes(myId ?? "")),
    [businesses, myId],
  );

  const totalHours = useMemo(
    () => (hours ?? []).reduce((sum, h) => sum + Number(h.hours || 0), 0),
    [hours],
  );

  const podName = (id: string) => pods.find((p) => p.id === id)?.name ?? "";
  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title="My Work"
        subtitle="What's assigned to you, and the hours it has earned."
      />

      {/* Hours — the headline number, because it's the one that ends up on a
          service letter at the end of the term. */}
      <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-[#111418] px-4 py-3">
        <div>
          <span className="font-mono text-2xl font-semibold tabular-nums text-[#F3E28D]">
            {totalHours.toFixed(1)}
          </span>
          <span className="ml-1.5 text-[11px] uppercase tracking-wide text-white/40">hours</span>
        </div>
        {(["meeting", "task", "project"] as const).map((src) => {
          const n = (hours ?? []).filter((h) => h.source === src)
            .reduce((s, h) => s + Number(h.hours || 0), 0);
          if (!n) return null;
          return (
            <div key={src} className="text-[11px] text-white/45">
              <span className="font-mono tabular-nums text-white/70">{n.toFixed(1)}</span>{" "}
              {SOURCE_LABEL[src].toLowerCase()}s
            </div>
          );
        })}
        {myPods.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {myPods.map((p) => (
              <Link
                key={p.id}
                href={`/members/pods/${p.slug}`}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                {p.name}
                {litOf.has(p.id) && <Badge label="lit" />}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tasks */}
      <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Assignments</h2>
      {assignments === null ? (
        <SkeletonRows rows={3} cols={3} />
      ) : myTasks.length === 0 ? (
        <Empty message="Nothing assigned to you right now." />
      ) : (
        <div className="mb-6 divide-y divide-white/5 rounded-lg border border-white/10">
          {myTasks.map((a) => {
            const overdue = a.status !== "Done" && a.dueDate && a.dueDate < today;
            return (
              <div key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#F3E28D]"
                  checked={a.status === "Done"}
                  onChange={(e) => void completePodAssignment(a.id, e.target.checked)}
                  aria-label={`Mark ${a.title} done`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] ${a.status === "Done" ? "text-white/35 line-through" : "text-white/90"}`}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/35">
                    {podName(a.podId)}
                    {a.dueDate && <span className={overdue ? " text-red-400" : ""}> · due {a.dueDate}</span>}
                  </p>
                </div>
                {overdue && <Badge label="Blocked" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Tech projects */}
      {myProjects.length > 0 && (
        <>
          <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Projects</h2>
          <div className="mb-6 divide-y divide-white/5 rounded-lg border border-white/10">
            {myProjects.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white/90">{b.name}</p>
                  <p className="mt-0.5 text-[10px] text-white/35">
                    {b.neighborhood || "—"}
                    {b.hoursLogged ? ` · ${b.hoursLogged}h logged` : ""}
                  </p>
                </div>
                <Badge label={b.techStatus ?? "Backlog"} />
                {(b.liveUrl || b.previewUrl) && (
                  <a
                    href={b.liveUrl || b.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#F3E28D]/80 hover:underline"
                  >
                    open ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hours detail */}
      {hours && hours.length > 0 && (
        <>
          <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Hours history</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[440px] border-collapse">
              <tbody>
                {hours.slice(0, 40).map((h, i) => (
                  <tr key={`${h.occurredOn}-${h.detail}-${i}`} className="border-b border-white/5 last:border-b-0">
                    <td className="w-24 px-3 py-1.5 font-mono text-[11px] tabular-nums text-white/45">{h.occurredOn}</td>
                    <td className="w-20 px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/30">
                      {SOURCE_LABEL[h.source]}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-white/75">{h.detail}</td>
                    <td className="w-16 px-3 py-1.5 text-right font-mono text-[11px] tabular-nums text-white/70">
                      {Number(h.hours).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </MembersLayout>
  );
}
