"use client";

// Assignments → For Review. Sr Associate / Board review submitted claims
// here. Approved claims migrate to the Catalog's "completed" view; rejected
// claims send a templated email and let the member resubmit.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, TextArea, Empty, useConfirm, SearchBar,
} from "@/components/members/ui";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeEmailTemplates,
  updateAssignmentClaim,
  type Assignment, type AssignmentClaim, type Business, type EmailTemplate, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";

const VOLTA_INTERNAL_ID = "__volta_internal__";

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2 };

interface ReviewInput {
  claim: AssignmentClaim;
  assignment: Assignment | undefined;
  business: Business | undefined;
  memberEmail: string;
}

export default function ForReviewPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [rejectingClaim, setRejectingClaim] = useState<ReviewInput | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingClaim, setApprovingClaim] = useState<ReviewInput | null>(null);
  const [creditsOverride, setCreditsOverride] = useState<string>("");

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  const assignmentById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const queue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims
      .filter((c) => c.status === "submitted")
      .filter((c) => {
        if (!q) return true;
        const a = assignmentById.get(c.assignmentId);
        const business = a?.businessId === VOLTA_INTERNAL_ID
          ? { name: "Volta Internal", neighborhood: "" }
          : a?.businessId
            ? businessById.get(a.businessId)
            : undefined;
        return [
          c.memberName,
          a?.title,
          a?.description?.replace(/<[^>]+>/g, " "),
          business?.name,
          c.deliverableUrl,
          c.submissionNotes,
        ].some((v) => String(v ?? "").toLowerCase().includes(q));
      })
      // Sort same as catalog: status (all submitted here, so no-op),
      // then track, then credits low→high, then title alpha.
      .sort((a, b) => {
        const aA = assignmentById.get(a.assignmentId);
        const bA = assignmentById.get(b.assignmentId);
        const tCmp = (TRACK_RANK[aA?.primaryTrack ?? "Tech"] ?? 9) - (TRACK_RANK[bA?.primaryTrack ?? "Tech"] ?? 9);
        if (tCmp !== 0) return tCmp;
        const cCmp = (aA?.credits ?? 0) - (bA?.credits ?? 0);
        if (cCmp !== 0) return cCmp;
        return (aA?.title ?? "").localeCompare(bA?.title ?? "");
      });
  }, [claims, assignmentById, businessById, search]);

  const recentDecisions = useMemo(() => {
    return claims
      .filter((c) => c.status === "approved" || c.status === "rejected")
      .sort((a, b) => {
        const ta = a.approvedAt ?? a.rejectedAt ?? "";
        const tb = b.approvedAt ?? b.rejectedAt ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 12);
  }, [claims]);

  const reviewerLabel = userProfile?.email || user?.email || user?.uid || "unknown";

  const buildReviewInput = (claim: AssignmentClaim): ReviewInput => {
    const assignment = assignmentById.get(claim.assignmentId);
    const business = assignment?.businessId === VOLTA_INTERNAL_ID
      ? undefined
      : assignment?.businessId
        ? businessById.get(assignment.businessId)
        : undefined;
    return { claim, assignment, business, memberEmail: "" };
  };

  const openApprove = (claim: AssignmentClaim) => {
    const input = buildReviewInput(claim);
    setApprovingClaim(input);
    setCreditsOverride(String(input.assignment?.credits ?? 0));
  };

  const openReject = (claim: AssignmentClaim) => {
    setRejectingClaim(buildReviewInput(claim));
    setRejectReason("");
  };

  const confirmApprove = async (claim: AssignmentClaim, awarded: number) => {
    await updateAssignmentClaim(claim.id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: reviewerLabel,
      creditsAwarded: awarded,
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await ask(
      async () => {
        for (const id of ids) {
          const claim = claims.find((c) => c.id === id);
          if (!claim) continue;
          const a = assignmentById.get(claim.assignmentId);
          // eslint-disable-next-line no-await-in-loop
          await confirmApprove(claim, a?.credits ?? 0);
        }
        setSelectedIds(new Set());
      },
      `Approve ${ids.length} submission${ids.length === 1 ? "" : "s"} at their default credit values?`,
    );
  };

  const submitApproval = async () => {
    if (!approvingClaim) return;
    const awarded = Math.max(0, Number(creditsOverride) || 0);
    await confirmApprove(approvingClaim.claim, awarded);
    setApprovingClaim(null);
  };

  const submitRejection = async () => {
    if (!rejectingClaim) return;
    if (!rejectReason.trim()) return;
    await updateAssignmentClaim(rejectingClaim.claim.id, {
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      approvedBy: reviewerLabel,
      rejectReason: rejectReason.trim(),
    });
    if (user && rejectingClaim.memberEmail) {
      try {
        const idToken = await user.getIdToken();
        await dispatchTemplatedEmail({
          templates,
          templateKey: "assignment_rejected",
          fallback: {
            subject: `Resubmit needed — ${rejectingClaim.assignment?.title ?? "Assignment"}`,
            body: `<p>Hi ${rejectingClaim.claim.memberName},</p><p>Your submission for <strong>${rejectingClaim.assignment?.title ?? "the assignment"}</strong> needs revision.</p><blockquote>${rejectReason.trim()}</blockquote>`,
          },
          toEmail: rejectingClaim.memberEmail,
          variables: {
            memberName: rejectingClaim.claim.memberName,
            assignmentTitle: rejectingClaim.assignment?.title ?? "",
            rejectionReason: rejectReason.trim(),
          },
          idToken,
        });
      } catch { /* non-fatal */ }
    }
    setRejectingClaim(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading || authRole !== "admin") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ASSIGNMENTS_TABS} />

      <PageHeader
        title="Assignments"
        subtitle={`For Review — current assignments awaiting review. ${queue.length} submission${queue.length === 1 ? "" : "s"} pending.`}
        action={
          <Btn
            variant="secondary"
            disabled={selectedIds.size === 0}
            onClick={() => void handleBulkApprove()}
          >
            Approve {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Btn>
        }
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search member, assignment, business…"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[40px]">
                <input
                  type="checkbox"
                  className="members-checkbox"
                  checked={queue.length > 0 && queue.every((c) => selectedIds.has(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(queue.map((c) => c.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Member</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[24%]">Assignment</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Track</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Credits</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Submitted</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Deliverable</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((c) => {
              const a = assignmentById.get(c.assignmentId);
              return (
                <tr key={c.id} className="border-b border-white/8 align-top hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-sm text-white/90">{c.memberName}</td>
                  <td className="px-3 py-2.5 text-sm text-white/85">
                    <div className="font-medium">{a?.title ?? "Unknown assignment"}</div>
                    {c.submissionNotes && (
                      <div className="text-[11px] text-white/50 mt-0.5 line-clamp-2">{c.submissionNotes}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/65">{a?.primaryTrack ?? "—"}</td>
                  <td className="px-3 py-2.5 text-sm text-[#85CC17] font-mono">{a?.credits ?? 0}</td>
                  <td className="px-3 py-2.5 text-xs text-white/55">
                    {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.deliverableUrl ? (
                      <a
                        href={c.deliverableUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#85CC17] hover:text-[#9BE22B] underline-offset-2 hover:underline truncate inline-block max-w-[160px]"
                        title={c.deliverableUrl}
                      >
                        Open ↗
                      </a>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Btn size="sm" variant="primary" onClick={() => openApprove(c)}>Approve</Btn>
                      <Btn size="sm" variant="danger" onClick={() => openReject(c)}>Reject</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {queue.length === 0 && (
          <div className="p-6">
            <Empty message={search ? "Nothing matches your search." : "Nothing waiting on review. Inbox zero."} />
          </div>
        )}
      </div>

      {recentDecisions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-white/55 text-xs uppercase tracking-wider font-semibold mb-2">Recent decisions</h2>
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[20%]">Member</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[28%]">Assignment</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Decision</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Credits</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[15%]">Reviewer</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[15%]">When</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((c) => {
                  const a = assignmentById.get(c.assignmentId);
                  const when = c.approvedAt ?? c.rejectedAt ?? "";
                  return (
                    <tr key={c.id} className="border-b border-white/8">
                      <td className="px-3 py-2 text-sm text-white/85">{c.memberName}</td>
                      <td className="px-3 py-2 text-sm text-white/75">{a?.title ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                          c.status === "approved"
                            ? "border-violet-400/30 bg-violet-400/10 text-violet-300"
                            : "border-red-400/30 bg-red-400/10 text-red-300"
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-[#85CC17] font-mono">
                        {c.status === "approved" ? c.creditsAwarded ?? "—" : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/55 truncate max-w-[160px]">{c.approvedBy ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-white/55">{when ? new Date(when).toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!approvingClaim}
        onClose={() => setApprovingClaim(null)}
        title={`Approve · ${approvingClaim?.assignment?.title ?? ""}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            <span className="text-white/45">Member:</span> {approvingClaim?.claim.memberName}
          </p>
          {approvingClaim?.claim.deliverableUrl && (
            <p className="text-sm">
              <span className="text-white/45">Deliverable:</span>{" "}
              <a
                href={approvingClaim.claim.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#85CC17] hover:text-[#9BE22B] underline-offset-2 hover:underline"
              >
                {approvingClaim.claim.deliverableUrl}
              </a>
            </p>
          )}
          {approvingClaim?.claim.submissionNotes && (
            <div className="rounded-lg border border-white/10 bg-[#0F1014] p-3 text-sm text-white/75">
              <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Member notes</p>
              {approvingClaim.claim.submissionNotes}
            </div>
          )}
          <Field label="Credits to award" required>
            <Input
              type="number"
              min="0"
              value={creditsOverride}
              onChange={(e) => setCreditsOverride(e.target.value)}
            />
          </Field>
          <p className="text-[11px] text-white/40">
            Default is the assignment&apos;s full credit value ({approvingClaim?.assignment?.credits ?? 0}). Adjust down for partial completion.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setApprovingClaim(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submitApproval()}>Approve</Btn>
        </div>
      </Modal>

      <Modal
        open={!!rejectingClaim}
        onClose={() => setRejectingClaim(null)}
        title={`Reject · ${rejectingClaim?.assignment?.title ?? ""}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            <span className="text-white/45">Member:</span> {rejectingClaim?.claim.memberName}
          </p>
          <Field label="Reason for rejection" required>
            <TextArea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="What needs to change. The member will see this verbatim and can resubmit."
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setRejectingClaim(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => void submitRejection()} disabled={!rejectReason.trim()}>
            Send Rejection
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
