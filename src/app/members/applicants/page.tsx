"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useCallback, useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { APPLICANTS_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  Btn, BulkActionBar, Empty, Modal, Field, PageHeader, SearchBar, Select, SkeletonRows, useBulkSelect, useConfirm,
  ViewPanel, ViewSection,
} from "@/components/members/ui";
import {
  type ApplicationRecord,
  type ApplicationStatus,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { gradeToClassOf } from "@/lib/grades";
import { DEFAULT_MEMBER_ROLE } from "@/lib/members/roles";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "New",
  "Interview Scheduled",
  "Interview Completed",
  "Accepted",
  "Not Accepted",
];

const VALID_NEXT_STATUSES: Record<ApplicationStatus, ApplicationStatus[]> = {
  "New":                   ["New", "Interview Scheduled"],
  "Interview Scheduled":   ["Interview Scheduled", "Interview Completed", "New"],
  "Interview Completed":   ["Interview Completed", "Accepted", "Not Accepted", "Interview Scheduled"],
  "Accepted":              ["Accepted", "Interview Completed"],
  "Not Accepted":          ["Not Accepted", "Interview Completed"],
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  "New": "bg-white/10 text-white/75 border border-white/20",
  "Interview Scheduled": "bg-blue-500/20 text-blue-200 border border-blue-400/35",
  "Interview Completed": "bg-purple-500/20 text-purple-200 border border-purple-400/35",
  "Accepted": "bg-emerald-500/20 text-emerald-200 border border-emerald-400/35",
  "Not Accepted": "bg-red-500/15 text-red-300 border border-red-400/30",
};
function normalize(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}


function formatDateTime(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ── Column definitions ─────────────────────────────────────────────────────────

type ColumnKey = "status" | "actions" | "name" | "email" | "school" | "grade" | "cityState" | "chapter" | "referral" | "tracks" | "resume" | "applied";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions" },
  { key: "school", label: "School Name" },
  { key: "grade", label: "HS Class" },
  { key: "cityState", label: "City, State" },
  { key: "chapter", label: "Chapter" },
  { key: "referral", label: "How They Heard" },
  { key: "tracks", label: "Tracks" },
  { key: "resume", label: "Resume URL" },
  { key: "applied", label: "Applied" },
];

// ── Column widths ──────────────────────────────────────────────────────────────

const COLUMN_WIDTH: Partial<Record<ColumnKey, string>> = {
  status: "w-[195px]",
  actions: "w-[310px]",
  name: "w-[170px]",
  email: "w-[240px]",
  school: "w-[230px]",
  grade: "w-[92px]",
  cityState: "w-[160px]",
  chapter: "w-[110px]",
  referral: "w-[150px]",
  tracks: "w-[220px]",
  resume: "w-[90px]",
  applied: "w-[170px]",
};

const COLUMN_WIDTH_PX: Record<ColumnKey, number> = {
  status: 195,
  actions: 310,
  name: 170,
  email: 240,
  school: 230,
  grade: 92,
  cityState: 160,
  chapter: 110,
  referral: 150,
  tracks: 220,
  resume: 90,
  applied: 170,
};


export default function ApplicantsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [showAcceptedApplicants, setShowAcceptedApplicants] = useState(false);
  const { selected, toggle, toggleAll, clear, isSelected, allSelected, someSelected, count: selectedCount } = useBulkSelect();
  const [bulkTargetStatus, setBulkTargetStatus] = useState<ApplicationStatus>("New");
  const [bulkStatusApplying, setBulkStatusApplying] = useState(false);
  const [bulkPromoting, setBulkPromoting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  // Accept modal state
  const [acceptModalApp, setAcceptModalApp] = useState<ApplicationRecord | null>(null);
  const [acceptRole, setAcceptRole] = useState("Analyst");
  const [acceptSendEmail, setAcceptSendEmail] = useState(true);
  const { ask, Dialog } = useConfirm();
  const { authRole, user } = useAuth();
  const canEdit = authRole === "owner";
  const canDelete = authRole === "owner";
  const canManageStatus = authRole === "owner";
  const canView = authRole === "owner" || authRole === "admin";

  const fetchApplicantsData = useCallback(async () => {
    if (!user || !canView) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/applicants/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("load_failed");
      const payload = await res.json() as {
        applications?: ApplicationRecord[];
      };
      setApplications(Array.isArray(payload.applications) ? payload.applications : []);
    } catch {
      setStatusMessage("Could not load applicants from server.");
    } finally {
      setLoadingData(false);
    }
  }, [user, canView]);

  useEffect(() => {
    void fetchApplicantsData();
    if (!canView) return;
    const timer = setInterval(() => void fetchApplicantsData(), 15000);
    return () => clearInterval(timer);
  }, [fetchApplicantsData, canView]);

  const filtered = useMemo(() => {
    const q = normalize(search);
    const base = [...applications]
      .filter((app) => {
        if (!showAcceptedApplicants && normalize(app.status) === "accepted") return false;
        if (!q) return true;
        return normalize(app.fullName).includes(q)
          || normalize(app.email).includes(q)
          || normalize(app.schoolName ?? "").includes(q)
          || normalize(app.status).includes(q);
      });
    // Always sort by most recent application first
    base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return base;
  }, [applications, search, showAcceptedApplicants]);

  const totalApplicantsCount = applications.length;
  const acceptedApplicantsCount = applications.filter((app) => normalize(app.status) === "accepted").length;
  // Someone who reapplied after already joining is not awaiting anything, so
  // counting them as pending overstates the queue.
  const awaitingDecisionCount = applications.filter(
    (app) => normalize(app.status) !== "accepted" && !app.memberId,
  ).length;
  const alreadyMemberCount = applications.filter(
    (app) => normalize(app.status) !== "accepted" && !!app.memberId,
  ).length;

  const selectableFilteredIds = useMemo(() => filtered.map((app) => app.id), [filtered]);



  const updateApplicantServer = async (id: string, patch: Record<string, unknown>) => {
    if (!user) throw new Error("not_authenticated");
    const token = await getAuthToken();
    const res = await fetch("/api/members/applicants/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id, patch }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(typeof payload?.error === "string" ? payload.error : "update_failed");
    }
  };

  const promoteApplicant = async (app: ApplicationRecord, shouldEmail: boolean, role: string) => {
    if (!user) throw new Error("not_authenticated");
    const token = await getAuthToken();
    // The Accepted stamp is applied by the promote endpoint once the member row
    // exists. Flipping it here first meant a failed promotion left an accepted
    // applicant with nothing in the directory.
    const promoteRes = await fetch("/api/members/applicants/promote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: app.fullName,
        email: app.email,
        schoolName: app.schoolName,
        grade: gradeToClassOf(app.grade, app.createdAt),
        role,
        tracksSelected: app.tracksSelected,
        applicationId: app.id,
        markAccepted: true,
      }),
    });
    if (!promoteRes.ok) {
      const { error } = await promoteRes.json().catch(() => ({})) as { error?: string };
      throw new Error(error === "missing_fields"
        ? `${app.fullName} needs a name and email before they can be added to the directory.`
        : `Could not add ${app.fullName} to the member directory.`);
    }
    const promoted = await promoteRes.json() as { action?: string };
    if (shouldEmail) {
      const emailRes = await fetch("/api/members/applicants/decision-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicantName: app.fullName,
          applicantEmail: app.email,
          decision: "Accepted",
        }),
      });
      if (!emailRes.ok) {
        // The member exists either way; say so rather than implying a rollback.
        throw new Error(`${app.fullName} was added, but the acceptance email didn't send.`);
      }
    }
    return promoted.action ?? "updated";
  };

  const handleAcceptFromModal = async () => {
    if (!acceptModalApp) return;
    setBulkPromoting(true);
    try {
      const action = await promoteApplicant(acceptModalApp, acceptSendEmail, acceptRole);
      setStatusMessage(action === "created"
        ? `Accepted ${acceptModalApp.fullName} and added them to the member directory.`
        : `Accepted ${acceptModalApp.fullName}. They were already in the directory, so their record was updated.`);
      await fetchApplicantsData();
      setAcceptModalApp(null);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : `Could not accept ${acceptModalApp.fullName}.`);
    } finally {
      setBulkPromoting(false);
    }
  };

  const skipInterviewForSelected = async () => {
    if (!canEdit || selected.size === 0) {
      setStatusMessage("Select at least one applicant.");
      return;
    }
    setBulkPromoting(true);
    try {
      const selectedApps = applications.filter((app) => selected.has(app.id));
      let ok = 0;
      let failed = 0;
      for (const app of selectedApps) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await promoteApplicant(app, true, DEFAULT_MEMBER_ROLE);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      clear();
      setStatusMessage(`Accept selected complete — ${ok} succeeded, ${failed} failed.`);
      await fetchApplicantsData();
    } finally {
      setBulkPromoting(false);
    }
  };

  const updateRowStatus = async (app: ApplicationRecord, nextStatus: ApplicationStatus) => {
    if (!canManageStatus) return;
    try {
      await updateApplicantServer(app.id, { status: nextStatus, statusManualOverride: true });
      setStatusMessage(`Updated ${app.fullName} to ${nextStatus}.`);
      await fetchApplicantsData();
    } catch {
      setStatusMessage(`Could not update status for ${app.fullName}.`);
    }
  };

  const deleteApplicant = async (app: ApplicationRecord) => {
    if (!user || !canDelete) return;
    const token = await getAuthToken();
    const res = await fetch("/api/members/applicants/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: app.id }),
    });
    if (!res.ok) {
      setStatusMessage(`Could not delete ${app.fullName}.`);
      return;
    }
    setStatusMessage(`Deleted ${app.fullName}.`);
    await fetchApplicantsData();
  };

  const visibleColumns = ALL_COLUMNS.filter((col) => !hiddenColumns.has(col.key));

  const tableMinWidth = visibleColumns.reduce(
    (sum, col) => sum + (COLUMN_WIDTH_PX[col.key] ?? 150),
    32,
  );

  const hideColumn = (key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const showColumn = (key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const applyBulkStatus = async () => {
    if (!canManageStatus || selected.size === 0) return;
    const idsToUpdate = Array.from(selected);
    const targetStatus = bulkTargetStatus;
    await ask(async () => {
      setBulkStatusApplying(true);
      let succeeded = 0;
      let failed = 0;
      for (const id of idsToUpdate) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await updateApplicantServer(id, { status: targetStatus, statusManualOverride: true });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }
      setStatusMessage(`Updated ${succeeded} applicant${succeeded !== 1 ? "s" : ""} to "${targetStatus}"${failed > 0 ? ` (${failed} failed)` : ""}.`);
      await fetchApplicantsData();
      setBulkStatusApplying(false);
      clear();
    }, `Set ${idsToUpdate.length} applicant${idsToUpdate.length !== 1 ? "s" : ""} to "${targetStatus}"?`);
  };

  return (
    <MembersLayout>
      <Dialog />

      {/* Accept modal */}
      <Modal
        open={!!acceptModalApp}
        onClose={() => {
          if (bulkPromoting) return;
          setAcceptModalApp(null);
        }}
        title="Accept Applicant"
      >
        <div className="space-y-3">
          <p className="text-white/60 text-sm font-body">
            {acceptModalApp ? `${acceptModalApp.fullName} · ${acceptModalApp.email}` : ""}
          </p>
          <Field label="Team Role">
            <Select
              value={acceptRole}
              onChange={(e) => setAcceptRole(e.target.value)}
            >
              {["Analyst", "Senior Analyst", "Associate", "Senior Associate", "Board"].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-white/65">
            <input
              type="checkbox"
              checked={acceptSendEmail}
              onChange={(e) => setAcceptSendEmail(e.target.checked)}
              className="members-checkbox"
            />
            Send acceptance email
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setAcceptModalApp(null)} disabled={bulkPromoting}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void handleAcceptFromModal()} disabled={bulkPromoting}>
            {bulkPromoting ? "Accepting..." : "Accept"}
          </Btn>
        </div>
      </Modal>

      <PageHeader
        title="Applicants"
      />
      <div className="flex flex-wrap items-center gap-4 mb-1 text-[11px] text-white/55">
        <span>Total applications: <span className="text-white/85 font-semibold">{totalApplicantsCount}</span></span>
        <span>Accepted: <span className="text-emerald-300 font-semibold">{acceptedApplicantsCount}</span></span>
        <span>Awaiting a decision: <span className="text-sky-300 font-semibold">{awaitingDecisionCount}</span></span>
        {alreadyMemberCount > 0 && (
          <span className="text-white/35">{alreadyMemberCount} reapplied after joining</span>
        )}
      </div>
      <SectionTabs tabs={APPLICANTS_GROUP_TABS} />

      {statusMessage && <p className="text-xs text-white/55 mb-4">{statusMessage}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search applicants, schools, status..." />
        <ViewPanel active={showAcceptedApplicants || hiddenColumns.size > 0}>
          <ViewSection label="Filter">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
              <input
                type="checkbox"
                className="members-checkbox"
                checked={showAcceptedApplicants}
                onChange={(e) => setShowAcceptedApplicants(e.target.checked)}
              />
              Show accepted applicants
            </label>
          </ViewSection>
          <ViewSection label="Columns">
            <div className="space-y-1">
              {ALL_COLUMNS.filter((col) => col.key !== "actions").map((col) => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={!hiddenColumns.has(col.key)}
                    onChange={(e) => { if (e.target.checked) showColumn(col.key); else hideColumn(col.key); }}
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </ViewSection>
        </ViewPanel>
      </div>

      <div className="members-table-shell">
        <table className="members-grid-table w-full table-fixed text-[10px] leading-4 [&_td]:overflow-hidden" style={{ minWidth: `${tableMinWidth}px` }}>
          <thead className="bg-[#0F1014]">
            <tr className="members-header-sep">
              <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[32px]">
                <input
                  type="checkbox"
                  className="members-checkbox"
                  checked={allSelected(selectableFilteredIds)}
                  ref={(el) => { if (el) el.indeterminate = someSelected(selectableFilteredIds); }}
                  onChange={(e) => toggleAll(selectableFilteredIds, e.target.checked)}
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap ${COLUMN_WIDTH[col.key] ?? ""} group/col`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {col.key !== "actions" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          hideColumn(col.key);
                        }}
                        className="ml-1 text-[9px] text-white/0 group-hover/col:text-white/30 hover:!text-white/60 transition-colors"
                        title={`Hide ${col.label}`}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((app) => {
              const showResume = canView;
              const statusKey = normalize(app.status);
              const isAccepted = statusKey === "accepted";
              const canAcceptAction = !isAccepted;
              return (
                <tr key={app.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={isSelected(app.id)}
                      onChange={() => toggle(app.id)}
                    />
                  </td>
                  {visibleColumns.map((col) => {
                    switch (col.key) {
                      case "status":
                        return (
                          <td key={col.key} className="px-2 py-1.5">
                            {canManageStatus ? (
                              <select
                                value={STATUS_OPTIONS.includes(app.status) ? app.status : "New"}
                                onChange={(e) => void updateRowStatus(app, e.target.value as ApplicationStatus)}
                                className={`members-no-cell-scroll rounded-full px-2 py-0.5 text-[10px] font-semibold focus:outline-none ${STATUS_BADGE_CLASS[app.status] ?? STATUS_BADGE_CLASS["New"]}`}
                              >
                                {(VALID_NEXT_STATUSES[app.status] ?? STATUS_OPTIONS).map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_CLASS[app.status] ?? STATUS_BADGE_CLASS["New"]}`}>
                                {app.status}
                              </span>
                            )}
                          </td>
                        );
                      case "name":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/85">
                            <span className="block truncate" title={app.fullName}>{app.fullName}</span>
                          </td>
                        );
                      case "email":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/60 font-mono">
                            <span className="block truncate" title={app.email}>{app.email}</span>
                          </td>
                        );
                      case "school":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/55 whitespace-nowrap">
                            <span className="block truncate" title={app.schoolName || ""}>{app.schoolName || "—"}</span>
                          </td>
                        );
                      case "grade": {
                        const display = gradeToClassOf(app.grade, app.createdAt);
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/55 whitespace-nowrap">
                            <span className="block truncate" title={display || ""}>{display || "—"}</span>
                          </td>
                        );
                      }
                      case "cityState":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/50 whitespace-nowrap">
                            <span className="block truncate" title={app.cityState || ""}>{app.cityState || "—"}</span>
                          </td>
                        );
                      case "chapter":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/50 whitespace-nowrap">
                            <span className="block truncate" title={app.chapter || ""}>{app.chapter || "—"}</span>
                          </td>
                        );
                      case "referral": {
                        const heard = [app.referral, app.referralName && `(${app.referralName})`]
                          .filter(Boolean).join(" ");
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/50 whitespace-nowrap">
                            <span className="block truncate" title={heard}>{heard || "—"}</span>
                          </td>
                        );
                      }
                      case "tracks": {
                        const tracks = [app.tracksSelected, app.marketingSubtrack && `→ ${app.marketingSubtrack}`]
                          .filter(Boolean).join(" ");
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/50 whitespace-nowrap">
                            <span className="block truncate" title={tracks}>{tracks || "—"}</span>
                          </td>
                        );
                      }
                      case "resume":
                        return (
                          <td key={col.key} className="px-2 py-1.5">
                            {app.resumeUrl && showResume ? (
                              <a
                                href={app.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#F6B78D]/80 hover:text-[#F6B78D] underline whitespace-nowrap"
                              >
                                Resume
                              </a>
                            ) : app.resumeUrl && !showResume ? (
                              <span className="text-white/25 italic text-[10px]">Hidden</span>
                            ) : (
                              <span className="text-white/25">—</span>
                            )}
                          </td>
                        );
                      case "applied":
                        return (
                          <td key={col.key} className="px-2 py-1.5 text-white/45 whitespace-nowrap">{formatDateTime(app.createdAt)}</td>
                        );
                      case "actions":
                        return (
                          <td key={col.key} className="px-2 py-1.5 whitespace-nowrap">
                            <div className="members-no-cell-scroll flex gap-1 flex-nowrap">
                              {canEdit && (
                                <>
                                  <Btn
                                    size="sm"
                                    variant="primary"
                                    className={`members-pill-btn whitespace-nowrap ${!canAcceptAction ? "opacity-50" : ""}`}
                                    onClick={() => {
                                      setAcceptRole(app.finalDecisionRole || "Analyst");
                                      setAcceptSendEmail(true);
                                      setAcceptModalApp(app);
                                    }}
                                    disabled={bulkPromoting || !canAcceptAction}
                                  >
                                    Accept
                                  </Btn>
                                  {canDelete && (
                                    <Btn
                                      size="sm"
                                      variant="danger"
                                      className="members-pill-btn whitespace-nowrap"
                                      onClick={() => {
                                        void ask(
                                          async () => {
                                            await deleteApplicant(app);
                                          },
                                          `Delete ${app.fullName}? This will permanently remove them from /members/applicants.`
                                        );
                                      }}
                                    >
                                      Delete
                                    </Btn>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loadingData ? (
        <div className="mt-4"><SkeletonRows rows={8} cols={6} /></div>
      ) : filtered.length === 0 ? (
        <Empty message="No applicants yet." />
      ) : null}

      {canEdit && (
        <BulkActionBar count={selectedCount} onClear={clear}>
          <Btn
            size="sm"
            variant="primary"
            onClick={() => void skipInterviewForSelected()}
            disabled={bulkPromoting}
          >
            {bulkPromoting ? "Accepting…" : "Accept"}
          </Btn>
          {canManageStatus && (
            <>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value as ApplicationStatus)}
                className="h-7 rounded-lg border border-white/15 bg-[#0F1014] px-2 text-[11px] text-white focus:outline-none focus:border-[#F6B78D]/45"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Btn
                size="sm"
                variant="secondary"
                onClick={() => void applyBulkStatus()}
                disabled={bulkStatusApplying}
              >
                {bulkStatusApplying ? "Applying…" : "Set Status"}
              </Btn>
            </>
          )}
        </BulkActionBar>
      )}

    </MembersLayout>
  );
}
