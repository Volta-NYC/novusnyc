"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

// Assignments → For Review. Sr Associate / Board review submitted claims
// here. Approved claims migrate to the Catalog's "completed" view; rejected
// claims send a templated email and let the member resubmit.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, TextArea, Empty, useConfirm, SearchBar, Spinner,
  ViewPanel, ViewSection, SortPanel, type SortRule,
} from "@/components/members/ui";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeEmailTemplates,
  subscribeAutomationConfigs, subscribeProjectGroups, subscribeTeam,
  updateAssignmentClaim, approveCheckinClaim,
  type Assignment, type AssignmentClaim, type AutomationConfig, type Business,
  type EmailTemplate, type CycleTrack, type ProjectGroup, type TeamMember,
} from "@/lib/members/storage";
import { TRACK_DOT } from "@/lib/members/constants";
import { useAuth } from "@/lib/members/authContext";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";


const TRACK_RANK: Record<CycleTrack, number> = { General: 0, Tech: 1, Marketing: 2, Finance: 3 };

const SORT_OPTIONS = [
  { value: 0, label: "Title" },
  { value: 1, label: "Track" },
  { value: 2, label: "Business Name" },
  { value: 3, label: "Claimer Name" },
];

const DEFAULT_SORT_RULES: SortRule[] = [
  { col: 1, dir: "asc" },
  { col: 0, dir: "asc" },
  { col: 2, dir: "asc" },
  { col: 3, dir: "asc" },
];

const LOG_STATUS_STYLES: Record<string, string> = {
  claimed:        "border-[#BEA2BA]/30 bg-[#BEA2BA]/10 text-[#D9C7D6]",
  "In Progress":  "border-[#BEA2BA]/30 bg-[#BEA2BA]/10 text-[#D9C7D6]",
  Submitted:      "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  "Under Review": "border-orange-400/30 bg-orange-400/10 text-orange-300",
  Approved:       "border-violet-400/30 bg-violet-400/10 text-violet-300",
  rejected:       "border-red-400/30 bg-red-400/10 text-red-300",
};

interface ReviewInput {
  claim: AssignmentClaim;
  assignment: Assignment | undefined;
  business: Business | undefined;
  projectGroup: ProjectGroup | undefined;
  memberEmail: string;
}

export default function ForReviewPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfig[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const [search, setSearch] = useState("");
  const [sortRules, setSortRules] = useState<SortRule[]>(DEFAULT_SORT_RULES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewingClaim, setViewingClaim] = useState<ReviewInput | null>(null);
  const [rejectingClaim, setRejectingClaim] = useState<ReviewInput | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingClaim, setApprovingClaim] = useState<ReviewInput | null>(null);
  const [creditsOverride, setCreditsOverride] = useState<string>("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    const u1 = subscribeAssignmentClaims(setClaims);
    const u2 = subscribeAssignments(setAssignments);
    const u3 = subscribeBusinesses(setBusinesses);
    const u4 = subscribeEmailTemplates(setTemplates);
    const u5 = subscribeProjectGroups(setProjectGroups);
    const u6 = subscribeAutomationConfigs(setAutomationConfigs);
    const u7 = subscribeTeam(setTeam);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, []);

  const assignmentById   = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);
  const businessById     = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);
  const projectGroupById = useMemo(() => new Map(projectGroups.map((g) => [g.id, g])), [projectGroups]);
  const emailByMemberId  = useMemo(() => new Map(team.map((m) => [m.id, m.email ?? ""])), [team]);

  const resolveGroupLabel = (a: Assignment | undefined): string => {
    if (!a) return "";
    if (a.businessId) return businessById.get(a.businessId)?.name ?? "";
    if (a.projectGroupId) return projectGroupById.get(a.projectGroupId)?.name ?? "";
    return "";
  };

  const compareClaimByCol = (aC: AssignmentClaim, bC: AssignmentClaim, col: number): number => {
    const aA = assignmentById.get(aC.assignmentId);
    const bA = assignmentById.get(bC.assignmentId);
    switch (col) {
      case 0: return (aA?.title ?? "").localeCompare(bA?.title ?? "");
      case 1: return (TRACK_RANK[aA?.track ?? aA?.primaryTrack ?? "Tech"] ?? 9) - (TRACK_RANK[bA?.track ?? bA?.primaryTrack ?? "Tech"] ?? 9);
      case 2: return resolveGroupLabel(aA).localeCompare(resolveGroupLabel(bA));
      case 3: return (aC.memberName ?? "").localeCompare(bC.memberName ?? "");
      default: return 0;
    }
  };

  const queue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims
      .filter((c) => c.status === "Submitted")
      .filter((c) => {
        if (!q) return true;
        const a = assignmentById.get(c.assignmentId);
        return [c.memberName, a?.title, a?.track ?? a?.primaryTrack, resolveGroupLabel(a)]
          .some((v) => String(v ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => {
        for (const rule of sortRules) {
          const cmp = compareClaimByCol(a, b, rule.col);
          if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
        }
        return 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, assignmentById, businessById, search, sortRules]);

  const addSortRule = () => {
    const used = new Set(sortRules.map((r) => r.col));
    const next = SORT_OPTIONS.find((o) => !used.has(o.value));
    if (!next) return;
    setSortRules((p) => [...p, { col: next.value, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((p) => {
      const n = p.filter((_, i) => i !== idx);
      return n.length === 0 ? [...DEFAULT_SORT_RULES] : n;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) =>
    setSortRules((p) =>
      p.map((r, i) => i !== idx ? r : field === "col" ? { ...r, col: Number(value) } : { ...r, dir: value as "asc" | "desc" }),
    );

  const assignmentLog = useMemo(() =>
    [...claims].sort((a, b) => {
      const ta = a.approvedAt ?? a.rejectedAt ?? a.submittedAt ?? a.claimedAt ?? "";
      const tb = b.approvedAt ?? b.rejectedAt ?? b.submittedAt ?? b.claimedAt ?? "";
      return tb.localeCompare(ta);
    }),
  [claims]);

  const reviewerLabel = userProfile?.email || user?.email || user?.id || "unknown";

  const buildReviewInput = (claim: AssignmentClaim): ReviewInput => {
    const assignment = assignmentById.get(claim.assignmentId);
    const business   = assignment?.businessId    ? businessById.get(assignment.businessId)       : undefined;
    const projectGroup = assignment?.projectGroupId ? projectGroupById.get(assignment.projectGroupId) : undefined;
    return { claim, assignment, business, projectGroup, memberEmail: emailByMemberId.get(claim.memberId) ?? "" };
  };

  const openApprove = (claim: AssignmentClaim) => {
    const input = buildReviewInput(claim);
    setApprovingClaim(input);
    setCreditsOverride(String(input.assignment?.credits ?? 0));
    setReviewError(null);
  };

  const openReject = (claim: AssignmentClaim) => {
    setRejectingClaim(buildReviewInput(claim));
    setRejectReason("");
    setReviewError(null);
  };

  const confirmApprove = async (claim: AssignmentClaim, awarded: number) => {
    const assignment = assignmentById.get(claim.assignmentId);
    if (assignment?.recurringEnabled && assignment.checkinIntervalDays) {
      await approveCheckinClaim(claim, awarded, assignment.checkinIntervalDays, reviewerLabel);
    } else {
      await updateAssignmentClaim(claim.id, {
        status: "Approved",
        approvedAt: new Date().toISOString(),
        approvedBy: reviewerLabel,
        creditsAwarded: awarded,
      });
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await ask(async () => {
      for (const id of ids) {
        const claim = claims.find((c) => c.id === id);
        if (!claim) continue;
        const a = assignmentById.get(claim.assignmentId);
        // eslint-disable-next-line no-await-in-loop
        await confirmApprove(claim, a?.credits ?? 0);
      }
      setSelectedIds(new Set());
    }, `Approve ${ids.length} submission${ids.length === 1 ? "" : "s"} at their default credit values?`);
  };

  const submitApproval = async () => {
    if (!approvingClaim) return;
    const awarded = Math.max(0, Number(creditsOverride) || 0);
    setReviewBusy(true);
    setReviewError(null);
    try {
      await confirmApprove(approvingClaim.claim, awarded);
      setApprovingClaim(null);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Approval failed. Please try again.");
    } finally {
      setReviewBusy(false);
    }
  };

  const submitRejection = async () => {
    if (!rejectingClaim || !rejectReason.trim()) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      await updateAssignmentClaim(rejectingClaim.claim.id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        approvedBy: reviewerLabel,
        rejectReason: rejectReason.trim(),
      });
      if (user && rejectingClaim.memberEmail) {
        try {
          const idToken = await getAuthToken();
          await dispatchTemplatedEmail({
            automationId: "assignment_rejected",
            automationConfigs,
            templates,
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
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Rejection failed. Please try again.");
    } finally {
      setReviewBusy(false);
    }
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64"><Spinner /></div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ASSIGNMENTS_TABS} />

      <PageHeader
        title="Assignments"
        subtitle={`For Review — ${queue.length} submission${queue.length === 1 ? "" : "s"} pending`}
        action={
          <Btn variant="secondary" disabled={selectedIds.size === 0} onClick={() => void handleBulkApprove()}>
            Approve {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Btn>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search member, assignment, track, business…" />
        <ViewPanel active={sortRules.length !== DEFAULT_SORT_RULES.length}>
          <ViewSection label="Sort">
            <SortPanel
              rules={sortRules}
              options={SORT_OPTIONS}
              onChange={updateSortRule}
              onAdd={addSortRule}
              onRemove={removeSortRule}
              onReset={() => setSortRules([...DEFAULT_SORT_RULES])}
            />
          </ViewSection>
        </ViewPanel>
      </div>

      {/* ── Pending queue ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: "860px" }}>
          <thead className="bg-[#0F1014]">
            <tr className="members-header-sep">
              <th className="px-4 py-3 w-10">
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
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-44">Member</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Assignment</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-24">Track</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-20 text-right">Credits</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-32">Submitted</th>
              <th className="px-4 py-3 w-48" />
            </tr>
          </thead>
          <tbody>
            {queue.map((c) => {
              const a    = assignmentById.get(c.assignmentId);
              const track = (a?.track ?? a?.primaryTrack ?? "General") as CycleTrack;
              const groupLabel = resolveGroupLabel(a);
              const hasSubmission = !!(c.deliverableUrl || c.submissionNotes);
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 align-top">
                    <input
                      type="checkbox"
                      className="members-checkbox mt-0.5"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <p className="text-[13px] font-semibold text-white/90 leading-snug">{c.memberName}</p>
                    {c.submittedAt && (
                      <p className="text-[11px] text-white/35 mt-0.5">
                        {new Date(c.submittedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        {" · "}
                        {new Date(c.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <p className="text-[13px] font-semibold text-white/90 leading-snug">
                      {a?.title ?? "Unknown assignment"}
                    </p>
                    {groupLabel && <p className="text-[11px] text-white/40 mt-0.5">{groupLabel}</p>}
                    {a?.recurringEnabled && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/8 px-2 py-0.5 text-[10px] text-amber-300/80">
                        ↻ Recurring · check-in #{(c.checkinsApproved ?? 0) + 1}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${TRACK_DOT[track]}`} />
                      {track}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-top text-right">
                    <span className="text-[15px] font-semibold text-[#F6B78D]">{a?.credits ?? 0}</span>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    {hasSubmission ? (
                      <button
                        type="button"
                        onClick={() => setViewingClaim(buildReviewInput(c))}
                        className="px-3 py-1.5 rounded-lg border border-[#F6B78D]/25 bg-[#F6B78D]/[0.06] text-[11px] text-[#F3E28D]/75 hover:border-[#F6B78D]/40 hover:bg-[#F6B78D]/[0.1] hover:text-[#F3E28D] transition-colors"
                      >
                        View ↗
                      </button>
                    ) : (
                      <span className="text-white/25 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openApprove(c)}
                        className="px-3 py-1.5 rounded-lg border border-[#F6B78D]/30 bg-[#F6B78D]/[0.08] text-[11px] text-[#F3E28D]/80 hover:border-[#F6B78D]/50 hover:bg-[#F6B78D]/[0.14] hover:text-[#F3E28D] transition-colors font-medium"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openReject(c)}
                        className="px-3 py-1.5 rounded-lg border border-red-400/25 bg-red-400/[0.06] text-[11px] text-red-300/75 hover:border-red-400/40 hover:bg-red-400/[0.1] hover:text-red-300 transition-colors font-medium"
                      >
                        Send Back
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {queue.length === 0 && (
          <div className="p-8">
            <Empty message={search ? "Nothing matches your search." : "Nothing waiting on review. Inbox zero."} />
          </div>
        )}
      </div>

      {/* ── Full assignment log ────────────────────────────────────────────── */}
      <div className="mt-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35 mb-3">
          Full Assignment Log · {assignmentLog.length}
        </p>
        <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: "800px" }}>
            <thead className="bg-[#0F1014]">
              <tr className="members-header-sep">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-44">Member</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Assignment</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-28">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-20 text-right">Credits</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-40">Reviewer</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-32">When</th>
              </tr>
            </thead>
            <tbody>
              {assignmentLog.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[11px] text-white/30">
                    No assignment activity yet.
                  </td>
                </tr>
              )}
              {assignmentLog.map((c) => {
                const a = assignmentById.get(c.assignmentId);
                const groupLabel = resolveGroupLabel(a);
                const when = c.approvedAt ?? c.rejectedAt ?? c.submittedAt ?? c.claimedAt ?? "";
                const statusKey = c.status as string;
                const statusLabel: Record<string, string> = { claimed: "In Progress" };
                return (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[12px] text-white/80 font-medium">{c.memberName}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <p className="text-[12px] text-white/75">{a?.title ?? "—"}</p>
                      {groupLabel && <p className="text-[11px] text-white/35 mt-0.5">{groupLabel}</p>}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`members-chip ${LOG_STATUS_STYLES[statusKey] ?? "border-white/15 bg-white/5 text-white/50"}`}>
                        {statusLabel[statusKey] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      {c.status === "Approved" ? (
                        <span className="text-[13px] font-semibold text-[#F6B78D]">{c.creditsAwarded ?? "—"}</span>
                      ) : (
                        <span className="text-[11px] text-white/25">{a?.credits ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[11px] text-white/45 block truncate">{c.approvedBy ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[11px] text-white/45 whitespace-nowrap">
                        {when ? new Date(when).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Submission viewer ─────────────────────────────────────────────── */}
      <Modal
        open={!!viewingClaim}
        onClose={() => setViewingClaim(null)}
        title={`Submission · ${viewingClaim?.claim.memberName ?? ""}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-white/70">
              <span className="text-white/45">Assignment:</span>{" "}
              <span className="text-white/85 font-medium">{viewingClaim?.assignment?.title ?? "—"}</span>
            </p>
            <p className="text-[11px] text-white/40">
              Submitted {viewingClaim?.claim.submittedAt
                ? new Date(viewingClaim.claim.submittedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>

          {viewingClaim?.claim.deliverableUrl ? (
            <div className="rounded-lg border border-[#F6B78D]/20 bg-[#F6B78D]/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Deliverable Link</p>
              <a
                href={viewingClaim.claim.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F6B78D] hover:text-[#F3E28D] underline-offset-2 hover:underline break-all text-sm"
              >
                {viewingClaim.claim.deliverableUrl}
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Deliverable Link</p>
              <p className="text-sm text-white/25">No link submitted</p>
            </div>
          )}

          {viewingClaim?.claim.submissionNotes ? (
            <div className="rounded-lg border border-white/10 bg-[#0F1014] p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Member Notes</p>
              <p className="text-sm text-white/75 whitespace-pre-wrap">{viewingClaim.claim.submissionNotes}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Member Notes</p>
              <p className="text-sm text-white/25">No notes submitted</p>
            </div>
          )}

          {viewingClaim?.assignment?.recurringEnabled && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-300/80">
              ↻ Recurring · check-in #{(viewingClaim.claim.checkinsApproved ?? 0) + 1}
              {(viewingClaim.claim.checkinsApproved ?? 0) > 0 && (
                <span className="block mt-0.5">
                  {viewingClaim.claim.checkinsApproved} previous check-in{viewingClaim.claim.checkinsApproved !== 1 ? "s" : ""}
                  {" · "}{viewingClaim.claim.totalCreditsEarned ?? 0} credits earned so far.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setViewingClaim(null)}>Close</Btn>
          <Btn variant="danger" onClick={() => { setViewingClaim(null); openReject(viewingClaim!.claim); }}>Send Back</Btn>
          <Btn variant="primary" onClick={() => { setViewingClaim(null); openApprove(viewingClaim!.claim); }}>Approve</Btn>
        </div>
      </Modal>

      {/* ── Approve modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!approvingClaim}
        onClose={() => setApprovingClaim(null)}
        title={
          approvingClaim?.assignment?.recurringEnabled
            ? `Approve Check-in · ${approvingClaim?.assignment?.title ?? ""}`
            : `Approve · ${approvingClaim?.assignment?.title ?? ""}`
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            <span className="text-white/45">Member:</span> {approvingClaim?.claim.memberName}
          </p>
          {approvingClaim?.assignment?.recurringEnabled && (
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-300/80">
              ↻ Recurring — check-in #{(approvingClaim.claim.checkinsApproved ?? 0) + 1} · approving awards {creditsOverride || approvingClaim.assignment.credits} credits and resets for next period.
              {(approvingClaim.claim.checkinsApproved ?? 0) > 0 && (
                <span className="block mt-0.5">
                  {approvingClaim.claim.checkinsApproved} previous check-in{approvingClaim.claim.checkinsApproved !== 1 ? "s" : ""}
                  {" · "}{approvingClaim.claim.totalCreditsEarned ?? 0} credits earned so far.
                </span>
              )}
            </div>
          )}
          {approvingClaim?.claim.deliverableUrl && (
            <p className="text-sm">
              <span className="text-white/45">Deliverable:</span>{" "}
              <a
                href={approvingClaim.claim.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F6B78D] hover:text-[#F3E28D] underline-offset-2 hover:underline"
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
            <div className="flex gap-1.5 mb-2">
              {[1, 0.75, 0.5, 0].map((pct) => {
                const val = Math.round((approvingClaim?.assignment?.credits ?? 0) * pct);
                const label = pct === 1 ? "Full" : pct === 0 ? "None" : `${pct * 100}%`;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCreditsOverride(String(val))}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      creditsOverride === String(val)
                        ? "border-[#F6B78D]/40 bg-[#F6B78D]/10 text-[#F3E28D]"
                        : "border-white/12 text-white/45 hover:border-white/25 hover:text-white/70"
                    }`}
                  >
                    {label}
                    <span className="block text-[9px] opacity-70">{val} credits</span>
                  </button>
                );
              })}
            </div>
            <Input
              type="number"
              min="0"
              value={creditsOverride}
              onChange={(e) => setCreditsOverride(e.target.value)}
            />
          </Field>
          <p className="text-[11px] text-white/55">
            {approvingClaim?.assignment?.recurringEnabled
              ? `Credits per check-in from the assignment (${approvingClaim?.assignment?.credits ?? 0}). Adjust for this period if needed.`
              : `Default is the assignment's full credit value (${approvingClaim?.assignment?.credits ?? 0}). Adjust down for partial completion.`
            }
          </p>
        </div>
        {reviewError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {reviewError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setApprovingClaim(null)} disabled={reviewBusy}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void submitApproval()} disabled={reviewBusy}>
            {reviewBusy ? "Saving…" : approvingClaim?.assignment?.recurringEnabled ? "Approve Check-in" : "Approve"}
          </Btn>
        </div>
      </Modal>

      {/* ── Reject modal ──────────────────────────────────────────────────── */}
      <Modal
        open={!!rejectingClaim}
        onClose={() => setRejectingClaim(null)}
        title={`Send Back · ${rejectingClaim?.assignment?.title ?? ""}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-white/70">
            <span className="text-white/45">Member:</span> {rejectingClaim?.claim.memberName}
          </p>
          <Field label="Feedback for member" required>
            <TextArea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="What needs to change. The member will see this verbatim and can resubmit."
            />
          </Field>
        </div>
        {reviewError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {reviewError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setRejectingClaim(null)} disabled={reviewBusy}>Cancel</Btn>
          <Btn variant="danger" onClick={() => void submitRejection()} disabled={!rejectReason.trim() || reviewBusy}>
            {reviewBusy ? "Sending…" : "Send Back"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
