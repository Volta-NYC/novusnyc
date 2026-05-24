"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember } from "@/lib/members/cycleCompute";
import { TRACK_DOT } from "@/lib/members/constants";
import { useState } from "react";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

function formatDate(s: string): string {
  const d = new Date(s + (s.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function MyClaimRow({
  claim,
  assignment,
  business,
}: {
  claim: AssignmentClaim;
  assignment: Assignment | undefined;
  business: Business | undefined;
}) {
  if (!assignment) return null;
  const track = (assignment.track ?? assignment.primaryTrack ?? "General") as CycleTrack;
  const deadline = claim.dueDate ?? assignment.deadlines?.[0]?.date ?? assignment.deadline ?? "";
  const days = deadline ? daysUntil(deadline) : null;
  const isOverdue = days != null && days <= 0;
  const creditsDisplay = claim.status === "Approved"
    ? (claim.creditsAwarded ?? assignment.credits)
    : assignment.credits;

  return (
    <Link
      href={`/members/work/${claim.assignmentId}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-black/[0.025] transition-colors group"
    >
      <div className="mt-1 flex-shrink-0">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${TRACK_DOT[track]}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black/90 group-hover:text-black truncate">{assignment.title}</p>
        <p className="text-xs text-black/50 mt-0.5">
          {business?.name ?? "Volta"}
          {business?.neighborhood && <span className="text-black/35"> · {business.neighborhood}</span>}
        </p>

        {(claim.status === "In Progress" || claim.status === "claimed") && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {deadline ? (
              <span className={`font-medium ${isOverdue ? "text-red-600" : days != null && days <= 3 ? "text-orange-600" : "text-black/55"}`}>
                {isOverdue ? `Overdue by ${Math.abs(days!)} day${Math.abs(days!) !== 1 ? "s" : ""}` : `Due ${formatDate(deadline)} · ${days}d left`}
              </span>
            ) : (
              <span className="text-black/40">No deadline set</span>
            )}
            <span className="text-[#5C9911] font-medium">Submit work to earn {creditsDisplay} credits →</span>
          </div>
        )}

        {claim.status === "Submitted" && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {claim.submittedAt && <span className="text-black/45">Submitted {formatDate(claim.submittedAt)}</span>}
            {claim.deliverableUrl && <span className="text-black/40 truncate max-w-[200px]">{claim.deliverableUrl}</span>}
          </div>
        )}

        {claim.status === "Approved" && (
          <div className="mt-2 text-xs text-black/45">
            {claim.approvedAt && `Approved ${formatDate(claim.approvedAt)}`}
          </div>
        )}

        {claim.status === "rejected" && (
          <div className="mt-2 text-xs text-red-700">
            Rejected{claim.rejectReason ? `: ${claim.rejectReason}` : ""}
            <span className="ml-2 text-[#5C9911] font-medium">Resubmit →</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {claim.status === "Approved" ? (
          <span className="text-sm font-bold text-[#5C9911]">+{creditsDisplay} credits</span>
        ) : (
          <span className="text-xs text-black/40">{assignment.credits} credits</span>
        )}
        <StatusBadge status={claim.status} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "In Progress": "bg-cyan-100 text-cyan-800 border-cyan-200",
    claimed:       "bg-cyan-100 text-cyan-800 border-cyan-200",
    Submitted:     "bg-yellow-100 text-yellow-800 border-yellow-200",
    Approved:      "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected:      "bg-red-100 text-red-800 border-red-200",
  };
  const label = status === "claimed" ? "In Progress" : status;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {label}
    </span>
  );
}

function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${dot}`} />
      <p className="text-[10px] uppercase tracking-wider text-black/45 font-semibold">
        {label} · {count}
      </p>
    </div>
  );
}

export default function MyWorkPage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    const u1 = subscribeCycles(setCycles);
    const u2 = subscribeAssignments(setAssignments);
    const u3 = subscribeAssignmentClaims(setClaims);
    const u4 = subscribeBusinesses(setBusinesses);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const classification = me ? classifyMember(me) : null;
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);
  const assignmentsById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);

  const myClaims = useMemo(() => {
    if (!me || !activeCycle) return [];
    return claims.filter((c) => c.memberId === me.id && c.cycleId === activeCycle.id);
  }, [claims, me, activeCycle]);

  const myInProgress = useMemo(() => myClaims.filter((c) => c.status === "In Progress" || c.status === "claimed"), [myClaims]);
  const mySubmitted  = useMemo(() => myClaims.filter((c) => c.status === "Submitted"), [myClaims]);
  const myApproved   = useMemo(() => myClaims.filter((c) => c.status === "Approved"), [myClaims]);
  const myRejected   = useMemo(() => myClaims.filter((c) => c.status === "rejected"), [myClaims]);

  const isLeadership = classification?.status === "leadership";
  const isReserve    = classification?.status === "reserve";
  const hasMyClaims  = myClaims.length > 0;

  function claimRow(c: AssignmentClaim) {
    const a = assignmentsById.get(c.assignmentId);
    return (
      <MyClaimRow
        key={c.id}
        claim={c}
        assignment={a}
        business={a?.businessId ? businessById.get(a.businessId) : undefined}
      />
    );
  }

  return (
    <MembersLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="font-display font-bold text-black text-3xl">Work</h1>
          <p className="text-sm text-black/50 mt-1">
            {activeCycle ? activeCycle.name : "Current cycle"}
            {hasMyClaims && ` · ${myClaims.length} assignment${myClaims.length !== 1 ? "s" : ""}`}
          </p>
        </header>

        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isLeadership
              ? "You're on leadership — this view is read-only for you."
              : "Your account isn't active in the credit system — claiming is disabled."}
          </div>
        )}

        <section className="rounded-2xl border border-black/8 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
            <h2 className="font-display font-bold text-black text-base">My Assignments</h2>
            {activeCycle && <span className="text-xs text-black/40">{activeCycle.name}</span>}
          </div>

          {!hasMyClaims ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-black/45 mb-1">No assignments yet this cycle.</p>
              <p className="text-xs text-black/35 mb-4">Browse the catalog to find something that matches your skills.</p>
              <Link
                href="/members/work/catalog"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#85CC17]/40 bg-[#85CC17]/8 px-4 py-2 text-sm font-medium text-[#5C9911] hover:bg-[#85CC17]/15 transition-colors"
              >
                Browse Assignment Catalog →
              </Link>
            </div>
          ) : (
            <div>
              {myInProgress.length > 0 && (
                <>
                  <SectionHeader dot="bg-cyan-400" label="In Progress" count={myInProgress.length} />
                  <div className="divide-y divide-black/6">{myInProgress.map(claimRow)}</div>
                </>
              )}
              {mySubmitted.length > 0 && (
                <div className={myInProgress.length > 0 ? "border-t border-black/6" : ""}>
                  <SectionHeader dot="bg-yellow-400" label="Awaiting Review" count={mySubmitted.length} />
                  <div className="divide-y divide-black/6">{mySubmitted.map(claimRow)}</div>
                </div>
              )}
              {myApproved.length > 0 && (
                <div className={(myInProgress.length > 0 || mySubmitted.length > 0) ? "border-t border-black/6" : ""}>
                  <SectionHeader dot="bg-emerald-400" label="Completed" count={myApproved.length} />
                  <div className="divide-y divide-black/6">{myApproved.map(claimRow)}</div>
                </div>
              )}
              {myRejected.length > 0 && (
                <div className="border-t border-black/6">
                  <SectionHeader dot="bg-red-400" label="Needs Resubmission" count={myRejected.length} />
                  <div className="divide-y divide-black/6">{myRejected.map(claimRow)}</div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </MembersLayout>
  );
}
