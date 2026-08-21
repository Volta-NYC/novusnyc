"use client";

// Member overview — profile, hours earned, and pod membership.
// Replaces the credit/XP bar: hours are what ends up on a service letter.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Badge, SkeletonRows } from "@/components/members/ui";
import {
  subscribeTeam, subscribePods, subscribePodMembers, fetchMemberHours,
  type TeamMember, type Pod, type PodMember, type HoursEntry,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const SOURCE_LABEL: Record<HoursEntry["source"], string> = {
  meeting: "Meetings",
  task: "Assignments",
  project: "Projects",
  adjustment: "Adjustments",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export default function MemberOverviewPage() {
  const { user, userProfile, authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authRole === "owner" || authRole === "admin") router.replace("/members/projects");
  }, [loading, authRole, router]);

  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [pods, setPods]             = useState<Pod[]>([]);
  const [podMembers, setPodMembers] = useState<PodMember[]>([]);
  const [hours, setHours]           = useState<HoursEntry[] | null>(null);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribePods(setPods), []);
  useEffect(() => subscribePodMembers(setPodMembers), []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  useEffect(() => {
    if (!me) return;
    let live = true;
    void fetchMemberHours(me.id).then((h) => { if (live) setHours(h); });
    return () => { live = false; };
  }, [me]);

  const myPods = useMemo(() => {
    if (!me) return [];
    const mine = podMembers.filter((m) => m.memberId === me.id && !m.leftAt);
    return mine
      .map((m) => ({ pod: pods.find((p) => p.id === m.podId), role: m.role }))
      .filter((x): x is { pod: Pod; role: "lit" | "member" } => !!x.pod);
  }, [podMembers, pods, me]);

  const bySource = useMemo(() => {
    const m = new Map<HoursEntry["source"], number>();
    for (const h of hours ?? []) {
      m.set(h.source, (m.get(h.source) ?? 0) + Number(h.hours || 0));
    }
    return m;
  }, [hours]);

  const total = useMemo(
    () => (hours ?? []).reduce((s, h) => s + Number(h.hours || 0), 0),
    [hours],
  );

  const byTerm = useMemo(() => {
    // Service letters are issued semi-annually, so group the same way.
    const m = new Map<string, number>();
    for (const h of hours ?? []) {
      const [y, mo] = h.occurredOn.split("-");
      const term = `${y} · ${Number(mo) <= 6 ? "Jan–Jun" : "Jul–Dec"}`;
      m.set(term, (m.get(term) ?? 0) + Number(h.hours || 0));
    }
    return [...m].sort((a, b) => b[0].localeCompare(a[0]));
  }, [hours]);

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title={me?.name ?? "My overview"}
        subtitle={me ? [me.role, me.school].filter(Boolean).join(" · ") : undefined}
      />

      {!me ? (
        <p className="py-16 text-center text-sm text-white/30">
          We couldn&apos;t match your login to a member record. Ask an admin to check your email address.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-lg border border-white/10 bg-[#111418] px-4 py-4">
              <p className="text-[10px] uppercase tracking-wide text-white/40">Hours earned</p>
              <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-[#F3E28D]">
                {total.toFixed(1)}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                Counted toward your service letter.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#111418] px-4 py-4">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Where they came from</p>
              {hours === null ? (
                <SkeletonRows rows={3} cols={2} />
              ) : bySource.size === 0 ? (
                <p className="text-[12px] text-white/30">
                  Nothing yet. Hours start accruing when you attend a pod meeting or finish an assignment.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {(["meeting", "task", "project", "adjustment"] as const).map((src) => {
                    const n = bySource.get(src);
                    if (!n) return null;
                    const pct = total > 0 ? (n / total) * 100 : 0;
                    return (
                      <div key={src} className="flex items-center gap-2.5">
                        <span className="w-24 shrink-0 text-[11px] text-white/55">{SOURCE_LABEL[src]}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-[#F3E28D]/70" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/70">
                          {n.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {myPods.length > 0 && (
            <>
              <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">My pods</h2>
              <div className="mb-6 flex flex-wrap gap-2">
                {myPods.map(({ pod, role }) => (
                  <Link
                    key={pod.id}
                    href={`/members/pods/${pod.slug}`}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#111418] px-3 py-2 text-[12px] text-white/80 transition-colors hover:border-white/30 hover:text-white"
                  >
                    {pod.name}
                    {role === "lit" && <Badge label="lit" />}
                  </Link>
                ))}
              </div>
            </>
          )}

          {byTerm.length > 0 && (
            <>
              <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">By term</h2>
              <div className="mb-6 overflow-hidden rounded-lg border border-white/10">
                {byTerm.map(([term, n]) => (
                  <div key={term} className="flex items-center justify-between border-b border-white/5 px-3 py-2 last:border-b-0">
                    <span className="text-[12px] text-white/75">{term}</span>
                    <span className="font-mono text-[12px] tabular-nums text-white/85">{n.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {hours && hours.length > 0 && (
            <>
              <h2 className="mb-2 text-[11px] uppercase tracking-wide text-white/40">Recent activity</h2>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[440px] border-collapse">
                  <tbody>
                    {hours.slice(0, 25).map((h, i) => (
                      <tr key={`${h.occurredOn}-${i}`} className="border-b border-white/5 last:border-b-0">
                        <td className="w-24 px-3 py-1.5 font-mono text-[11px] tabular-nums text-white/45">{h.occurredOn}</td>
                        <td className="w-24 px-3 py-1.5 text-[10px] text-white/30">{h.department}</td>
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
        </>
      )}
    </MembersLayout>
  );
}
