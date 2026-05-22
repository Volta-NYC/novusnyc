"use client";

// Member-facing assignment detail page. Light theme. Shows full description,
// business context, who else is working it, and the claim → submit flow.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import { Btn } from "@/components/members/ui";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  createAssignmentClaim, updateAssignment, updateAssignmentClaim, deleteAssignmentClaim,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember } from "@/lib/members/cycleCompute";

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const TRACK_PILL: Record<CycleTrack, string> = {
  Tech: "bg-blue-100 text-blue-800 border-blue-200",
  Marketing: "bg-lime-100 text-lime-900 border-lime-200",
  Finance: "bg-amber-100 text-amber-900 border-amber-200",
  General: "bg-gray-100 text-gray-700 border-gray-200",
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
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    const unsub1 = subscribeCycles(setCycles);
    const unsub2 = subscribeAssignments(setAssignments);
    const unsub3 = subscribeAssignmentClaims(setClaims);
    const unsub4 = subscribeBusinesses(setBusinesses);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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
  const assignmentTrack = (assignment?.track ?? assignment?.primaryTrack ?? "Tech") as CycleTrack;
  const assignmentDeadline = assignment?.deadlines?.[0]?.date ?? assignment?.deadline ?? "";
  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const classification = me ? classifyMember(me) : null;

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
  const isUnlimited = assignment.capacity === 0;
  const isFull = !isUnlimited && activeClaims.length >= assignment.capacity;
  const cycleMatches = !activeCycle || !assignment.cycleId || assignment.cycleId === activeCycle.id;
  const isArchived = assignment.status === "Archived";
  const canClaim = !!me && !myClaim && !isFull && !isLeadership && !isReserve && cycleMatches && meetsRoleGate && !isArchived;
  const canSubmit = myClaim && (myClaim.status === "claimed" || myClaim.status === "In Progress" || myClaim.status === "rejected");
  const canMarkInProgress = myClaim && myClaim.status === "claimed";
  const canUnclaim = myClaim && (myClaim.status === "claimed" || myClaim.status === "In Progress");

  const isRecurring = Boolean(assignment.recurringEnabled);

  // Effective deadline: for offset type, show claim's dueDate; for hard type, use deadlines[0].
  const effectiveDeadline = (() => {
    if (isRecurring) return myClaim?.nextCheckinDue ?? null;
    if (assignment.deadlineType === "offset") return myClaim?.dueDate ?? null;
    return assignmentDeadline || null;
  })();

  const daysUntil = effectiveDeadline
    ? Math.ceil((new Date(effectiveDeadline).getTime() - Date.now()) / 86_400_000)
    : null;

  const deadlineColor = daysUntil == null
    ? "text-black/55"
    : daysUntil <= 1 ? "text-red-600 font-semibold"
    : daysUntil <= 3 ? "text-amber-600 font-semibold"
    : "text-black/80";

  const handleClaim = async () => {
    if (!me) return;
    setBusy(true);
    setActionError(null);
    try {
      // Calculate per-member due date for offset-type assignments
      const dueDate = !isRecurring && assignment.deadlineType === "offset" && assignment.deadlineOffsetDays
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + assignment.deadlineOffsetDays!);
            return d.toISOString().slice(0, 10);
          })()
        : undefined;
      // For recurring: first check-in is due in checkinIntervalDays
      const firstCheckinDue = isRecurring && assignment.checkinIntervalDays
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + assignment.checkinIntervalDays!);
            return d.toISOString().slice(0, 10);
          })()
        : undefined;
      await createAssignmentClaim({
        assignmentId: assignment.id,
        memberId: me.id,
        memberName: me.name,
        cycleId: activeCycle?.id ?? assignment.cycleId ?? "",
        status: "claimed",
        claimedAt: new Date().toISOString(),
        dueDate,
        nextCheckinDue: firstCheckinDue,
      });
      if (assignment.status === "Open") {
        await updateAssignment(assignment.id, { status: "In Progress" });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to claim. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleMarkInProgress = async () => {
    if (!myClaim) return;
    setBusy(true);
    try {
      await updateAssignmentClaim(myClaim.id, { status: "In Progress" });
    } finally {
      setBusy(false);
    }
  };

  const handleUnclaim = async () => {
    if (!myClaim) return;
    if (!confirm("Release this claim? Anyone else can pick it up after.")) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteAssignmentClaim(myClaim.id);
      // Revert assignment to Open if no other active claims remain
      const otherActive = assignmentClaims.filter(
        (c) => c.id !== myClaim.id && c.status !== "rejected" && c.status !== "Approved",
      );
      if (otherActive.length === 0 && assignment.status === "In Progress") {
        await updateAssignment(assignment.id, { status: "Open" });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to unclaim. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!myClaim) return;
    const autoApprove = assignment.requiresApproval === false;
    if (!autoApprove && !deliverableUrl.trim()) {
      alert("A deliverable link or doc is required.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (autoApprove) {
        await updateAssignmentClaim(myClaim.id, {
          status: "Approved",
          deliverableUrl: deliverableUrl.trim() || undefined,
          submissionNotes: submissionNotes.trim() || undefined,
          submittedAt: now,
          approvedAt: now,
          approvedBy: "Auto-approved",
          creditsAwarded: assignment.credits,
        });
      } else {
        await updateAssignmentClaim(myClaim.id, {
          status: "Submitted",
          deliverableUrl: deliverableUrl.trim(),
          submissionNotes: submissionNotes.trim() || undefined,
          submittedAt: now,
        });
        // Only move the assignment to Submitted if no other members are still actively working it
        const othersStillActive = assignmentClaims.filter(
          (c) => c.id !== myClaim.id && (c.status === "claimed" || c.status === "In Progress"),
        );
        if (othersStillActive.length === 0 && (assignment.status === "In Progress" || assignment.status === "Open")) {
          await updateAssignment(assignment.id, { status: "Submitted" });
        }
      }
      setSubmitOpen(false);
      setDeliverableUrl("");
      setSubmissionNotes("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MembersLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back link */}
        <Link href="/members/work" className="text-xs text-[#5C9911] hover:text-[#85CC17] font-medium">
          ← Back to available work
        </Link>

        {/* Header card */}
        <div className={`rounded-2xl border shadow-sm p-5 ${assignment.priority ? "border-amber-300 bg-amber-50/40" : "border-black/8 bg-white"}`}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL[assignmentTrack]}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[assignmentTrack]}`} />
              {assignmentTrack}
            </span>
            {assignment.priority && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                ⚡ Priority
              </span>
            )}
          </div>

          <h1 className="font-display font-bold text-black text-2xl leading-tight mb-2">{assignment.title}</h1>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-black/60">
              {business ? (
                <span>{business.name}</span>
              ) : (
                <span>Volta</span>
              )}
              {business?.neighborhood && <span className="text-black/40"> · {business.neighborhood}</span>}
            </p>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-baseline gap-1">
                <span className="font-display font-bold text-3xl text-[#5C9911] tabular-nums leading-none">{assignment.credits}</span>
                <span className="text-sm text-[#5C9911]/80 font-medium">{isRecurring ? "credits/check-in" : assignment.credits === 1 ? "credit" : "credits"}</span>
              </div>
              {isRecurring && (
                <span className="text-[10px] text-amber-700 font-medium">↻ Recurring · every {assignment.checkinIntervalDays ?? 7} days</span>
              )}
            </div>
          </div>

          {assignment.priority && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-white/60 px-4 py-2.5 text-sm text-amber-900 font-medium">
              ⚡ This is a priority assignment — it&apos;s high importance for the current cycle.
            </div>
          )}
        </div>

        {/* Status banners */}
        {assignment.status === "Archived" && (
          <div className="rounded-xl border border-black/15 bg-black/5 px-4 py-3 text-sm text-black/55">
            This assignment has been archived and is no longer accepting new claims.
          </div>
        )}
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

        {/* Description */}
        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <h2 className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-3">Overview</h2>
          {assignment.description ? (
            <div
              className="prose prose-sm max-w-none text-black/85"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.description) }}
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
              {!isUnlimited && (
                <div className="flex justify-between">
                  <dt className="text-black/55">Spots</dt>
                  <dd className={`font-medium ${isFull ? "text-red-600" : "text-black/85"}`}>
                    {activeClaims.length} / {assignment.capacity}{isFull ? " · Full" : ""}
                  </dd>
                </div>
              )}
              {assignment.estimatedHours > 0 && (
                <div className="flex justify-between">
                  <dt className="text-black/55">Estimate</dt>
                  <dd className="text-black/85">~{assignment.estimatedHours}h</dd>
                </div>
              )}
              {isRecurring ? (
                <>
                  <div className="flex justify-between">
                    <dt className="text-black/55">Check-in every</dt>
                    <dd className="text-black/85 font-medium">{assignment.checkinIntervalDays ?? 7} days</dd>
                  </div>
                  {assignment.maxDurationDays && (
                    <div className="flex justify-between">
                      <dt className="text-black/55">Max duration</dt>
                      <dd className="text-black/85">{assignment.maxDurationDays} days</dd>
                    </div>
                  )}
                  {effectiveDeadline && (
                    <div className="flex justify-between">
                      <dt className="text-black/55">Next check-in</dt>
                      <dd className={deadlineColor}>
                        {effectiveDeadline}
                        {daysUntil != null && (
                          <span className="ml-1 text-[10px] font-normal">
                            {daysUntil <= 0 ? "· overdue" : `· ${daysUntil}d`}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {effectiveDeadline && (
                    <div className="flex justify-between">
                      <dt className="text-black/55">
                        {assignment.deadlineType === "offset" ? "Your deadline" : "Deadline"}
                      </dt>
                      <dd className={deadlineColor}>
                        {effectiveDeadline}
                        {daysUntil != null && (
                          <span className={`ml-1 text-[10px] font-normal ${daysUntil <= 3 ? "" : "text-black/45"}`}>
                            {daysUntil <= 0 ? "· overdue" : `· ${daysUntil}d left`}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {!myClaim && assignment.deadlineType === "offset" && assignment.deadlineOffsetDays && !effectiveDeadline && (
                    <div className="flex justify-between">
                      <dt className="text-black/55">Deadline</dt>
                      <dd className="text-black/85">{assignment.deadlineOffsetDays} days after claiming</dd>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <dt className="text-black/55">Minimum role</dt>
                <dd className="text-black/85">{assignment.minRole}</dd>
              </div>
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
                    <span className={`${c.memberId === me?.id ? "text-[#5C9911] font-semibold" : "text-black/85"}`}>
                      {c.memberName}{c.memberId === me?.id && " (you)"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-black/45">{c.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* My claim card */}
        {myClaim && (
          <section className="rounded-2xl border border-[#85CC17]/30 bg-[#85CC17]/5 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-display font-bold text-black text-base">Your claim</h2>
              <span className="inline-flex rounded-full border border-black/12 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-black/65">
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
            {isRecurring && (myClaim.checkinsApproved ?? 0) > 0 && (
              <div className="rounded-lg border border-[#85CC17]/25 bg-[#85CC17]/5 p-3 text-sm text-[#3A6B07] mb-3">
                <div className="flex items-center justify-between">
                  <span><strong>{myClaim.checkinsApproved ?? 0}</strong> check-in{(myClaim.checkinsApproved ?? 0) !== 1 ? "s" : ""} approved</span>
                  <span className="font-bold text-[#5C9911]">+{myClaim.totalCreditsEarned ?? 0} credits earned</span>
                </div>
              </div>
            )}
            {myClaim.status === "Approved" && !isRecurring && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                Approved — <strong>{myClaim.creditsAwarded ?? assignment.credits} {(myClaim.creditsAwarded ?? assignment.credits) === 1 ? "credit" : "credits"}</strong> added to your ledger.
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
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() => setSubmitOpen(true)}
                  disabled={busy}
                >
                  {myClaim.status === "rejected"
                    ? "Resubmit"
                    : isRecurring
                      ? `Submit check-in${(myClaim.checkinsApproved ?? 0) > 0 ? ` #${(myClaim.checkinsApproved ?? 0) + 1}` : ""}`
                      : assignment.requiresApproval === false
                        ? "Mark complete"
                        : "Submit for approval"}
                </Btn>
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
              <Btn
                variant="primary"
                onClick={() => void handleClaim()}
                disabled={busy}
                className="w-full"
              >
                Claim this assignment
              </Btn>
            ) : (
              <p className="text-sm text-center text-black/45">
                {isFull ? "All spots are taken." : !cycleMatches ? "Cycle is closed." : !meetsRoleGate ? `Requires ${assignment.minRole}+.` : "Claiming is disabled for your account."}
              </p>
            )}
          </section>
        )}

        {actionError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {actionError}
          </p>
        )}
      </div>

      {/* Submit modal */}
      {submitOpen && (() => {
        const autoApprove = assignment.requiresApproval === false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSubmitOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-5">
              <h2 className="font-display font-bold text-black text-lg mb-1">
                {autoApprove ? "Mark as complete" : "Submit for approval"}
              </h2>
              <p className="text-sm text-black/55 mb-4">
                {autoApprove
                  ? `Credits will be awarded immediately — no review needed.`
                  : "A senior associate will review and award credits."}
              </p>

              {!autoApprove && (
                <>
                  <label className="block text-[10px] uppercase tracking-wider text-black/45 font-semibold mb-1">Deliverable URL <span className="text-red-500">*</span></label>
                  <input
                    type="url"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    placeholder="https://docs.google.com/…"
                    className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#85CC17]/55"
                  />
                </>
              )}
              {autoApprove && (
                <>
                  <label className="block text-[10px] uppercase tracking-wider text-black/45 font-semibold mb-1">Link (optional)</label>
                  <input
                    type="url"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#85CC17]/55"
                  />
                </>
              )}

              <label className="block text-[10px] uppercase tracking-wider text-black/45 font-semibold mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder={autoApprove ? "Anything you'd like to note." : "Anything the reviewer should know."}
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:border-[#85CC17]/55"
              />

              {actionError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-black/8">
                <button
                  type="button"
                  onClick={() => setSubmitOpen(false)}
                  disabled={busy}
                  className="rounded-lg px-3 py-1.5 text-sm text-black/65 hover:bg-black/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() => void handleSubmit()}
                  disabled={busy || (!autoApprove && !deliverableUrl.trim())}
                >
                  {busy ? "Saving…" : autoApprove ? "Mark complete" : "Submit"}
                </Btn>
              </div>
            </div>
          </div>
        );
      })()}
    </MembersLayout>
  );
}
