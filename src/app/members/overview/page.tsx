"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Empty, PageHeader, StatCard } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeBusinesses,
  subscribeFinanceAssignments,
  subscribeTeam,
  type Business,
  type FinanceAssignment,
  type TeamMember,
} from "@/lib/members/storage";

const TRACKS = ["Tech", "Marketing", "Finance"] as const;

function normalizeStatus(value: unknown): "Ongoing" | "Upcoming" | "Completed" {
  const raw = String(value ?? "").trim();
  if (raw === "Ongoing" || raw === "Active") return "Ongoing";
  if (raw === "Completed" || raw === "Complete") return "Completed";
  return "Upcoming";
}

function countBusinessTrack(businesses: Business[], track: string): number {
  return businesses.filter((business) => {
    const tracks = Array.isArray(business.projectTracks) ? business.projectTracks : [];
    if (tracks.includes(track as "Tech" | "Marketing" | "Finance")) return true;
    return String(business.division ?? "") === track;
  }).length;
}

export default function AdminOverviewPage() {
  const { authRole } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);
  useEffect(() => subscribeTeam(setTeam), []);

  const activeMembers = useMemo(
    () => team.filter((member) => String(member.status ?? "").trim().toLowerCase() !== "inactive"),
    [team],
  );

  if (authRole && authRole !== "admin") {
    return (
      <MembersLayout>
        <Empty message="Overview is available to admins." />
      </MembersLayout>
    );
  }

  const ongoingProjects = businesses.filter((business) => normalizeStatus(business.projectStatus) === "Ongoing").length;
  const upcomingProjects = businesses.filter((business) => normalizeStatus(business.projectStatus) === "Upcoming").length;
  const completedProjects = businesses.filter((business) => normalizeStatus(business.projectStatus) === "Completed").length;
  const openFinanceAssignments = financeAssignments.filter((assignment) => assignment.status !== "Completed" && assignment.type !== "Grant").length;

  return (
    <MembersLayout>
      <PageHeader title="Overview" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Ongoing Projects" value={ongoingProjects} color="text-green-400" />
        <StatCard label="Upcoming Projects" value={upcomingProjects} color="text-blue-300" />
        <StatCard label="Completed Projects" value={completedProjects} color="text-violet-300" />
        <StatCard label="Open Assignments" value={openFinanceAssignments} color="text-amber-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-[#1C1F26] border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3">Quarter Snapshot</h2>
          <div className="space-y-2 text-sm text-white/65">
            <p>Active members: <span className="text-white/90 font-semibold">{activeMembers.length}</span></p>
            {TRACKS.map((track) => (
              <p key={track}>{track} projects: <span className="text-white/90 font-semibold">{countBusinessTrack(businesses, track)}</span></p>
            ))}
          </div>
        </section>

        <section className="bg-[#1C1F26] border border-white/10 rounded-xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3">Credit Guidance</h2>
          <p className="text-sm text-white/65 leading-relaxed">
            Use 1 credit as roughly 1 hour of expected work when scoping assignments, deadlines, and member workload.
          </p>
        </section>
      </div>
    </MembersLayout>
  );
}
