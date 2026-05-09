"use client";

// Member-facing assignment detail page. Light theme. Shows full description,
// business context, who else is working it, and the claim → submit flow.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  getAssignmentClaimsList, getAssignmentsList, getBusinessesList,
  getCyclesList, getTeamMembersList,
  createAssignmentClaim, updateAssignmentClaim, deleteAssignmentClaim,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember, pickPrimaryTrack } from "@/lib/members/cycleCompute";

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
};

const TRACK_PILL: Record<CycleTrack, string> = {
  Tech: "bg-blue-100 text-blue-800 border-blue-200",
  Marketing: "bg-lime-100 text-lime-900 border-lime-200",
  Finance: "bg-amber-100 text-amber-900 border-amber-200",
};

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

const ROLE_RANK: Record<string, number> = {
  Analyst: 0,
  "Senior Analyst": 1,
  Associate: 2,
  "Senior Associate": 3,
  Board: 4,
};

export default function AssignmentDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, userProfile } = useAuth();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      getTeamMembersList().then(setTeam),
      getCyclesList().then(setCycles),
      getAssignmentsList().then(setAssignments),
      getAssignmentClaimsList().then(setClaims),
      getBusinessesList().then(setBusinesses),
    ]);
  }, []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const id = params?.id ?? "";
  const assignment = useMemo(() => assignments.find((a) => a.id === id) ?? null, [assignments, id]);
  const business = assignment?.businessId ? businesses.find((b) => b.id === assignment.businessId) : null;
  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const classification = me ? classifyMember(me) : null;
  const primaryTrack = me ? pickPrimaryTrack(me) : null;

  const assignmentClaims = useMemo(
    () => claims.filter((c) => c.assignmentId === id),
    [claims, id],
  );
  const myClaim = useMemo(
    () => me ? assignmentClaims.find((c) => c.memberId === me.id) ?? null : null,
    [assignmentClaims, me],
  );
  const activeClaims = assignmentClaims.filter((c) => c.status !== "rejected");

  if (!assignment) {
    return (
      <MembersLayout>
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-sm text-black/55">Assignment not found.</p>
          <Link href="/members/work" className="text-xs text-[#5C9911] hover:text-[#85CC17] mt-3 inline-block">
            ← Back to marketplace
          </Link>
        </div>
      </MembersLayout>
    );
  }

  const memberRole = String(me?.role ?? "");
  const memberRank = ROLE_RANK[memberRole] ?? -1;
  const requiredRank = ROLE_RANK[assignment.minRole] ?? 0;
  const meetsRoleGate = memberRank >= requiredRank;

  const isLeadership = classification?.status === "leadership";
  const isReserve = classification?.status === "reserve";
  const isFull = activeClaims.length >= assignment.capacity;
  const cycleMatches = activeCycle && assignment.cycleId === activeCycle.id;
  const visibleHere = (assignment.visibleTracks ?? [assignment.primaryTrack]).includes(primaryTrack as CycleTrack);

  const canClaim = !!me && !myClaim && !isFull && !isLeadership && !isReserve && cycleMatches && meetsRoleGate;
  const canSubmit = myClaim && (myClaim.status === "claimed" || myClaim.status === "in_progress" || myClaim.status === "rejected");
  const canMarkInProgress = myClaim && myClaim.status === "claimed";
  const canUnclaim = myClaim && (myClaim.status === "claimed" || myClaim.status === "in_progress");

  const handleClaim = async () => {
    if (!me || !activeCycle) return;
    setBusy(true);
    try {
      await createAssignmentClaim({
        assignmentId: assignment.id,
        memberId: me.id,
        memberName: me.name,
        cycleId: activeCycle.id,
        status: "claimed",
        claimedAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleMarkInProgress = async () => {
    if (!myClaim) return;
    setBusy(true);
    try {
      await updateAssignmentClaim(myClaim.id, { status: "in_progress" });
    } finally {
      setBusy(false);
    }
  };

  const handleUnclaim = async () => {
    if (!myClaim) return;
    if (!confirm("Release this claim? Anyone else can pick it up after.")) return;
    setBusy(true);
    try {
      await deleteAssignmentClaim(myClaim.id);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!myClaim) return;
    if (!deliverableUrl.trim()) {
      alert("A deliverable link or doc is required.");
      return;
    }
    setBusy(true);
    try {
      await updateAssignmentClaim(myClaim.id, {
        status: "submitted",
        deliverableUrl: deliverableUrl.trim(),
        submissionNotes: submissionNotes.trim(),
        submittedAt: new Date().toISOString(),
      });
      setSubmitOpen(false);
      setDeliverableUrl("");
      setSubmissionNotes("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MembersLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <Link href="/members/work" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
              ← Back to marketplace
            </Link>
            <div className="flex items-center gap-2 mt-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL[assignment.primaryTrack]}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[assignment.primaryTrack]}`} />
                {assignment.primaryTrack}
              </span>
              {assignment.difficulty && (
                <span className="inline-flex items-center rounded-full border border-black/12 bg-white px-2 py-0.5 text-[10px] font-semibold text-black/65">
                  {assignment.difficulty}
                </span>
              )}
              <span className="text-[#5C9911] font-mono text-sm font-semibold">{assignment.credits} credits</span>
            </div>
            <h1 className="font-display font-bold text-black text-2xl">{assignment.title}</h1>
            {business && (
              <p className="text-sm text-black/55 mt-1">
                <Link href={`/members/work?businessId=${business.id}`} className="hover:text-black/85">
                  {business.name}
                </Link>
                {business.neighborhood && <span className="text-black/40"> · {business.neighborhood}</span>}
              </p>
            )}
          </div>
        </header>

        {/* Status banners */}
        {!cycleMatches && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This assignment is from a different cycle. It can&apos;t be claimed right now.
          </div>
        )}
        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isLeadership
              ? "You're on leadership and don't claim from the marketplace."
              : "Your account isn't currently active in the credit system."}
          </div>
        )}
        {!meetsRoleGate && cycleMatches && !isLeadership && !isReserve && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This assignment requires <strong>{assignment.minRole}</strong> or higher.
          </div>
        )}
        {!visibleHere && cycleMatches && !isLeadership && !isReserve && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            This is a cross-track assignment outside your primary track. Cross-track work counts toward your target this cycle.
          </div>
        )}

        {/* Description */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <h2 className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-2">Overview</h2>
          {assignment.description ? (
            <div
              className="prose prose-sm max-w-none text-black/85"
              // Description is admin-authored HTML.
              dangerouslySetInnerHTML={{ __html: assignment.description }}
            />
          ) : (
            <p className="text-sm text-black/45">No description yet — ask the senior associate who created this for context.</p>
          )}
        </section>

        {/* Meta + claimers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-black/55">Capacity</dt><dd className="text-black/85">{activeClaims.length} / {assignment.capacity}</dd></div>
              {assignment.estimatedHours > 0 && (
                <div className="flex justify-between"><dt className="text-black/55">Estimate</dt><dd className="text-black/85">~{assignment.estimatedHours}h</dd></div>
              )}
              {assignment.deadline && (
                <div className="flex justify-between"><dt className="text-black/55">Deadline</dt><dd className="text-black/85">{assignment.deadline}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-black/55">Min role</dt><dd className="text-black/85">{assignment.minRole}</dd></div>
              <div className="flex justify-between"><dt className="text-black/55">Visible to</dt><dd className="text-black/85">{(assignment.visibleTracks ?? [assignment.primaryTrack]).join(", ")}</dd></div>
            </dl>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white shadow-sm p-4">
            <h2 className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-3">Working on this</h2>
            {activeClaims.length === 0 ? (
              <p className="text-sm text-black/45">Nobody yet — be the first.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeClaims.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-black/85">{c.memberName}{c.memberId === me?.id && " (you)"}</span>
                    <span className="text-[10px] uppercase tracking-wider text-black/45">{c.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* My claim card */}
        {myClaim && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display font-bold text-black text-base">Your claim</h2>
              <span className="inline-flex rounded-full border border-black/12 bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/65">
                {myClaim.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-black/55 mb-3">
              Claimed {new Date(myClaim.claimedAt).toLocaleDateString()}
              {myClaim.submittedAt && ` · Submitted ${new Date(myClaim.submittedAt).toLocaleDateString()}`}
              {myClaim.approvedAt && ` · Approved ${new Date(myClaim.approvedAt).toLocaleDateString()}`}
            </p>
            {myClaim.deliverableUrl && (
              <p className="text-sm mb-2">
                <span className="text-black/55">Deliverable:</span>{" "}
                <a
                  href={myClaim.deliverableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5C9911] hover:text-[#85CC17] underline-offset-2 hover:underline break-all"
                >
                  {myClaim.deliverableUrl}
                </a>
              </p>
            )}
            {myClaim.submissionNotes && (
              <div className="rounded-lg bg-black/3 p-3 text-sm text-black/75 mb-3">{myClaim.submissionNotes}</div>
            )}
            {myClaim.status === "rejected" && myClaim.rejectReason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 mb-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1">Rejection feedback</p>
                {myClaim.rejectReason}
              </div>
            )}
            {myClaim.status === "approved" && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                Approved — <strong>{myClaim.creditsAwarded ?? assignment.credits} credits</strong> added to your ledger.
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-black/8">
              {canMarkInProgress && (
                <button
                  type="button"
                  onClick={() => void handleMarkInProgress()}
                  disabled={busy}
                  className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-black/85 hover:border-black/35 disabled:opacity-50"
                >
                  Mark in progress
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => setSubmitOpen(true)}
                  disabled={busy}
                  className="rounded-lg bg-[#85CC17] hover:bg-[#9BE22B] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {myClaim.status === "rejected" ? "Resubmit" : "Submit for approval"}
                </button>
              )}
              {canUnclaim && (
                <button
                  type="button"
                  onClick={() => void handleUnclaim()}
                  disabled={busy}
                  className="ml-auto rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Release claim
                </button>
              )}
            </div>
          </section>
        )}

        {/* Claim CTA */}
        {!myClaim && (
          <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
            {canClaim ? (
              <button
                type="button"
                onClick={() => void handleClaim()}
                disabled={busy}
                className="w-full rounded-lg bg-[#85CC17] hover:bg-[#9BE22B] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                Claim this assignment
              </button>
            ) : (
              <p className="text-sm text-center text-black/45">
                {isFull ? "All spots are taken." : !cycleMatches ? "Cycle is closed." : !meetsRoleGate ? `Requires ${assignment.minRole}+.` : "Claiming is disabled for your account."}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Submit modal */}
      {submitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSubmitOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5">
            <h2 className="font-display font-bold text-black text-lg">Submit for approval</h2>
            <p className="text-sm text-black/55 mt-1 mb-4">A senior associate will review and award credits.</p>

            <label className="block text-[10px] uppercase tracking-wider text-black/45 font-semibold mb-1">Deliverable URL</label>
            <input
              type="url"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder="https://docs.google.com/…"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#85CC17]/55"
            />

            <label className="block text-[10px] uppercase tracking-wider text-black/45 font-semibold mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Anything the reviewer should know."
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-[#85CC17]/55"
            />

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-black/8">
              <button
                type="button"
                onClick={() => setSubmitOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-black/65 hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy || !deliverableUrl.trim()}
                className="rounded-lg bg-[#85CC17] hover:bg-[#9BE22B] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MembersLayout>
  );
}
