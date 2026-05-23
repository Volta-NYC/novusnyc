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
import { useAuth } from "@/lib/members/authContext";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2, General: 3 };

// col 0=Title, 1=Track, 2=Business Name, 3=Claimer Names
const ASSIGNMENT_SORT_OPTIONS = [
  { value: 0, label: "Title" },
  { value: 1, label: "Track" },
  { value: 2, label: "Business Name" },
  { value: 3, label: "Claimer Names" },
];

const REVIEW_COLS = [
  { key: "member",      label: "Member",      width: 180 },
  { key: "assignment",  label: "Assignment",  width: 280 },
  { key: "track",       label: "Track",       width: 90  },
  { key: "credits",     label: "Credits",     width: 65  },
  { key: "submitted",   label: "Submitted",   width: 110 },
  { key: "deliverable", label: "Deliverable", width: 150 },
  { key: "notes",       label: "Notes",       width: 180 },
  { key: "actions",     label: "Actions",     width: 160 },
];

const DEFAULT_ASSIGNMENT_SORT_RULES: SortRule[] = [
  { col: 1, dir: "asc" },
  { col: 0, dir: "asc" },
  { col: 2, dir: "asc" },
  { col: 3, dir: "asc" },
];

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
  const [sortRules, setSortRules] = useState<SortRule[]>(DEFAULT_ASSIGNMENT_SORT_RULES);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    const unsub1 = subscribeAssignmentClaims(setClaims);
    const unsub2 = subscribeAssignments(setAssignments);
    const unsub3 = subscribeBusinesses(setBusinesses);
    const unsub4 = subscribeEmailTemplates(setTemplates);
    const unsub5 = subscribeProjectGroups(setProjectGroups);
    const unsub6 = subscribeAutomationConfigs(setAutomationConfigs);
    const unsub7 = subscribeTeam(setTeam);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
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
        const groupLabel = resolveGroupLabel(a);
        return [
          c.memberName,
          a?.title,
          a?.track ?? a?.primaryTrack,
          groupLabel,
        ].some((v) => String(v ?? "").toLowerCase().includes(q));
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
    const usedCols = new Set(sortRules.map((r) => r.col));
    const next = ASSIGNMENT_SORT_OPTIONS.find((o) => !usedCols.has(o.value));
    if (!next) return;
    setSortRules((prev) => [...prev, { col: next.value, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [...DEFAULT_ASSIGNMENT_SORT_RULES] : next;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) => {
    setSortRules((prev) =>
      prev.map((rule, i) => {
        if (i !== idx) return rule;
        if (field === "col") return { ...rule, col: Number(value) };
        return { ...rule, dir: value as "asc" | "desc" };
      }),
    );
  };

  const recentDecisions = useMemo(() => {
    return claims
      .filter((c) => c.status === "Approved" || c.status === "rejected")
      .sort((a, b) => {
        const ta = a.approvedAt ?? a.rejectedAt ?? "";
        const tb = b.approvedAt ?? b.rejectedAt ?? "";
        return tb.localeCompare(ta);
      })
      .slice(0, 12);
  }, [claims]);

  const reviewerLabel = userProfile?.email || user?.email || user?.id || "unknown";

  const buildReviewInput = (claim: AssignmentClaim): ReviewInput => {
    const assignment = assignmentById.get(claim.assignmentId);
    const business = assignment?.businessId ? businessById.get(assignment.businessId) : undefined;
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
    if (!rejectingClaim) return;
    if (!rejectReason.trim()) return;
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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search title, type, track, business, neighborhood, claimer…"
        />
        <ViewPanel active={hiddenCols.size > 0 || sortRules.length !== DEFAULT_ASSIGNMENT_SORT_RULES.length}>
          <ViewSection label="Sort">
            <SortPanel
              rules={sortRules}
              options={ASSIGNMENT_SORT_OPTIONS}
              onChange={updateSortRule}
              onAdd={addSortRule}
              onRemove={removeSortRule}
              onReset={() => setSortRules([...DEFAULT_ASSIGNMENT_SORT_RULES])}
            />
          </ViewSection>
          <ViewSection label="Columns">
            <div className="space-y-1">
              {REVIEW_COLS.filter((c) => c.key !== "actions").map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={!hiddenCols.has(col.key)}
                    onChange={(e) => setHiddenCols((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.delete(col.key); else next.add(col.key);
                      return next;
                    })}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </ViewSection>
        </ViewPanel>
      </div>

      {(() => {
        const visCols = REVIEW_COLS.filter((c) => !hiddenCols.has(c.key));
        const tableWidth = 40 + visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
            <table className="table-fixed text-left" style={{ width: "100%", minWidth: tableWidth }}>
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[40px]">
                    <input type="checkbox" className="members-checkbox"
                      checked={queue.length > 0 && queue.every((c) => selectedIds.has(c.id))}
                      onChange={(e) => { if (e.target.checked) setSelectedIds(new Set(queue.map((c) => c.id))); else setSelectedIds(new Set()); }}
                    />
                  </th>
                  {visCols.map((col) => (
                    <th key={col.key} style={{ width: col.width }} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 whitespace-nowrap">
                      <span className="inline-flex items-center">
                        {col.label}
                        {col.key !== "actions" && (
                          <button className="members-col-hide-btn" onClick={() => setHiddenCols((p) => new Set([...p, col.key]))} title={`Hide ${col.label}`}>✕</button>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map((c) => {
                  const a = assignmentById.get(c.assignmentId);
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.025]">
                      <td className="px-3 py-0 h-9 align-middle">
                        <input type="checkbox" className="members-checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelected(c.id)} />
                      </td>
                      {visCols.map((col) => {
                        switch (col.key) {
                          case "member": return <td key="member" className="px-3 py-0 h-9 text-[11px] text-white/85 align-middle overflow-hidden"><span className="block truncate" title={c.memberName ?? ""}>{c.memberName}</span></td>;
                          case "assignment": return <td key="assignment" className="px-3 py-0 h-9 text-[11px] text-white/80 align-middle overflow-hidden"><span className="font-medium block truncate" title={a?.title ?? ""}>{a?.title ?? "Unknown assignment"}</span></td>;
                          case "track": return <td key="track" className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle">{a?.track ?? a?.primaryTrack ?? "—"}</td>;
                          case "credits": return <td key="credits" className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{a?.credits ?? 0}</td>;
                          case "submitted": return <td key="submitted" className="px-3 py-0 h-9 text-[11px] text-white/50 align-middle">{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "—"}</td>;
                          case "deliverable": return (
                            <td key="deliverable" className="px-3 py-0 h-9 text-[11px] align-middle overflow-hidden">
                              {c.deliverableUrl ? (
                                <a href={c.deliverableUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-[#85CC17] hover:text-[#9BE22B] underline-offset-2 hover:underline block truncate"
                                  title={c.deliverableUrl}>Open ↗</a>
                              ) : <span className="text-white/30">—</span>}
                            </td>
                          );
                          case "notes": return <td key="notes" className="px-3 py-0 h-9 text-[11px] text-white/45 align-middle overflow-hidden"><span className="block truncate" title={c.submissionNotes ?? ""}>{c.submissionNotes || <span className="text-white/25">—</span>}</span></td>;
                          case "actions": return (
                            <td key="actions" className="px-2 py-0 h-9 align-middle">
                              <div className="members-row-actions">
                                <Btn size="sm" variant="primary" onClick={() => openApprove(c)}>Approve</Btn>
                                <Btn size="sm" variant="danger" onClick={() => openReject(c)}>Reject</Btn>
                              </div>
                            </td>
                          );
                          default: return null;
                        }
                      })}
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
        );
      })()}

      {recentDecisions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-white/55 text-xs uppercase tracking-wider font-semibold mb-2">Recent decisions</h2>
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
            <table className="table-fixed text-left" style={{ width: "100%", minWidth: 950 }}>
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[180px]">Member</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[290px]">Assignment</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[100px]">Decision</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[70px]">Credits</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[150px]">Reviewer</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[140px]">When</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.map((c) => {
                  const a = assignmentById.get(c.assignmentId);
                  const when = c.approvedAt ?? c.rejectedAt ?? "";
                  return (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.025]">
                      <td className="px-3 py-0 h-9 text-[11px] text-white/80 align-middle overflow-hidden"><span className="block truncate">{c.memberName}</span></td>
                      <td className="px-3 py-0 h-9 text-[11px] text-white/70 align-middle overflow-hidden"><span className="block truncate" title={a?.title ?? ""}>{a?.title ?? "—"}</span></td>
                      <td className="px-3 py-0 h-9 text-[11px] align-middle">
                        <span className={`members-chip ${c.status === "Approved" ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{c.status === "Approved" ? c.creditsAwarded ?? "—" : "—"}</td>
                      <td className="px-3 py-0 h-9 text-[11px] text-white/50 align-middle overflow-hidden"><span className="block truncate">{c.approvedBy ?? "—"}</span></td>
                      <td className="px-3 py-0 h-9 text-[11px] text-white/50 align-middle">{when ? new Date(when).toLocaleDateString() : "—"}</td>
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
                <span className="block mt-0.5">{approvingClaim.claim.checkinsApproved} previous check-in{approvingClaim.claim.checkinsApproved !== 1 ? "s" : ""} · {approvingClaim.claim.totalCreditsEarned ?? 0} credits earned so far.</span>
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
                        ? "border-[#85CC17]/40 bg-[#85CC17]/10 text-[#9BE22B]"
                        : "border-white/12 text-white/45 hover:border-white/25 hover:text-white/70"
                    }`}
                  >
                    {label}
                    <span className="block text-[9px] opacity-70">{val} cr</span>
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
        {reviewError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {reviewError}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setRejectingClaim(null)} disabled={reviewBusy}>Cancel</Btn>
          <Btn variant="danger" onClick={() => void submitRejection()} disabled={!rejectReason.trim() || reviewBusy}>
            {reviewBusy ? "Sending…" : "Send Rejection"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
