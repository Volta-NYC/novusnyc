"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar, Spinner,
  ViewPanel, ViewSection, SearchSelect, type SearchSelectOption,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeCycles,
  subscribeProjectGroups, subscribeAssignmentUpdates,
  createAssignment, updateAssignment, archiveAssignment, hardDeleteAssignment, deleteAssignmentClaim,
  type Assignment, type AssignmentClaim, type AssignmentStatus, type AssignmentUpdate,
  type Business, type Cycle, type CycleRole, type CycleTrack, type ProjectGroup,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { getAuthToken } from "@/lib/members/supabaseAuth";

const MEMBER_TRACKS: CycleTrack[] = ["General", "Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "Active", "Under Review", "Completed"];

function encodeProjectRef(bizId?: string, grpId?: string): string {
  if (bizId) return `biz:${bizId}`;
  if (grpId) return `grp:${grpId}`;
  return "volta";
}

function decodeProjectRef(ref: string): { businessId?: string; projectGroupId?: string } {
  if (ref.startsWith("biz:")) return { businessId: ref.slice(4) };
  if (ref.startsWith("grp:")) return { projectGroupId: ref.slice(4) };
  return {};
}

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  Open: "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]",
  Active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  "Under Review": "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Completed: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Archived: "border-white/10 bg-white/5 text-white/35",
};

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const TRACK_RANK: Record<CycleTrack, number> = { General: 0, Tech: 1, Marketing: 2, Finance: 3 };

type TableRow =
  | { type: "group"; groupKey: string; track: CycleTrack; title: string; assignments: Assignment[] }
  | { type: "single"; assignment: Assignment };

interface FormState {
  title: string;
  description: string;
  track: CycleTrack;
  credits: number;
  minRole: CycleRole;
  projectRef: string;
  limitClaims: boolean;
  maxClaims: string;
  deadlineType: "hard" | "offset";
  hardDeadline: string;
  deadlineOffsetDays: string;
  status: AssignmentStatus;
  priority: boolean;
  requiresApproval: boolean;
  applicationRequired: boolean;
  allowMultipleCompletions: boolean;
  recurringEnabled: boolean;
  checkinIntervalDays: string;
  maxDurationDays: string;
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  track: "Tech",
  credits: 1,
  minRole: "Analyst",
  projectRef: "volta",
  limitClaims: true,
  maxClaims: "1",
  deadlineType: "hard",
  hardDeadline: "",
  deadlineOffsetDays: "",
  status: "Open",
  priority: false,
  requiresApproval: true,
  applicationRequired: false,
  allowMultipleCompletions: false,
  recurringEnabled: false,
  checkinIntervalDays: "7",
  maxDurationDays: "",
};

export default function CatalogPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignmentUpdates, setAssignmentUpdates] = useState<AssignmentUpdate[]>([]);
  const [updatesModal, setUpdatesModal] = useState<Assignment | null>(null);
  const [updateDraft, setUpdateDraft] = useState("");
  const [sendingUpdate, setSendingUpdate] = useState(false);
  const [updateSendError, setUpdateSendError] = useState<string | null>(null);
  const [updateSendSuccess, setUpdateSendSuccess] = useState(false);

  // Per-update edit state
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [editingUpdateText, setEditingUpdateText] = useState("");
  const [updateActionBusy, setUpdateActionBusy] = useState(false);
  const [updateActionError, setUpdateActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterTracks, setFilterTracks] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [claimsModal, setClaimsModal] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inline row expansion for single rows; group expansion keyed by groupKey
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    const unsub1 = subscribeAssignmentClaims(setClaims);
    const unsub2 = subscribeBusinesses(setBusinesses);
    const unsub3 = subscribeCycles(setCycles);
    const unsub4 = subscribeAssignments((all) => {
      setAssignments(authRole !== "member" ? all : all.filter((a) => a.status === "Open"));
    });
    const unsub5 = subscribeProjectGroups(setProjectGroups);
    const unsub6 = subscribeAssignmentUpdates(setAssignmentUpdates);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [authRole]);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);
  const projectGroupById = useMemo(() => new Map(projectGroups.map((g) => [g.id, g])), [projectGroups]);

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const updatesByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentUpdate[]>();
    for (const u of assignmentUpdates) {
      const list = map.get(u.assignmentId) ?? [];
      list.push(u);
      map.set(u.assignmentId, list);
    }
    return map;
  }, [assignmentUpdates]);

  const resolveProjectLabel = useCallback((assignment: Assignment): { name: string; subtitle?: string } | null => {
    if (assignment.businessId) {
      const biz = businessById.get(assignment.businessId);
      if (!biz) return null;
      return { name: biz.name, subtitle: biz.neighborhood };
    }
    if (assignment.projectGroupId) {
      const grp = projectGroupById.get(assignment.projectGroupId);
      if (!grp) return null;
      return { name: grp.name, subtitle: grp.description };
    }
    return { name: "Volta", subtitle: "Organization-wide" };
  }, [businessById, projectGroupById]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assignments]
      .filter((a) => {
        if (!showArchived && a.status === "Archived") return false;
        if (showArchived && a.status !== "Archived") return false;
        if (filterTracks.size > 0 && !filterTracks.has(a.track ?? a.primaryTrack ?? "Tech")) return false;
        if (filterStatuses.size > 0 && !filterStatuses.has(a.status)) return false;
        if (!q) return true;
        const proj = resolveProjectLabel(a);
        return [a.title, (a.track ?? a.primaryTrack ?? ""), proj?.name ?? "", proj?.subtitle ?? ""]
          .some((v) => v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const priorityDelta = Number(Boolean(b.priority)) - Number(Boolean(a.priority));
        if (priorityDelta !== 0) return priorityDelta;
        const ta = TRACK_RANK[(a.track ?? a.primaryTrack ?? "Tech")] ?? 9;
        const tb = TRACK_RANK[(b.track ?? b.primaryTrack ?? "Tech")] ?? 9;
        if (ta !== tb) return ta - tb;
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [assignments, search, filterTracks, filterStatuses, showArchived, resolveProjectLabel]);

  // Group same-title+track assignments into collapsible families
  const tableRows = useMemo((): TableRow[] => {
    const buckets = new Map<string, Assignment[]>();
    for (const a of sorted) {
      const key = `${a.track}::${a.title}`;
      const list = buckets.get(key) ?? [];
      list.push(a);
      buckets.set(key, list);
    }
    const rows: TableRow[] = [];
    for (const [key, asns] of buckets) {
      if (asns.length >= 2) {
        rows.push({ type: "group", groupKey: key, track: asns[0].track, title: asns[0].title, assignments: asns });
      } else {
        rows.push({ type: "single", assignment: asns[0] });
      }
    }
    return rows;
  }, [sorted]);

  const activeAssignments = assignments.filter((a) => a.status !== "Archived");
  const counts = {
    open: activeAssignments.filter((a) => a.status === "Open").length,
    claimed: claims.filter((c) => c.status === "claimed" || c.status === "In Progress").length,
    awaitingApproval: claims.filter((c) => c.status === "Submitted").length,
    completed: claims.filter((c) => c.status === "Approved").length + activeAssignments.filter((a) => a.status === "Completed").length,
    archived: assignments.filter((a) => a.status === "Archived").length,
  };

  const sortedBusinessOptions = useMemo(
    () => businesses.filter((b) => String(b.name ?? "").trim()).sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const sortedGroupOptions = useMemo(
    () => [...projectGroups].sort((a, b) => a.name.localeCompare(b.name)),
    [projectGroups],
  );

  const projectOptions = useMemo<SearchSelectOption[]>(() => [
    { value: "volta", label: "Volta", subtitle: "Internal" },
    ...sortedBusinessOptions.map((b) => ({
      value: `biz:${b.id}`,
      label: b.name,
      subtitle: ["Business", b.neighborhood].filter(Boolean).join(" · "),
    })),
    ...sortedGroupOptions.map((g) => ({
      value: `grp:${g.id}`,
      label: g.name,
      subtitle: "Project Group",
    })),
  ], [sortedBusinessOptions, sortedGroupOptions]);

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const openCreate = () => { setForm({ ...BLANK_FORM }); setEditing(null); setSaveError(null); setModal("create"); };

  const openEdit = (a: Assignment) => {
    const cap = a.capacity ?? 0;
    const isOffset = a.deadlineType === "offset";
    setForm({
      title:              a.title,
      description:        a.description ?? "",
      track:              a.track ?? (a.primaryTrack as CycleTrack) ?? "Tech",
      credits:            a.credits,
      minRole:            a.minRole,
      projectRef:         encodeProjectRef(a.businessId, a.projectGroupId),
      limitClaims:        cap > 0,
      maxClaims:          cap > 0 ? String(cap) : "1",
      deadlineType:       isOffset ? "offset" : "hard",
      hardDeadline:       !isOffset ? (a.deadlines?.[0]?.date ?? "") : "",
      deadlineOffsetDays: isOffset ? String(a.deadlineOffsetDays ?? "") : "",
      status:             a.status,
      priority:           Boolean(a.priority),
      requiresApproval:         a.requiresApproval !== false,
      applicationRequired:      Boolean(a.applicationRequired),
      allowMultipleCompletions: Boolean(a.allowMultipleCompletions),
      recurringEnabled:   Boolean(a.recurringEnabled),
      checkinIntervalDays: a.checkinIntervalDays != null ? String(a.checkinIntervalDays) : "7",
      maxDurationDays:    a.maxDurationDays != null ? String(a.maxDurationDays) : "",
    });
    setEditing(a);
    setSaveError(null);
    setModal("edit");
  };

  const buildPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const { businessId, projectGroupId } = decodeProjectRef(form.projectRef);
    const isOffset = !form.recurringEnabled && form.deadlineType === "offset";
    const isRecurring = form.recurringEnabled;
    return {
      title,
      description:        form.description,
      track:              form.track,
      credits:            Math.max(0, Number(form.credits) || 0),
      difficulty:         editing?.difficulty ?? "Standard",
      estimatedHours:     editing?.estimatedHours ?? 0,
      type:               editing?.type,
      region:             editing?.region,
      teamLabel:          editing?.teamLabel,
      minRole:            form.minRole,
      businessId,
      projectGroupId,
      capacity:           form.limitClaims ? Math.max(1, Number(form.maxClaims) || 1) : 0,
      deadlines:          !isRecurring && !isOffset && form.hardDeadline
                            ? [{ label: "Final Deadline", date: form.hardDeadline }]
                            : null,
      deadlineType:       isRecurring ? "hard" : form.deadlineType,
      deadlineOffsetDays: isOffset && form.deadlineOffsetDays ? Number(form.deadlineOffsetDays) : null,
      recurringEnabled:   form.recurringEnabled,
      checkinIntervalDays: isRecurring && form.checkinIntervalDays ? Number(form.checkinIntervalDays) : null,
      maxDurationDays:    isRecurring && form.maxDurationDays ? Number(form.maxDurationDays) : null,
      status:                   editing ? form.status : "Open",
      priority:                 form.priority,
      requiresApproval:         form.requiresApproval,
      applicationRequired:      form.applicationRequired,
      allowMultipleCompletions: form.allowMultipleCompletions,
      cycleId:            editing?.cycleId ?? activeCycle?.id ?? "",
      createdBy:          editing?.createdBy ?? userProfile?.email ?? user?.email ?? user?.id ?? "unknown",
      notes:              editing?.notes ?? "",
    };
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    setSaveError(null);
    try {
      if (editing) await updateAssignment(editing.id, payload);
      else await createAssignment(payload);
      if (opts?.addAnother && !editing) setForm((prev) => ({ ...prev, title: "" }));
      else setModal(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!editing) return;
    const claimList = claimsByAssignment.get(editing.id) ?? [];
    const pendingClaims = claimList.filter(
      (c) => c.status !== "Approved" && c.status !== "rejected",
    );
    const msg = pendingClaims.length > 0
      ? `Archive "${editing.title}"? ${pendingClaims.length} pending claim${pendingClaims.length === 1 ? "" : "s"} will be cancelled. Approved credits are preserved.`
      : `Archive "${editing.title}"? It will be hidden from the marketplace. You can view it and permanently delete it from the Archived filter.`;
    await ask(async () => {
      for (const c of pendingClaims) await deleteAssignmentClaim(c.id);
      await archiveAssignment(editing.id);
      setModal(null);
    }, msg);
  };

  const handleHardDelete = async () => {
    if (!editing) return;
    const claimList = claimsByAssignment.get(editing.id) ?? [];
    const approvedCount = claimList.filter((c) => c.status === "Approved").length;
    const warn = approvedCount > 0
      ? ` Warning: ${approvedCount} approved claim${approvedCount === 1 ? "" : "s"} exist — their credit records will also be deleted.`
      : "";
    await ask(async () => { await hardDeleteAssignment(editing.id); setModal(null); },
      `Permanently delete "${editing.title}"? This cannot be undone.${warn}`);
  };

  const closeUpdatesModal = () => {
    setUpdatesModal(null);
    setUpdateDraft("");
    setUpdateSendError(null);
    setUpdateSendSuccess(false);
    setEditingUpdateId(null);
    setEditingUpdateText("");
    setUpdateActionError(null);
  };

  const handleSendUpdate = async () => {
    if (!updatesModal || !updateDraft.trim()) return;
    setSendingUpdate(true);
    setUpdateSendError(null);
    setUpdateSendSuccess(false);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/assignments/post-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignmentId: updatesModal.id, message: updateDraft.trim() }),
      });
      const data = await res.json() as { saved?: boolean; emailsSent?: number; emailsSkipped?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setUpdateDraft("");
      setUpdateSendSuccess(true);
      setTimeout(() => setUpdateSendSuccess(false), 4000);
    } catch (err) {
      setUpdateSendError(err instanceof Error ? err.message : "Send failed. Please try again.");
    } finally {
      setSendingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    setUpdateActionBusy(true);
    setUpdateActionError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/assignments/manage-update", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: updateId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setAssignmentUpdates((prev) => prev.filter((u) => u.id !== updateId));
    } catch (err) {
      setUpdateActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setUpdateActionBusy(false);
    }
  };

  const handleSaveUpdateEdit = async (updateId: string) => {
    if (!editingUpdateText.trim()) return;
    setUpdateActionBusy(true);
    setUpdateActionError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/assignments/manage-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: updateId, message: editingUpdateText.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setAssignmentUpdates((prev) =>
        prev.map((u) => u.id === updateId ? { ...u, message: editingUpdateText.trim() } : u)
      );
      setEditingUpdateId(null);
      setEditingUpdateText("");
    } catch (err) {
      setUpdateActionError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setUpdateActionBusy(false);
    }
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
        subtitle="All Assignments — full record across all tracks and businesses."
        action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
      />

      {/* Summary counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <SummaryStat label="Open" value={counts.open} accent="text-[#85CC17]" />
        <SummaryStat label="Claimed / In Progress" value={counts.claimed} accent="text-blue-300" />
        <SummaryStat label="Awaiting approval" value={counts.awaitingApproval} accent="text-yellow-300" />
        <SummaryStat label="Completed" value={counts.completed} accent="text-violet-300" />
        <SummaryStat label="Archived" value={counts.archived} accent="text-white/40" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title, track, business…" />
        <button
          type="button"
          onClick={() => { setShowArchived((v) => !v); setFilterTracks(new Set()); setFilterStatuses(new Set()); }}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showArchived
              ? "border-white/30 bg-white/10 text-white/70"
              : "border-white/12 bg-transparent text-white/45 hover:text-white/70 hover:border-white/18"
          }`}
        >
          {showArchived ? "← Active" : `Archived${counts.archived > 0 ? ` (${counts.archived})` : ""}`}
        </button>
        {!showArchived && (
          <ViewPanel active={filterTracks.size > 0 || filterStatuses.size > 0}>
            <ViewSection label="Track">
              <div className="space-y-1.5">
                {MEMBER_TRACKS.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={filterTracks.has(t)}
                      onChange={() => setFilterTracks((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; })}
                    />
                    <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${TRACK_DOT[t]}`} />
                    {t}
                  </label>
                ))}
              </div>
            </ViewSection>
            <ViewSection label="Status">
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={filterStatuses.has(s)}
                      onChange={() => setFilterStatuses((prev) => { const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next; })}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </ViewSection>
          </ViewPanel>
        )}
      </div>

      {/* Assignment table */}
      {sorted.length === 0 ? (
        <Empty
          message={search || filterTracks.size > 0 || filterStatuses.size > 0 ? "No assignments match your filters." : "No assignments in the catalog yet."}
          action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
        />
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#0D0F14] border-b border-white/10">
                <th className="w-9 px-4 py-3" />
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Assignment</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-44">Project</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-32">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-24 text-right">Credits</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-24">Capacity</th>
                <th className="px-4 py-3 w-56" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {tableRows.map((row) => {
                if (row.type === "group") {
                  const isOpen = expandedGroups.has(row.groupKey);
                  const statuses = [...new Set(row.assignments.map((a) => a.status))];
                  const totalActive = row.assignments.reduce((sum, a) => {
                    const ac = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
                    return sum + ac;
                  }, 0);
                  const totalCap = row.assignments.reduce((sum, a) => sum + (a.capacity ?? 0), 0);

                  return (
                    <>
                      <tr
                        key={row.groupKey}
                        onClick={() => toggleGroup(row.groupKey)}
                        className="cursor-pointer hover:bg-white/[0.03] transition-colors bg-[#13161D]"
                      >
                        <td className="pl-4 py-3.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${TRACK_DOT[row.track]}`} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[14px] font-semibold text-white/90">{row.title}</span>
                            <span className="text-[11px] text-white/40 font-medium bg-white/[0.06] border border-white/10 rounded-full px-2 py-0.5">
                              ×{row.assignments.length} projects
                            </span>
                          </div>
                          <p className="text-[11px] text-white/35 mt-0.5">{row.track}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-white/40">
                          {row.assignments.length} projects
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {statuses.map((s) => (
                              <span key={s} className={`members-chip text-[10px] font-semibold ${STATUS_STYLES[s]}`}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-[13px] text-[#85CC17] font-semibold">
                          {row.assignments[0].credits}
                        </td>
                        <td className="px-4 py-3.5 text-[12px] text-white/45">
                          {totalCap === 0 ? <span className="text-white/30 text-[11px]">Unlimited</span> : `${totalActive} / ${totalCap}`}
                        </td>
                        <td className="pr-4 py-3.5 text-right">
                          <span className={`text-white/30 text-[11px] inline-block transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                        </td>
                      </tr>
                      {isOpen && row.assignments.map((a) => {
                        const proj = resolveProjectLabel(a);
                        const claimList = claimsByAssignment.get(a.id) ?? [];
                        const activeClaims = claimList.filter((c) => c.status !== "rejected");
                        const isFull = a.capacity > 0 && activeClaims.length >= a.capacity;
                        return (
                          <tr key={a.id} className="bg-[#0B0D12] border-l-2 border-l-white/8 hover:bg-white/[0.02] transition-colors">
                            <td className="pl-5 py-3">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${TRACK_DOT[a.track]}`} />
                            </td>
                            <td className="px-4 py-3 pl-6 text-[13px] text-white/65">
                              <div className="flex items-center gap-2">
                                {a.priority && <span className="text-amber-400 text-[11px]">⚡</span>}
                                <span className="font-medium">{proj?.name ?? "Volta"}</span>
                                {proj?.subtitle && <span className="text-white/30">· {proj.subtitle}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3">
                              <span className={`members-chip text-[10px] font-semibold ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] text-[#85CC17] font-semibold">
                              {a.credits}
                            </td>
                            <td className="px-4 py-3 text-[12px]">
                              {a.capacity === 0
                                ? <span className="text-white/30 text-[11px]">Unlimited</span>
                                : <span className={isFull ? "text-amber-400 font-medium" : "text-white/50"}>
                                    {activeClaims.length} / {a.capacity}{isFull ? " ●" : ""}
                                  </span>
                              }
                            </td>
                            <td className="pr-4 py-3">
                              <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                                  className="h-7 inline-flex items-center px-2.5 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-medium text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.07] transition-colors"
                                >
                                  Edit
                                </button>
                                {claimList.length > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setClaimsModal(a); }}
                                    title={`${claimList.length} claim${claimList.length !== 1 ? "s" : ""}`}
                                    className="h-7 inline-flex items-center gap-1 px-2 rounded-md border bg-cyan-400/[0.06] border-cyan-400/20 text-cyan-300/65 hover:text-cyan-300 hover:bg-cyan-400/[0.1] hover:border-cyan-400/35 text-[10px] font-medium transition-colors whitespace-nowrap"
                                  >
                                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                    </svg>
                                    <span>{claimList.length}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                }

                // Single assignment row
                const a = row.assignment;
                const track = (a.track ?? a.primaryTrack ?? "Tech") as CycleTrack;
                const proj = resolveProjectLabel(a);
                const claimList = claimsByAssignment.get(a.id) ?? [];
                const activeClaims = claimList.filter((c) => c.status !== "rejected");
                const claimerNames = activeClaims.map((c) => c.memberName ?? "").filter(Boolean);
                const isFull = a.capacity > 0 && activeClaims.length >= a.capacity;
                const isExpanded = expandedRows.has(a.id);
                const deadline = a.deadlines?.[0]?.date ?? "";
                const updateCount = updatesByAssignment.get(a.id)?.length ?? 0;

                return (
                  <>
                    <tr
                      key={a.id}
                      onClick={() => toggleRow(a.id)}
                      className={`cursor-pointer hover:bg-white/[0.03] transition-colors ${a.priority ? "bg-amber-400/[0.035]" : "bg-[#13161D]"}`}
                    >
                      <td className="pl-4 py-4">
                        <span className={`inline-block w-2 h-2 rounded-full ${TRACK_DOT[track]}`} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {a.priority && <span className="text-amber-400 text-[11px]">⚡</span>}
                          <span className="text-[14px] font-semibold text-white/90">{a.title}</span>
                          {a.recurringEnabled && <span className="text-purple-400/80 text-[11px]">↻</span>}
                          {a.applicationRequired && (
                            <span className="members-chip border-blue-400/40 bg-blue-400/10 text-blue-300 text-[10px]">Apply first</span>
                          )}
                          {a.requiresApproval === false && (
                            <span className="members-chip border-emerald-400/40 bg-emerald-400/10 text-emerald-300 text-[10px]">Auto-approved</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/35 mb-1">{track}</p>
                        {a.description && (
                          <div
                            className="text-[12px] text-white/55 line-clamp-2 prose-invert leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.description) }}
                          />
                        )}
                      </td>
                      <td className="px-4 py-4 text-[12px] text-white/60">
                        <p className="font-medium">{proj?.name ?? "—"}</p>
                        {proj?.subtitle && <p className="text-white/35 text-[11px] mt-0.5">{proj.subtitle}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`members-chip text-[10px] font-semibold ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-4 text-right text-[14px] text-[#85CC17] font-semibold whitespace-nowrap">
                        {a.credits}
                        {a.recurringEnabled && <span className="text-[10px] text-[#85CC17]/60 font-normal ml-1">/check-in</span>}
                      </td>
                      <td className="px-4 py-4 text-[12px]">
                        {a.capacity === 0
                          ? <span className="text-white/25">∞</span>
                          : <span className={isFull ? "text-amber-400 font-semibold" : "text-white/55"}>
                              {activeClaims.length} / {a.capacity}{isFull ? " ●" : ""}
                            </span>
                        }
                      </td>
                      <td className="pr-4 py-4">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setUpdatesModal(a)}
                            title={updateCount > 0 ? `${updateCount} update${updateCount !== 1 ? "s" : ""}` : "Updates"}
                            className={`h-7 inline-flex items-center gap-1 px-2 rounded-md border text-[10px] font-medium transition-colors whitespace-nowrap ${
                              updateCount > 0
                                ? "bg-[#85CC17]/[0.08] border-[#85CC17]/25 text-[#9BE22B]/80 hover:text-[#9BE22B] hover:bg-[#85CC17]/[0.13] hover:border-[#85CC17]/40"
                                : "bg-transparent border-white/8 text-white/25 hover:text-white/50 hover:bg-white/[0.04] hover:border-white/15"
                            }`}
                          >
                            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            {updateCount > 0 && <span>{updateCount}</span>}
                          </button>
                          {claimList.length > 0 && (
                            <button
                              onClick={() => setClaimsModal(a)}
                              title={`${claimList.length} claim${claimList.length !== 1 ? "s" : ""}`}
                              className="h-7 inline-flex items-center gap-1 px-2 rounded-md border bg-cyan-400/[0.06] border-cyan-400/20 text-cyan-300/65 hover:text-cyan-300 hover:bg-cyan-400/[0.1] hover:border-cyan-400/35 text-[10px] font-medium transition-colors whitespace-nowrap"
                            >
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                              <span>{claimList.length}</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(a)}
                            className="h-7 inline-flex items-center px-2.5 rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-medium text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.07] transition-colors"
                          >
                            Edit
                          </button>
                          <span className={`w-4 text-center text-white/20 text-[11px] inline-block transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${a.id}-detail`}>
                        <td colSpan={7} className="bg-[#0B0D12] px-6 pb-5 pt-3 border-b border-white/5">
                          <div className="flex gap-8">
                            <div className="flex-1 min-w-0 space-y-3">
                              {a.description && (
                                <div
                                  className="text-[13px] text-white/65 prose-invert leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.description) }}
                                />
                              )}
                              {claimerNames.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Claimants</p>
                                  <p className="text-[13px] text-white/55">{claimerNames.join(", ")}</p>
                                </div>
                              )}
                              {a.notes && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Internal Notes</p>
                                  <p className="text-[13px] text-white/45 italic">{a.notes}</p>
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 min-w-[140px] space-y-2.5">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Min Role</p>
                                <p className="text-[13px] text-white/60">{a.minRole}</p>
                              </div>
                              {a.estimatedHours > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Est. Time</p>
                                  <p className="text-[13px] text-white/60">~{a.estimatedHours}h</p>
                                </div>
                              )}
                              {!a.recurringEnabled && deadline && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Deadline</p>
                                  <p className="text-[13px] text-white/60">{deadline}</p>
                                </div>
                              )}
                              {a.recurringEnabled && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Check-in</p>
                                  <p className="text-[13px] text-white/60">Every {a.checkinIntervalDays ?? 7} days</p>
                                </div>
                              )}
                              {a.deadlineType === "offset" && a.deadlineOffsetDays && !a.recurringEnabled && (
                                <div>
                                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Deadline</p>
                                  <p className="text-[13px] text-white/60">+{a.deadlineOffsetDays}d after claim</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Assignment" : "New Assignment"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </Field>
          <Field label="Description">
            <RichTextEditor
              content={form.description}
              onChange={(html) => setForm((p) => ({ ...p, description: html }))}
              minHeight={180}
              placeholder="What this work is, what 'done' looks like, links / context."
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Track" required>
              <Select
                options={MEMBER_TRACKS}
                value={form.track}
                onChange={(e) => setForm((p) => ({ ...p, track: e.target.value as CycleTrack }))}
              />
            </Field>
            <Field label={form.recurringEnabled ? "Credits / check-in" : "Credits"} required>
              <Input
                type="number"
                min="0"
                value={String(form.credits)}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Minimum Role">
              <Select
                options={ROLES}
                value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))}
              />
            </Field>
          </div>

          <Field label="Project">
            <SearchSelect
              value={form.projectRef}
              onChange={(v) => setForm((p) => ({ ...p, projectRef: v }))}
              options={projectOptions}
              placeholder="Select project…"
            />
          </Field>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1014] px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm text-white/85 font-medium">Recurring check-in assignment</p>
              <p className="text-[11px] text-white/40 mt-0.5">Credits awarded per check-in, not once on completion.</p>
            </div>
            <input type="checkbox" className="members-checkbox" checked={form.recurringEnabled}
              onChange={(e) => setForm((p) => ({ ...p, recurringEnabled: e.target.checked }))} />
          </label>

          {form.recurringEnabled ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in every (days)">
                <Input type="number" min="1" value={form.checkinIntervalDays} placeholder="7"
                  onChange={(e) => setForm((p) => ({ ...p, checkinIntervalDays: e.target.value }))} />
              </Field>
              <Field label="Max duration (days, optional)">
                <Input type="number" min="1" value={form.maxDurationDays} placeholder="No limit"
                  onChange={(e) => setForm((p) => ({ ...p, maxDurationDays: e.target.value }))} />
              </Field>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                {(["hard", "offset"] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setForm((p) => ({ ...p, deadlineType: t }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-left border transition-colors ${
                      form.deadlineType === t
                        ? "border-[#85CC17]/40 bg-[#85CC17]/10"
                        : "border-white/12 hover:border-white/25"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${form.deadlineType === t ? "text-[#9BE22B]" : "text-white/55"}`}>
                      {t === "hard" ? "Fixed date" : "Days after claiming"}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${form.deadlineType === t ? "text-[#9BE22B]/70" : "text-white/30"}`}>
                      {t === "hard" ? "Same date for everyone" : "Countdown starts when member signs up"}
                    </p>
                  </button>
                ))}
              </div>
              {form.deadlineType === "hard" ? (
                <Field label="Deadline date">
                  <Input type="date" value={form.hardDeadline}
                    onChange={(e) => setForm((p) => ({ ...p, hardDeadline: e.target.value }))} />
                </Field>
              ) : (
                <Field label="Days after member claims">
                  <Input type="number" min="1" value={form.deadlineOffsetDays} placeholder="e.g. 7"
                    onChange={(e) => setForm((p) => ({ ...p, deadlineOffsetDays: e.target.value }))} />
                </Field>
              )}
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 space-y-2.5">
            <p className="text-[10px] text-white/40 uppercase tracking-wide font-semibold">Who can claim</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, limitClaims: false }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!form.limitClaims ? "bg-[#85CC17]/15 border-[#85CC17]/40 text-[#85CC17]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
              >
                For everyone
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, limitClaims: true }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.limitClaims ? "bg-[#85CC17]/15 border-[#85CC17]/40 text-[#85CC17]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
              >
                Limited spots
              </button>
            </div>
            {form.limitClaims && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={form.maxClaims}
                  onChange={(e) => setForm((p) => ({ ...p, maxClaims: e.target.value }))}
                  className="w-24"
                />
                <span className="text-xs text-white/45">max claimants</span>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" checked={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.checked }))} className="members-checkbox" />
            <span>Priority assignment <span className="ml-1.5 text-white/35 text-xs font-normal">— highlighted in amber for members</span></span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm((p) => ({ ...p, requiresApproval: e.target.checked }))} className="members-checkbox" />
            <span>Requires approval <span className="ml-1.5 text-white/35 text-xs font-normal">— uncheck to auto-award credits on member submit</span></span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" checked={form.applicationRequired} onChange={(e) => setForm((p) => ({ ...p, applicationRequired: e.target.checked }))} className="members-checkbox" />
            <span>Requires pre-approval <span className="ml-1.5 text-white/35 text-xs font-normal">— members told to email board first; admin alerted when someone claims</span></span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" checked={form.allowMultipleCompletions} onChange={(e) => setForm((p) => ({ ...p, allowMultipleCompletions: e.target.checked }))} className="members-checkbox" />
            <span>Allow multiple completions <span className="ml-1.5 text-white/35 text-xs font-normal">— members can re-claim after approval (off by default)</span></span>
          </label>

          {editing && (
            <Field label="Status">
              <Select
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AssignmentStatus }))}
              />
            </Field>
          )}
        </div>

        {saveError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {saveError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/8">
          <div className="flex gap-2">
            {editing && editing.status !== "Archived" && (
              <Btn variant="danger" onClick={() => void handleArchive()}>Archive</Btn>
            )}
            {editing && editing.status === "Archived" && (
              <Btn variant="danger" onClick={() => void handleHardDelete()}>Delete permanently</Btn>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</Btn>
            {!editing && (
              <Btn
                variant="secondary"
                onClick={() => void handleSave({ addAnother: true })}
                disabled={!form.title.trim() || busy}
              >
                Save & New
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.title.trim() || busy}>
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Claims detail modal */}
      {claimsModal && (() => {
        const claimList = [...(claimsByAssignment.get(claimsModal.id) ?? [])].sort(
          (a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""),
        );
        const STATUS_CHIP: Record<string, string> = {
          claimed:       "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
          "In Progress": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
          Submitted:     "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
          Approved:      "border-violet-400/30 bg-violet-400/10 text-violet-300",
          rejected:      "border-red-400/30 bg-red-400/10 text-red-300",
        };
        return (
          <Modal open onClose={() => setClaimsModal(null)} title={`${claimsModal.title} — Claims (${claimList.length})`}>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {claimList.length === 0 && (
                <p className="text-sm text-white/45">No claims yet.</p>
              )}
              {claimList.map((c) => (
                <div key={c.id} className="bg-[#0F1014] rounded-lg px-3 py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/85 font-medium">{c.memberName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`members-chip ${STATUS_CHIP[c.status] ?? "border-white/15 bg-white/5 text-white/50"}`}>
                        {c.status === "claimed" ? "In Progress" : c.status}
                      </span>
                      <span className="text-white/30">claimed {new Date(c.claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                  {c.dueDate && <p className="text-white/40">Due {c.dueDate}</p>}
                  {c.deliverableUrl && (
                    <a href={c.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-[#85CC17]/80 hover:text-[#85CC17] underline underline-offset-2 block truncate">
                      {c.deliverableUrl}
                    </a>
                  )}
                  {c.submissionNotes && <p className="text-white/55 line-clamp-3">{c.submissionNotes}</p>}
                  {c.status === "Approved" && c.creditsAwarded !== undefined && (
                    <p className="text-violet-300">{c.creditsAwarded} credit{c.creditsAwarded !== 1 ? "s" : ""} awarded{c.approvedBy ? ` by ${c.approvedBy}` : ""}</p>
                  )}
                  {c.status === "rejected" && c.rejectReason && (
                    <p className="text-red-300/80">Reason: {c.rejectReason}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-white/8">
              <Btn variant="ghost" onClick={() => setClaimsModal(null)}>Close</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Send Update + history modal */}
      {updatesModal && (() => {
        const activeClaimers = (claimsByAssignment.get(updatesModal.id) ?? []).filter(
          (c) => c.status !== "rejected" && c.status !== "Approved",
        );
        const updateHistory = [...(updatesByAssignment.get(updatesModal.id) ?? [])].sort(
          (a, b) => a.postedAt.localeCompare(b.postedAt),
        );
        return (
          <Modal open onClose={closeUpdatesModal} title={`Updates · ${updatesModal.title}`}>
            <div className="space-y-4">

              {/* Recipients */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Recipients</p>
                {activeClaimers.length === 0 ? (
                  <p className="text-xs text-white/35 italic">No active claimants — updates are saved but no one is emailed.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activeClaimers.map((c) => (
                      <span key={c.id} className="members-chip border-white/15 bg-white/5 text-white/65">{c.memberName}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Update history with edit / delete */}
              {updateHistory.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Update history</p>
                  <div className="space-y-2 max-h-[28vh] overflow-y-auto pr-1">
                    {updateHistory.map((u) => (
                      <div key={u.id} className="rounded-lg border border-[#85CC17]/15 bg-[#85CC17]/5 px-3 py-2.5 text-xs">
                        {editingUpdateId === u.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={3}
                              value={editingUpdateText}
                              onChange={(e) => setEditingUpdateText(e.target.value)}
                              className="w-full bg-[#0F1014] border border-white/15 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/25 focus:outline-none focus:border-[#85CC17]/40 resize-none"
                            />
                            {updateActionError && (
                              <p className="text-red-400 text-[11px]">{updateActionError}</p>
                            )}
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => { setEditingUpdateId(null); setEditingUpdateText(""); setUpdateActionError(null); }}
                                className="text-[11px] text-white/40 hover:text-white/70"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveUpdateEdit(u.id)}
                                disabled={updateActionBusy || !editingUpdateText.trim()}
                                className="text-[11px] text-[#85CC17] hover:text-[#9BE22B] disabled:opacity-40"
                              >
                                {updateActionBusy ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-white/85 whitespace-pre-wrap">{u.message}</p>
                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              <p className="text-white/35 text-[11px] truncate">
                                {u.postedBy} · {new Date(u.postedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                              </p>
                              <div className="flex items-center gap-3 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { setEditingUpdateId(u.id); setEditingUpdateText(u.message); setUpdateActionError(null); }}
                                  disabled={updateActionBusy}
                                  className="text-[11px] text-white/35 hover:text-white/70 transition-colors disabled:opacity-40"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUpdate(u.id)}
                                  disabled={updateActionBusy}
                                  className="text-[11px] text-white/25 hover:text-red-400 transition-colors disabled:opacity-40"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {updateActionError && !editingUpdateId && (
                    <p className="text-xs text-red-400 mt-2">{updateActionError}</p>
                  )}
                </div>
              )}

              {/* Compose */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">New update</label>
                <textarea
                  rows={5}
                  value={updateDraft}
                  onChange={(e) => setUpdateDraft(e.target.value)}
                  placeholder={`Write an update for ${activeClaimers.length > 0 ? `${activeClaimers.length} claimant${activeClaimers.length !== 1 ? "s" : ""}` : "this assignment"} — they'll see it in the portal and receive it by email.`}
                  className="w-full rounded-lg border border-white/12 bg-[#0F1014] px-3 py-2.5 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-[#85CC17]/40 resize-none"
                />
              </div>

              {updateSendSuccess && (
                <p className="text-xs text-[#85CC17] bg-[#85CC17]/10 border border-[#85CC17]/20 rounded-lg px-3 py-2">
                  ✓ Update sent — {activeClaimers.length} member{activeClaimers.length !== 1 ? "s" : ""} notified by email.
                </p>
              )}
              {updateSendError && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {updateSendError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/8">
              <Btn variant="ghost" onClick={closeUpdatesModal} disabled={sendingUpdate}>Close</Btn>
              <Btn
                variant="primary"
                disabled={!updateDraft.trim() || sendingUpdate}
                onClick={() => void handleSendUpdate()}
              >
                {sendingUpdate
                  ? "Sending…"
                  : activeClaimers.length > 0
                    ? `Send to ${activeClaimers.length}`
                    : "Save Update"}
              </Btn>
            </div>
          </Modal>
        );
      })()}
    </MembersLayout>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#13161D] p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
