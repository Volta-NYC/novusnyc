"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { StatCard, Badge } from "@/components/members/ui";
import { getSession } from "@/lib/members/auth";
import { getBusinesses, getTasks, getProjects, getGrants, getBIDs, getTeam } from "@/lib/members/storage";

const MODULES = [
  { href: "/members/projects", label: "Projects", desc: "Active and past client projects", color: "border-blue-500/30 hover:border-blue-500/60" },
  { href: "/members/businesses", label: "Businesses", desc: "Client business directory", color: "border-[#85CC17]/30 hover:border-[#85CC17]/60" },
  { href: "/members/tasks", label: "Tasks", desc: "Team task board", color: "border-purple-500/30 hover:border-purple-500/60" },
  { href: "/members/bids", label: "BID Tracker", desc: "Outreach to BIDs & partners", color: "border-orange-500/30 hover:border-orange-500/60" },
  { href: "/members/grants", label: "Grant Library", desc: "Grants researched & applied", color: "border-yellow-500/30 hover:border-yellow-500/60" },
  { href: "/members/team", label: "Team Directory", desc: "Members, pods, and leads", color: "border-cyan-500/30 hover:border-cyan-500/60" },
];

export default function Dashboard() {
  const [session] = useState(getSession());
  const [data, setData] = useState({ biz: 0, tasks: 0, projects: 0, grants: 0, bids: 0, team: 0 });
  const [recentTasks, setRecentTasks] = useState<ReturnType<typeof getTasks>>([]);
  const [activeProjects, setActiveProjects] = useState<ReturnType<typeof getProjects>>([]);

  useEffect(() => {
    const biz = getBusinesses();
    const tasks = getTasks();
    const projects = getProjects();
    const grants = getGrants();
    const bids = getBIDs();
    const team = getTeam();
    setData({ biz: biz.length, tasks: tasks.length, projects: projects.length, grants: grants.length, bids: bids.length, team: team.length });
    setRecentTasks(tasks.filter(t => t.status !== "Done").slice(0, 5));
    setActiveProjects(projects.filter(p => p.status === "Active").slice(0, 4));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <MembersLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="font-display font-bold text-white text-2xl">{greeting}, {session?.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-white/40 text-sm mt-1">Volta NYC Members Portal · Spring 2026 Cohort</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Businesses" value={data.biz} />
          <StatCard label="Projects" value={data.projects} color="text-blue-400" />
          <StatCard label="Open Tasks" value={recentTasks.length} color="text-purple-400" />
          <StatCard label="Grants" value={data.grants} color="text-yellow-400" />
          <StatCard label="BIDs" value={data.bids} color="text-orange-400" />
          <StatCard label="Team" value={data.team} color="text-cyan-400" />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Active Projects */}
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-white">Active Projects</h2>
              <Link href="/members/projects" className="text-[#85CC17] text-xs hover:underline">View all →</Link>
            </div>
            {activeProjects.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-6">No active projects yet. <Link href="/members/projects" className="text-[#85CC17] hover:underline">Add one</Link></p>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((p) => (
                  <Link key={p.id} href={`/members/projects`}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:opacity-80 transition-opacity">
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-white/30 text-xs mt-0.5">{p.division} · Lead: {p.teamLead || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">{p.progress}</span>
                      <Badge label={p.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Open Tasks */}
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-white">Open Tasks</h2>
              <Link href="/members/tasks" className="text-[#85CC17] text-xs hover:underline">View all →</Link>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-6">No open tasks. <Link href="/members/tasks" className="text-[#85CC17] hover:underline">Add one</Link></p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{t.name}</p>
                      <p className="text-white/30 text-xs mt-0.5">{t.assignedTo || "Unassigned"} · {t.division}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge label={t.status} />
                      <Badge label={t.priority} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All modules */}
        <div>
          <h2 className="font-display font-bold text-white mb-3">All Databases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULES.map((m) => (
              <Link key={m.href} href={m.href}
                className={`bg-[#1C1F26] border rounded-xl p-5 transition-all hover:-translate-y-0.5 ${m.color}`}>
                <p className="font-display font-bold text-white text-base">{m.label}</p>
                <p className="text-white/40 text-sm mt-1">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MembersLayout>
  );
}
