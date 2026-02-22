"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import Link from "next/link";
import { subscribeBIDs, subscribeBusinesses, subscribeTasks, subscribeTeam, subscribeGrants } from "@/lib/members/storage";

export default function DashboardPage() {
  const [counts, setCounts] = useState({ bids: 0, businesses: 0, tasks: 0, team: 0, grants: 0, blocked: 0, active: 0 });

  useEffect(() => {
    const unsubs = [
      subscribeBIDs((bids) => setCounts(c => ({ ...c, bids: bids.length }))),
      subscribeBusinesses((b) => setCounts(c => ({ ...c, businesses: b.length, active: b.filter(x => x.projectStatus === "Active").length }))),
      subscribeTasks((t) => setCounts(c => ({ ...c, tasks: t.filter(x => x.status !== "Done").length, blocked: t.filter(x => x.status === "Blocked").length }))),
      subscribeTeam((t) => setCounts(c => ({ ...c, team: t.filter(x => x.status === "Active").length }))),
      subscribeGrants((g) => setCounts(c => ({ ...c, grants: g.filter(x => x.status === "Awarded").length }))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const cards = [
    { href: "/members/projects", label: "Active Projects", value: counts.active, color: "text-green-400", bg: "bg-green-500/8" },
    { href: "/members/projects", label: "Total Projects", value: counts.businesses, color: "text-blue-400", bg: "bg-blue-500/8" },
    { href: "/members/tasks", label: "Open Tasks", value: counts.tasks, color: "text-yellow-400", bg: "bg-yellow-500/8" },
    { href: "/members/tasks", label: "Blocked", value: counts.blocked, color: "text-red-400", bg: "bg-red-500/8" },
    { href: "/members/bids", label: "BIDs Tracked", value: counts.bids, color: "text-purple-400", bg: "bg-purple-500/8" },
    { href: "/members/grants", label: "Grants Awarded", value: counts.grants, color: "text-[#85CC17]", bg: "bg-[#85CC17]/8" },
    { href: "/members/team", label: "Active Members", value: counts.team, color: "text-cyan-400", bg: "bg-cyan-500/8" },
  ];

  const quickLinks = [
    { href: "/members/projects", label: "Projects" },
    { href: "/members/tasks", label: "Tasks" },
    { href: "/members/bids", label: "BID Tracker" },
    { href: "/members/grants", label: "Grant Library" },
    { href: "/members/team", label: "Team Directory" },
    { href: "/members/admin", label: "Export/Import Data" },
  ];

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-2xl">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Live view — updates in real-time for everyone</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}
            className={`${c.bg} border border-white/6 rounded-xl p-4 hover:border-white/15 transition-all`}>
            <p className={`font-display font-bold text-3xl ${c.color}`}>{c.value}</p>
            <p className="text-white/50 text-sm mt-1 font-body">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-[#1C1F26] border border-white/6 rounded-xl p-5">
        <h2 className="font-display font-bold text-white text-sm mb-4 uppercase tracking-wider">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="text-white/50 hover:text-white text-sm font-body py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
              → {l.label}
            </Link>
          ))}
        </div>
      </div>
    </MembersLayout>
  );
}
