"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeTeam, subscribeProjects, subscribeTasks, updateTask, subscribeGrants,
  type TeamMember, type Project, type Task, type Grant,
} from "@/lib/members/storage";
import { Badge, Btn } from "@/components/members/ui";

// ── TASK STATUS TEXT COLORS ───────────────────────────────────────────────────

const TASK_STATUS_COLOR: Record<string, string> = {
  "To Do":     "text-gray-400",
  "In Progress": "text-blue-400",
  "Blocked":   "text-red-400",
  "In Review": "text-yellow-400",
  "Done":      "text-green-400",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function MyWorkPage() {
  const { user } = useAuth();
  const [team, setTeam]         = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [grants, setGrants]     = useState<Grant[]>([]);

  // Subscribe to all four collections; unsubscribe on unmount.
  useEffect(() => {
    const unsubscribeTeam     = subscribeTeam(setTeam);
    const unsubscribeProjects = subscribeProjects(setProjects);
    const unsubscribeTasks    = subscribeTasks(setTasks);
    const unsubscribeGrants   = subscribeGrants(setGrants);
    return () => { unsubscribeTeam(); unsubscribeProjects(); unsubscribeTasks(); unsubscribeGrants(); };
  }, []);

  const myEmail = user?.email?.toLowerCase() ?? "";

  // Find the logged-in user's team record by matching their login email.
  const myMember = team.find(m => m.email.toLowerCase() === myEmail);
  const myName   = myMember?.name ?? "";

  // Projects where I am listed as team lead or a team member (matched by name).
  const myProjects = projects.filter(project =>
    myName && (
      project.teamLead.toLowerCase() === myName.toLowerCase()
      // Guard: teamMembers may be undefined if Firebase omitted the empty array.
      || (project.teamMembers ?? []).some(m => m.toLowerCase() === myName.toLowerCase())
    )
  );

  // Tasks assigned to me, split into open and completed.
  const myTasks   = tasks.filter(t => myName && t.assignedTo.toLowerCase() === myName.toLowerCase());
  const openTasks = myTasks.filter(t => t.status !== "Done");
  const doneTasks = myTasks.filter(t => t.status === "Done");

  // Grants assigned to this member as researcher.
  const myGrants = grants.filter(g => myName && g.assignedResearcher.toLowerCase() === myName.toLowerCase());

  // Upcoming deadlines: open tasks with due dates + grant deadlines, sorted soonest first.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDeadlines = [
    ...openTasks
      .filter(t => t.dueDate)
      .map(t => ({ label: t.name, date: t.dueDate, type: "Task" as const, status: t.status })),
    ...myGrants
      .filter(g => g.deadline && g.status !== "Awarded" && g.status !== "Rejected" && g.status !== "Cycle Closed")
      .map(g => ({ label: g.name, date: g.deadline, type: "Grant" as const, status: g.status })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  // Active teammates in the same pod (excluding myself).
  const podmates = myMember?.pod
    ? team.filter(m => m.pod === myMember.pod && m.id !== myMember.id && m.status === "Active")
    : [];

  // If auth email is set but no team record matches, show an onboarding prompt.
  if (!myMember && myEmail) {
    return (
      <MembersLayout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="font-display font-bold text-white text-2xl mb-3">Welcome to Volta!</h1>
          <p className="text-white/50 text-sm font-body leading-relaxed">
            Your portal account is set up, but your email isn&apos;t linked to a team profile yet.
            Ask an admin to add <span className="text-[#85CC17] font-mono">{myEmail}</span> to your team record so your work shows here.
          </p>
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      {/* Personalized greeting */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-2xl">
          {myMember ? `Hi, ${myMember.name.split(" ")[0]}` : "My Work"}
        </h1>
        {myMember && (
          <p className="text-white/40 text-sm mt-1 font-body">
            {/* Guard: divisions may be undefined if Firebase omitted the empty array. */}
            {myMember.role} · {(myMember.divisions ?? []).join(", ")}
            {myMember.pod ? ` · ${myMember.pod} pod` : ""}
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left column: tasks and projects ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Open tasks */}
          <section>
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
              Open Tasks <span className="text-white/30 font-normal normal-case">({openTasks.length})</span>
            </h2>
            {openTasks.length === 0 ? (
              <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-6 text-center text-white/30 text-sm font-body">
                No open tasks assigned to you.
              </div>
            ) : (
              <div className="space-y-2">
                {openTasks.map(task => (
                  <div key={task.id} className="bg-[#1C1F26] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{task.name}</p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {task.division}{task.dueDate ? ` · Due ${task.dueDate}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge label={task.priority} />
                      <span className={`text-xs font-medium ${TASK_STATUS_COLOR[task.status] ?? "text-white/40"}`}>
                        {task.status}
                      </span>
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => updateTask(task.id, { status: "Done", completedAt: new Date().toISOString() })}
                      >
                        ✓ Done
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My Grants */}
          {myGrants.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                My Grants <span className="text-white/30 font-normal normal-case">({myGrants.length})</span>
              </h2>
              <div className="space-y-2">
                {myGrants.map(grant => (
                  <div key={grant.id} className="bg-[#1C1F26] border border-white/8 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-medium truncate">{grant.name}</p>
                      <Badge label={grant.status} />
                    </div>
                    <p className="text-white/30 text-xs">
                      {grant.funder}{grant.deadline ? ` · Due ${grant.deadline}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          <section>
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
              Your Projects <span className="text-white/30 font-normal normal-case">({myProjects.length})</span>
            </h2>
            {myProjects.length === 0 ? (
              <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-6 text-center text-white/30 text-sm font-body">
                No projects linked to your name yet.
              </div>
            ) : (
              <div className="space-y-2">
                {myProjects.map(project => (
                  <div key={project.id} className="bg-[#1C1F26] border border-white/8 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-medium">{project.name}</p>
                      <Badge label={project.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                      <span>
                        {project.division}
                        {project.teamLead.toLowerCase() === myName.toLowerCase() ? " · You are team lead" : ""}
                      </span>
                      <span>{project.progress}</span>
                    </div>
                    {/* Progress bar using the stored percentage string directly as CSS width */}
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#85CC17] rounded-full transition-all"
                        style={{ width: project.progress }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Completed tasks (collapsed, shows last 5) */}
          {doneTasks.length > 0 && (
            <section>
              <h2 className="font-display font-bold text-white/30 text-sm uppercase tracking-wider mb-3">
                Completed <span className="font-normal normal-case">({doneTasks.length})</span>
              </h2>
              <div className="space-y-1.5">
                {doneTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="bg-[#1C1F26]/50 border border-white/4 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <p className="text-white/40 text-sm line-through truncate">{task.name}</p>
                  </div>
                ))}
                {doneTasks.length > 5 && (
                  <p className="text-white/25 text-xs text-center py-1 font-body">+{doneTasks.length - 5} more completed</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Right column: pod and quick stats ── */}
        <div>
          <section>
            <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
              {myMember?.pod ? `${myMember.pod} Pod` : "Your Pod"}
            </h2>
            {podmates.length === 0 ? (
              <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 text-center text-white/30 text-sm font-body">
                {myMember?.pod ? "No other active members in your pod." : "No pod assigned yet."}
              </div>
            ) : (
              <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-3 space-y-1.5">
                {podmates.map(podmate => (
                  <div key={podmate.id} className="flex items-center gap-3 px-2 py-2">
                    {/* Avatar with first initial */}
                    <div className="w-8 h-8 rounded-full bg-[#85CC17]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#85CC17] text-sm font-bold">{podmate.name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{podmate.name}</p>
                      <p className="text-white/35 text-xs">
                        {/* Guard: divisions may be undefined if Firebase omitted the empty array. */}
                        {podmate.role} · {(podmate.divisions ?? []).join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Deadlines */}
          {upcomingDeadlines.length > 0 && (
            <section className="mt-5">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                Upcoming Deadlines
              </h2>
              <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-3 space-y-2">
                {upcomingDeadlines.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-2 py-1.5">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                      item.type === "Grant" ? "bg-yellow-500/15 text-yellow-400" : "bg-blue-500/15 text-blue-400"
                    }`}>{item.type}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs font-medium truncate">{item.label}</p>
                      <p className="text-white/30 text-xs">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick numeric stats */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4 text-center">
              <p className="font-display font-bold text-2xl text-[#85CC17]">{openTasks.length}</p>
              <p className="text-white/40 text-xs mt-1 font-body">Tasks</p>
            </div>
            <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4 text-center">
              <p className="font-display font-bold text-2xl text-blue-400">{myProjects.length}</p>
              <p className="text-white/40 text-xs mt-1 font-body">Projects</p>
            </div>
            <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4 text-center">
              <p className="font-display font-bold text-2xl text-yellow-400">{myGrants.length}</p>
              <p className="text-white/40 text-xs mt-1 font-body">Grants</p>
            </div>
          </div>
        </div>
      </div>
    </MembersLayout>
  );
}
