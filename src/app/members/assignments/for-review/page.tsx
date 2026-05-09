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
  getAssignmentsList, getAssignmentClaimsList, getBusinessesList, getEmailTemplatesList,
  updateAssignmentClaim,
  type Assignment, type AssignmentClaim, type Business, type EmailTemplate, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";

const VOLTA_INTERNAL_ID = "__volta_internal__";

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2 };

// col 0=Title, 1=Type/Difficulty, 2=Track, 3=Business Name, 4=Claimer Names
const ASSIGNMENT_SORT_OPTIONS = [
  { value: 0, label: "Title" },
  { value: 1, label: "Type / Difficulty" },
  { value: 2, label: "Track" },
  { value: 3, label: "Business Name" },
  { value: 4, label: "Claimer Names" },
];

const REVIEW_COLS = [
  { key: "member",      label: "Member",      width: 160 },
  { key: "assignment",  label: "Assignment",  width: 260 },
  { key: "track",       label: "Track",       width: 90  },
  { key: "credits",     label: "Credits",     width: 70  },
  { key: "submitted",   label: "Submitted",   width: 110 },
  { key: "deliverable", label: "Deliverable", width: 130 },
  { key: "notes",       label: "Notes",       width: 200 },
  { key: "actions",     label: "Actions",     width: 140 },
];

const DEFAULT_ASSIGNMENT_SORT_RULES: { col: number; dir: "asc" | "desc" }[] = [
  { col: 2, dir: "asc" },
  { col: 1, dir: "asc" },
  { col: 0, dir: "asc" },
  { col: 3, dir: "asc" },
  { col: 4, dir: "asc" },
];

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
  const [sortRules, setSortRules] = useState<{ col: number; dir: "asc" | "desc" }[]>(DEFAULT_ASSIGNMENT_SORT_RULES);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [rejectingClaim, setRejectingClaim] = useState<ReviewInput | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingClaim, setApprovingClaim] = useState<ReviewInput | null>(null);
  const [creditsOverride, setCreditsOverride] = useState<string>("");

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    void Promise.all([
      getAssignmentClaimsList().then(setClaims),
      getAssignmentsList().then(setAssignments),
      getBusinessesList().then(setBusinesses),
      getEmailTemplatesList().then(setTemplates),
    ]);
  }, []);

  const assignmentById = useMemo(() => new Map(assignments.map((a) => [a.id, a])), [assignments]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const compareClaimByCol = (aC: AssignmentClaim, bC: AssignmentClaim, col: number): number => {
    const aA = assignmentById.get(aC.assignmentId);
    const bA = assignmentById.get(bC.assignmentId);
    const aB = aA?.businessId === VOLTA_INTERNAL_ID ? { name: "Volta Internal" } : aA?.businessId ? businessById.get(aA.businessId) : undefined;
    const bB = bA?.businessId === VOLTA_INTERNAL_ID ? { name: "Volta Internal" } : bA?.businessId ? businessById.get(bA.businessId) : undefined;
    switch (col) {
      case 0: return (aA?.title ?? "").localeCompare(bA?.title ?? "");
      case 1: return (aA?.difficulty ?? "").localeCompare(bA?.difficulty ?? "");
      case 2: return (TRACK_RANK[aA?.primaryTrack ?? "Tech"] ?? 9) - (TRACK_RANK[bA?.primaryTrack ?? "Tech"] ?? 9);
      case 3: return (aB?.name ?? "").localeCompare(bB?.name ?? "");
      case 4: return (aC.memberName ?? "").localeCompare(bC.memberName ?? "");
      default: return 0;
    }
  };

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
          a?.difficulty,
          a?.primaryTrack,
          business?.name,
          business?.neighborhood,
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

      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search title, type, track, business, neighborhood, claimer…"
          />
        </div>
        <div className="relative">
          <Btn size="sm" variant="ghost" onClick={() => { setColsMenuOpen((v) => !v); setShowSortPanel(false); }}>
            Columns{hiddenCols.size > 0 ? ` (${hiddenCols.size} hidden)` : ""}
          </Btn>
          {colsMenuOpen && (
            <div className="members-col-panel">
              <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-white/40">Show / Hide Columns</p>
              {REVIEW_COLS.filter((c) => c.key !== "actions").map((col) => (
                <label key={col.key}>
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
          )}
        </div>
        <div className="relative">
          <Btn size="sm" variant="ghost" onClick={() => { setShowSortPanel((v) => !v); setColsMenuOpen(false); }}>
            Sort{sortRules.length > 1 ? ` (${sortRules.length})` : ""}
          </Btn>
          {showSortPanel && (
            <div className="absolute top-full right-0 mt-1 bg-[#1C1F26] border border-white/10 rounded-lg shadow-xl z-50 p-3 w-[360px] max-w-[min(92vw,360px)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/45 uppercase tracking-wide">Sort Rules</p>
                <button type="button" className="text-[10px] text-white/55 hover:text-white transition-colors" onClick={() => setShowSortPanel(false)}>Close</button>
              </div>
              {sortRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-white/45 w-[54px]">{idx === 0 ? "Sort by" : "Then by"}</span>
                  <select
                    value={rule.col}
                    onChange={(e) => updateSortRule(idx, "col", Number(e.target.value))}
                    className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                  >
                    {ASSIGNMENT_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={rule.dir}
                    onChange={(e) => updateSortRule(idx, "dir", e.target.value)}
                    className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45 w-[72px]"
                  >
                    <option value="asc">A→Z</option>
                    <option value="desc">Z→A</option>
                  </select>
                  {sortRules.length > 1 && (
                    <button onClick={() => removeSortRule(idx)} className="members-icon-btn members-icon-btn-danger h-6 w-6 text-xs" aria-label="Remove sort rule" title="Remove sort rule">✕</button>
                  )}
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between">
                {sortRules.length < ASSIGNMENT_SORT_OPTIONS.length ? (
                  <button onClick={addSortRule} className="text-[10px] text-[#85CC17]/75 hover:text-[#85CC17] transition-colors">+ Add sort level</button>
                ) : <span />}
                <button type="button" className="text-[10px] text-white/50 hover:text-white/80 transition-colors" onClick={() => setSortRules([...DEFAULT_ASSIGNMENT_SORT_RULES])}>Reset default</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const visCols = REVIEW_COLS.filter((c) => !hiddenCols.has(c.key));
        const tableWidth = 40 + visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
            <table className="table-fixed text-left" style={{ width: tableWidth }}>
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
                          case "track": return <td key="track" className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle">{a?.primaryTrack ?? "—"}</td>;
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
                            <td key="actions" className="px-3 py-0 h-9 align-middle">
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
            <table className="table-fixed text-left" style={{ width: 870 }}>
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[160px]">Member</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[250px]">Assignment</th>
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
                        <span className={`members-chip ${c.status === "approved" ? "border-violet-400/30 bg-violet-400/10 text-violet-300" : "border-red-400/30 bg-red-400/10 text-red-300"}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{c.status === "approved" ? c.creditsAwarded ?? "—" : "—"}</td>
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
