"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, SearchBar, Empty, useConfirm, Spinner,
  ViewPanel, ViewSection,
} from "@/components/members/ui";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/members/RichTextEditor";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeProjectGroups, subscribeCycles, subscribeAssignmentTemplates,
  createAssignment, updateAssignment, archiveAssignment, hardDeleteAssignment, deleteAssignmentClaim,
  createProjectGroup, updateProjectGroup, deleteProjectGroup,
  type Assignment, type AssignmentClaim, type AssignmentStatus,
  type Business, type Cycle, type CycleRole, type CycleTrack,
  type AssignmentTemplate, type ProjectGroup,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── Constants ─────────────────────────────────────────────────────────────────

type ProjectStatusValue = "Ongoing" | "Upcoming" | "Completed";

function normalizeBizStatus(raw: unknown): ProjectStatusValue {
  const v = String(raw ?? "").trim();
  if (v === "Ongoing" || v === "Active") return "Ongoing";
  if (v === "Completed" || v === "Complete") return "Completed";
  return "Upcoming";
}


const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const ASSIGNMENT_STATUS_STYLES: Record<AssignmentStatus, string> = {
  Open: "border-[#F6B78D]/30 bg-[#F6B78D]/10 text-[#F3E28D]",
  Active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  "Under Review": "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Completed: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Archived: "border-white/10 bg-white/5 text-white/35",
};

const BIZ_STATUS_LABEL: Record<ProjectStatusValue, { text: string; cls: string }> = {
  Ongoing:   { text: "Ongoing",   cls: "text-green-400" },
  Upcoming:  { text: "Upcoming",  cls: "text-blue-400" },
  Completed: { text: "Completed", cls: "text-white/40" },
};

const GROUP_COLOR_BORDER: Record<ProjectGroup["color"], string> = {
  green:  "border-l-[#F6B78D]/60",
  blue:   "border-l-blue-500/60",
  amber:  "border-l-amber-500/60",
  purple: "border-l-purple-500/60",
  gray:   "border-l-white/20",
};

const BIZ_STATUS_BORDER: Record<ProjectStatusValue, string> = {
  Ongoing:   "border-l-[#F6B78D]/40",
  Upcoming:  "border-l-blue-500/40",
  Completed: "border-l-white/15",
};

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance", "General"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "Active", "Under Review", "Completed", "Archived"];
const GROUP_COLORS: ProjectGroup["color"][] = ["green", "blue", "amber", "purple", "gray"];
const GROUP_STATUSES: ProjectGroup["status"][] = ["Ongoing", "Upcoming", "Completed"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectCard {
  key: string;
  label: string;
  subtitle: string;
  status: ProjectStatusValue;
  borderCls: string;
  assignments: Assignment[];
  bizId?: string;
  grpId?: string;
  isNovus?: boolean;
}

interface AssignmentFormState {
  title: string;
  description: string;
  track: CycleTrack;
  type: string;
  projectRef: string;
  credits: number;
  estimatedHours: number;
  minRole: CycleRole;
  limitClaims: boolean;
  capacity: number;
  deadlineType: "hard" | "offset";
  hardDeadline: string;
  deadlineOffsetDays: string;
  recurringEnabled: boolean;
  checkinIntervalDays: string;
  maxDurationDays: string;
  status: AssignmentStatus;
  priority: boolean;
  requiresApproval: boolean;
  applicationRequired: boolean;
  allowMultipleCompletions: boolean;
  notes: string;
  region: string;
  teamLabel: string;
}

const BLANK_ASSIGNMENT: AssignmentFormState = {
  title: "",
  description: "",
  track: "Tech",
  type: "",
  projectRef: "volta",
  credits: 1,
  estimatedHours: 1,
  minRole: "Analyst",
  limitClaims: true,
  capacity: 1,
  deadlineType: "hard",
  hardDeadline: "",
  deadlineOffsetDays: "",
  recurringEnabled: false,
  checkinIntervalDays: "7",
  maxDurationDays: "",
  status: "Open",
  priority: false,
  requiresApproval: true,
  applicationRequired: false,
  allowMultipleCompletions: false,
  notes: "",
  region: "",
  teamLabel: "",
};

interface GroupFormState {
  name: string;
  description: string;
  color: ProjectGroup["color"];
  status: ProjectGroup["status"];
}

const BLANK_GROUP: GroupFormState = { name: "", description: "", color: "gray", status: "Ongoing" };

// ── Helpers ───────────────────────────────────────────────────────────────────

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


// ── Main page ─────────────────────────────────────────────────────────────────

export default function ByProjectPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();
  const editorRef = useRef<RichTextEditorHandle>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims]           = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>([]);
  const [cycles, setCycles]           = useState<Cycle[]>([]);
  const [templates, setTemplates]     = useState<AssignmentTemplate[]>([]);

  const [search, setSearch]         = useState("");
  const [filterTracks, setFilterTracks]   = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());

  // per-assignment inline expand (keyed by assignment.id)
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set());

  const [assignmentModal, setAssignmentModal] = useState<"create" | "edit" | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentForm, setAssignmentForm]       = useState<AssignmentFormState>(BLANK_ASSIGNMENT);
  const [_bizSearch, setBizSearch] = useState("");
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  const [groupModal, setGroupModal]       = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup]   = useState<ProjectGroup | null>(null);
  const [groupForm, setGroupForm]         = useState<GroupFormState>(BLANK_GROUP);
  const [groupBusy, setGroupBusy]         = useState(false);
  const [groupError, setGroupError]       = useState<string | null>(null);
  const [claimsModal, setClaimsModal]     = useState<Assignment | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    const u1 = subscribeAssignments(setAssignments);
    const u2 = subscribeAssignmentClaims(setClaims);
    const u3 = subscribeBusinesses(setBusinesses);
    const u4 = subscribeProjectGroups(setProjectGroups);
    const u5 = subscribeCycles(setCycles);
    const u6 = subscribeAssignmentTemplates(setTemplates);
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const q = search.trim().toLowerCase();

  // Build unified card list ─ one card per business-with-assignments + one per project group-with-assignments
  const cards = useMemo((): ProjectCard[] => {
    const result: ProjectCard[] = [];
    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    const activeAssignments = assignments.filter((a) => a.status !== "Archived");

    // Business cards
    const bizAssignments = new Map<string, Assignment[]>();
    for (const a of activeAssignments) {
      if (!a.businessId) continue;
      const list = bizAssignments.get(a.businessId) ?? [];
      list.push(a);
      bizAssignments.set(a.businessId, list);
    }
    for (const [bizId, list] of bizAssignments) {
      const biz = bizMap.get(bizId);
      if (!biz) continue;
      const status = normalizeBizStatus(biz.projectStatus);
      result.push({
        key:        `biz:${bizId}`,
        label:      biz.name,
        subtitle:   biz.neighborhood ?? "",
        status,
        borderCls:  BIZ_STATUS_BORDER[status],
        assignments: list,
        bizId,
      });
    }

    // Project group cards
    const grpAssignments = new Map<string, Assignment[]>();
    for (const a of activeAssignments) {
      if (!a.projectGroupId) continue;
      const list = grpAssignments.get(a.projectGroupId) ?? [];
      list.push(a);
      grpAssignments.set(a.projectGroupId, list);
    }
    for (const grp of projectGroups) {
      const list = grpAssignments.get(grp.id) ?? [];
      if (!list.length) continue;
      result.push({
        key:        `grp:${grp.id}`,
        label:      grp.name,
        subtitle:   grp.description,
        status:     grp.status,
        borderCls:  GROUP_COLOR_BORDER[grp.color ?? "gray"],
        assignments: list,
        grpId:      grp.id,
      });
    }

    const novusAssignments = activeAssignments.filter((a) => !a.businessId && !a.projectGroupId);
    if (novusAssignments.length) {
      result.unshift({
        key: "volta",
        label: "Novus",
        subtitle: "Internal assignments",
        status: "Ongoing",
        borderCls: "border-l-[#F6B78D]/60",
        assignments: novusAssignments,
        isNovus: true,
      });
    }

    return result;
  }, [assignments, businesses, projectGroups]);

  const hasActiveFilters = filterTracks.size > 0 || filterStatuses.size > 0;

  const visibleCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (filterStatuses.size > 0 && !filterStatuses.has(card.status)) return false;
        const assignmentsForTrack = filterTracks.size > 0
          ? card.assignments.filter((a) => filterTracks.has(a.track))
          : card.assignments;
        if (!assignmentsForTrack.length) return false;
        if (!q) return true;
        const nameMatch = card.label.toLowerCase().includes(q) || card.subtitle.toLowerCase().includes(q);
        const assignmentMatch = assignmentsForTrack.some((a) => a.title.toLowerCase().includes(q));
        return nameMatch || assignmentMatch;
      })
      .sort((a, b) => {
        const cd = b.assignments.length - a.assignments.length;
        if (cd !== 0) return cd;
        return a.label.localeCompare(b.label);
      });
  }, [cards, filterTracks, filterStatuses, q]);

  const toggleRowExpand = (id: string) =>
    setExpandedRows((prev) => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });

  // ── Assignment form helpers ───────────────────────────────────────────────

  const sortedBusinessOptions = useMemo(
    () => [...businesses].sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );
  const sortedGroupOptions = useMemo(
    () => [...projectGroups].sort((a, b) => a.name.localeCompare(b.name)),
    [projectGroups],
  );

  const refToLabel = (ref: string): string => {
    if (ref.startsWith("biz:")) {
      const biz = businesses.find((b) => b.id === ref.slice(4));
      return biz ? biz.name : "";
    }
    if (ref.startsWith("grp:")) {
      const grp = projectGroups.find((g) => g.id === ref.slice(4));
      return grp ? grp.name : "";
    }
    return "Novus";
  };

  const openCreateAssignment = (prefillRef = "") => {
    setAssignmentForm({ ...BLANK_ASSIGNMENT, projectRef: prefillRef });
    setEditingAssignment(null);
    setBizSearch(prefillRef ? refToLabel(prefillRef) : "");
    setAssignmentError(null);
    setTemplateSearch("");
    setTemplateDropdownOpen(false);
    setAssignmentModal("create");
  };

  const openEditAssignment = (a: Assignment) => {
    const ref = encodeProjectRef(a.businessId, a.projectGroupId);
    const isOffset = a.deadlineType === "offset";
    setAssignmentForm({
      title:              a.title,
      description:        a.description ?? "",
      track:              a.track ?? "Tech",
      type:               a.type ?? "",
      projectRef:         ref,
      credits:            a.credits ?? 1,
      estimatedHours:     a.estimatedHours ?? 0,
      minRole:            a.minRole ?? "Analyst",
      limitClaims:        (a.capacity ?? 0) > 0,
      capacity:           (a.capacity ?? 0) > 0 ? (a.capacity ?? 1) : 1,
      deadlineType:       isOffset ? "offset" : "hard",
      hardDeadline:       !isOffset ? (a.deadlines?.[0]?.date ?? "") : "",
      deadlineOffsetDays: isOffset ? String(a.deadlineOffsetDays ?? "") : "",
      recurringEnabled:   Boolean(a.recurringEnabled),
      checkinIntervalDays: a.checkinIntervalDays != null ? String(a.checkinIntervalDays) : "7",
      maxDurationDays:    a.maxDurationDays != null ? String(a.maxDurationDays) : "",
      status:             a.status,
      priority:                 Boolean(a.priority),
      requiresApproval:         a.requiresApproval !== false,
      applicationRequired:      Boolean(a.applicationRequired),
      allowMultipleCompletions: Boolean(a.allowMultipleCompletions),
      notes:                    a.notes ?? "",
      region:                   a.region ?? "",
      teamLabel:                a.teamLabel ?? "",
    });
    setBizSearch(refToLabel(ref));

    setEditingAssignment(a);
    setAssignmentError(null);
    setAssignmentModal("edit");
  };

  const applyTemplate = (t: AssignmentTemplate) => {
    const isOffset = !t.recurringEnabled && (t.deadlineOffsetDays ?? 0) > 0;
    setAssignmentForm((prev) => ({
      ...prev,
      title:              t.title,
      description:        t.description ?? "",
      track:              t.track,
      type:               t.type ?? "",
      credits:            t.credits,
      estimatedHours:     t.estimatedHours,
      minRole:            t.minRole,
      capacity:           t.capacity,
      requiresApproval:         t.requiresApproval !== false,
      applicationRequired:      Boolean(t.applicationRequired),
      allowMultipleCompletions: Boolean(t.allowMultipleCompletions),
      notes:              t.notes ?? "",
      recurringEnabled:   Boolean(t.recurringEnabled),
      checkinIntervalDays: t.checkinIntervalDays != null ? String(t.checkinIntervalDays) : "7",
      maxDurationDays:    t.maxDurationDays != null ? String(t.maxDurationDays) : "",
      deadlineType:       isOffset ? "offset" : "hard",
      deadlineOffsetDays: isOffset ? String(t.deadlineOffsetDays ?? "") : "",
    }));
  };

  const buildAssignmentPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = assignmentForm.title.trim();
    if (!title) return null;
    const { businessId, projectGroupId } = decodeProjectRef(assignmentForm.projectRef);
    const isRecurring = assignmentForm.recurringEnabled;
    const isOffset = !isRecurring && assignmentForm.deadlineType === "offset";
    return {
      title,
      description:        assignmentForm.description,
      track:              assignmentForm.track,
      type:               assignmentForm.type || undefined,
      businessId,
      projectGroupId,
      status:             assignmentForm.status,
      priority:           assignmentForm.priority,
      credits:            Math.max(0, Number(assignmentForm.credits) || 0),
      estimatedHours:     Math.max(0, Number(assignmentForm.estimatedHours) || 0),
      minRole:            assignmentForm.minRole,
      capacity:           assignmentForm.limitClaims ? Math.max(1, Number(assignmentForm.capacity) || 1) : 0,
      deadlines:          !isRecurring && !isOffset && assignmentForm.hardDeadline
                            ? [{ label: "Final Deadline", date: assignmentForm.hardDeadline }]
                            : null,
      deadlineType:       isRecurring ? "hard" : assignmentForm.deadlineType,
      deadlineOffsetDays: isOffset && assignmentForm.deadlineOffsetDays ? Number(assignmentForm.deadlineOffsetDays) : null,
      recurringEnabled:   assignmentForm.recurringEnabled,
      checkinIntervalDays: isRecurring && assignmentForm.checkinIntervalDays ? Number(assignmentForm.checkinIntervalDays) : null,
      maxDurationDays:    isRecurring && assignmentForm.maxDurationDays ? Number(assignmentForm.maxDurationDays) : null,
      requiresApproval:         assignmentForm.requiresApproval,
      applicationRequired:      assignmentForm.applicationRequired,
      allowMultipleCompletions: assignmentForm.allowMultipleCompletions,
      notes:              assignmentForm.notes,
      region:             assignmentForm.region || undefined,
      teamLabel:          assignmentForm.teamLabel || undefined,
      cycleId:            editingAssignment?.cycleId ?? activeCycle?.id ?? "",
      createdBy:          editingAssignment?.createdBy ?? userProfile?.email ?? user?.email ?? user?.id ?? "unknown",
      difficulty:         editingAssignment?.difficulty ?? "Standard",
    };
  };

  const handleSaveAssignment = async () => {
    const payload = buildAssignmentPayload();
    if (!payload) return;
    setAssignmentBusy(true);
    setAssignmentError(null);
    try {
      if (editingAssignment) await updateAssignment(editingAssignment.id, payload);
      else await createAssignment(payload);
      setAssignmentModal(null);
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setAssignmentBusy(false);
    }
  };

  const handleArchiveAssignment = async () => {
    if (!editingAssignment) return;
    const claimList = claimsByAssignment.get(editingAssignment.id) ?? [];
    const pendingClaims = claimList.filter((c) => c.status !== "Approved" && c.status !== "rejected");
    const msg = pendingClaims.length > 0
      ? `Archive "${editingAssignment.title}"? ${pendingClaims.length} pending claim${pendingClaims.length === 1 ? "" : "s"} will be cancelled. Approved credits are preserved.`
      : `Archive "${editingAssignment.title}"? It will be hidden from the marketplace. Approved credits are preserved.`;
    await ask(async () => {
      for (const c of pendingClaims) await deleteAssignmentClaim(c.id);
      await archiveAssignment(editingAssignment.id);
      setAssignmentModal(null);
    }, msg);
  };

  const handleHardDeleteAssignment = async () => {
    if (!editingAssignment) return;
    const claimList = claimsByAssignment.get(editingAssignment.id) ?? [];
    const approvedCount = claimList.filter((c) => c.status === "Approved").length;
    const warn = approvedCount > 0
      ? ` Warning: ${approvedCount} approved claim${approvedCount === 1 ? "" : "s"} exist — their credit records will also be deleted.`
      : "";
    await ask(async () => {
      await hardDeleteAssignment(editingAssignment.id);
      setAssignmentModal(null);
    }, `Permanently delete "${editingAssignment.title}"? This cannot be undone.${warn}`);
  };

  // ── Group form helpers ────────────────────────────────────────────────────

  const openCreateGroup = () => {
    setGroupForm(BLANK_GROUP);
    setEditingGroup(null);
    setGroupError(null);
    setGroupModal("create");
  };

  const openEditGroup = (grp: ProjectGroup) => {
    setGroupForm({
      name:        grp.name,
      description: grp.description,
      color:       grp.color,
      status:      grp.status,
    });
    setEditingGroup(grp);
    setGroupError(null);
    setGroupModal("edit");
  };

  const handleSaveGroup = async () => {
    const name = groupForm.name.trim();
    if (!name) return;
    setGroupBusy(true);
    setGroupError(null);
    try {
      const payload = { name, description: groupForm.description, color: groupForm.color, status: groupForm.status, sortOrder: 0 };
      if (editingGroup) await updateProjectGroup(editingGroup.id, payload);
      else await createProjectGroup(payload);
      setGroupModal(null);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!editingGroup) return;
    const assignmentCount = assignments.filter((a) => a.projectGroupId === editingGroup.id).length;
    if (assignmentCount > 0) {
      alert(`Cannot delete — this group has ${assignmentCount} assignment${assignmentCount !== 1 ? "s" : ""} attached. Reassign or delete them first.`);
      return;
    }
    await ask(async () => {
      await deleteProjectGroup(editingGroup.id);
      setGroupModal(null);
    }, `Delete group "${editingGroup.name}"?`);
  };

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </MembersLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MembersLayout>
      <PageHeader
        title="Assignments"
        action={
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={openCreateGroup}>+ New Group</Btn>
            <Btn variant="primary" size="sm" onClick={() => openCreateAssignment()}>+ Add Assignment</Btn>
          </div>
        }
      />
      <SectionTabs tabs={ASSIGNMENTS_TABS} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects or assignments…" />
        <ViewPanel active={hasActiveFilters}>
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
          <ViewSection label="Project Status">
            <div className="space-y-1.5">
              {(["Ongoing", "Upcoming", "Completed"] as const).map((s) => (
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
      </div>

      {/* Section list */}
      {visibleCards.length === 0 ? (
        <Empty message={q ? "No projects match your search." : "No active projects with assignments."} />
      ) : (
        <div className="flex flex-col gap-5">
          {visibleCards.map((card) => {
            const statusInfo = BIZ_STATUS_LABEL[card.status];
            const assignmentsToShow =
              filterTracks.size === 0
                ? card.assignments
                : card.assignments.filter((a) => filterTracks.has(a.track));

            const filteredAssignments = (q
              ? assignmentsToShow.filter(
                  (a) => a.title.toLowerCase().includes(q) || a.track.toLowerCase().includes(q),
                )
              : assignmentsToShow
            ).sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || a.title.localeCompare(b.title));

            const grp = card.grpId ? projectGroups.find((g) => g.id === card.grpId) : null;

            return (
              <div
                key={card.key}
                className={`rounded-xl border border-white/8 bg-[#13161D] border-l-4 ${card.borderCls} overflow-hidden`}
              >
                {/* Section header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/8">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-[15px] font-bold text-white/90 truncate">{card.label}</span>
                    {card.subtitle && (
                      <span className="text-[12px] text-white/40 truncate hidden sm:block">{card.subtitle}</span>
                    )}
                    <span className={`text-[11px] font-semibold shrink-0 ${statusInfo.cls}`}>{statusInfo.text}</span>
                    <span className="text-[11px] text-white/25 shrink-0">
                      {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {grp && (
                      <button
                        onClick={() => openEditGroup(grp)}
                        className="px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04] text-[11px] text-white/50 hover:border-white/25 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
                      >
                        Edit Group
                      </button>
                    )}
                    <button
                      onClick={() => openCreateAssignment(card.key)}
                      className="px-3 py-1.5 rounded-lg border border-[#F6B78D]/30 bg-[#F6B78D]/[0.08] text-[11px] text-[#F3E28D]/80 hover:text-[#F3E28D] hover:border-[#F6B78D]/50 hover:bg-[#F6B78D]/[0.13] transition-colors font-medium"
                    >
                      + Add Assignment
                    </button>
                  </div>
                </div>

                {/* Assignment table */}
                {filteredAssignments.length === 0 ? (
                  <p className="text-[12px] text-white/30 px-5 py-4">No assignments match filters.</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-[11px] uppercase tracking-wider text-white/35 font-semibold px-5 py-3 text-left">Assignment</th>
                        <th className="text-[11px] uppercase tracking-wider text-white/35 font-semibold px-4 py-3 text-left w-28">Status</th>
                        <th className="text-[11px] uppercase tracking-wider text-white/35 font-semibold px-4 py-3 text-right w-24">Credits</th>
                        <th className="text-[11px] uppercase tracking-wider text-white/35 font-semibold px-4 py-3 text-left w-28">Capacity</th>
                        <th className="text-[11px] uppercase tracking-wider text-white/35 font-semibold px-4 py-3 text-left w-40">Deadline</th>
                        <th className="w-44" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map((a) => {
                        const isRowExpanded = expandedRows.has(a.id);
                        const claimList = claimsByAssignment.get(a.id) ?? [];
                        const activeClaims = claimList.filter((c) => c.status !== "rejected");
                        const deadline = a.deadlines?.[0]?.date ?? "";
                        const deadlineLabel = a.recurringEnabled
                          ? `↻ every ${a.checkinIntervalDays ?? 7} days`
                          : a.deadlineType === "offset" && a.deadlineOffsetDays
                          ? `+${a.deadlineOffsetDays}d after claim`
                          : deadline || "—";

                        return (
                          <Fragment key={a.id}>
                            <tr
                              onClick={() => toggleRowExpand(a.id)}
                              className={`border-b border-white/5 cursor-pointer hover:bg-white/[0.025] transition-colors ${a.priority ? "bg-amber-400/[0.035]" : ""}`}
                            >
                              {/* Title */}
                              <td className="px-5 py-3.5 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`shrink-0 w-2 h-2 rounded-full ${TRACK_DOT[a.track] ?? "bg-gray-400"}`} />
                                  <span className="text-[13px] font-semibold text-white/85">{a.title}</span>
                                  {a.priority && <span className="shrink-0 text-[10px] text-amber-300 font-bold">⚡</span>}
                                  {a.recurringEnabled && <span className="shrink-0 text-[10px] text-purple-400">↻</span>}
                                </div>
                                <p className="text-[11px] text-white/35 pl-3.5">{a.track}</p>
                              </td>
                              {/* Status */}
                              <td className="px-4 py-3.5 w-28">
                                <span className={`members-chip text-[10px] font-semibold border ${ASSIGNMENT_STATUS_STYLES[a.status]}`}>
                                  {a.status}
                                </span>
                              </td>
                              {/* Credits */}
                              <td className="px-4 py-3.5 w-24 text-right">
                                <span className="text-[14px] font-semibold text-[#F6B78D]">{a.credits}</span>
                                {a.recurringEnabled && <span className="text-[10px] text-[#F6B78D]/55 ml-1">/check-in</span>}
                              </td>
                              {/* Capacity */}
                              <td className="px-4 py-3.5 w-28 text-[12px]">
                                {a.capacity === 0 ? (
                                  <span className="text-white/25">Unlimited</span>
                                ) : (
                                  <span className={activeClaims.length >= a.capacity ? "text-amber-300 font-semibold" : "text-white/55"}>
                                    {activeClaims.length} / {a.capacity}
                                  </span>
                                )}
                              </td>
                              {/* Deadline */}
                              <td className="px-4 py-3.5 w-40 text-[12px] text-white/50">
                                {deadlineLabel}
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-3.5 w-40">
                                <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                  {claimList.length > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setClaimsModal(a); }}
                                      title={`${claimList.length} claim${claimList.length !== 1 ? "s" : ""}`}
                                      className="h-7 inline-flex items-center gap-1 px-2 rounded-md border bg-cyan-400/[0.06] border-cyan-400/25 text-cyan-300/65 hover:text-cyan-300 hover:bg-cyan-400/[0.1] hover:border-cyan-400/40 text-[10px] font-medium transition-colors whitespace-nowrap"
                                    >
                                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                      </svg>
                                      <span>{claimList.length}</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditAssignment(a); }}
                                    className="h-7 inline-flex items-center px-2.5 rounded-md border border-white/12 bg-white/[0.04] text-[10px] font-medium text-white/50 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.07] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <span className={`w-4 text-center text-white/20 text-[11px] inline-block transition-transform ${isRowExpanded ? "rotate-180" : ""}`}>▾</span>
                                </div>
                              </td>
                            </tr>
                            {/* Inline expand */}
                            {isRowExpanded && (
                              <tr key={a.id + "-expand"} className="border-b border-white/5 bg-[#0B0D12]">
                                <td colSpan={6} className="px-6 py-4">
                                  <div className="flex gap-8">
                                    <div className="flex-1 min-w-0 space-y-3">
                                      {a.description && (
                                        <div
                                          className="text-[13px] text-white/65 prose-invert leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.description) }}
                                        />
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
                                      {!!a.estimatedHours && (
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Est. Time</p>
                                          <p className="text-[13px] text-white/60">{a.estimatedHours}h</p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">Approval</p>
                                        <p className={`text-[13px] ${a.requiresApproval ? "text-white/55" : "text-[#F3E28D]/70"}`}>
                                          {a.requiresApproval ? "Manual review" : "Auto-approved"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment modal */}
      {assignmentModal && (
        <Modal
          open={assignmentModal !== null}
          title={assignmentModal === "create" ? "New Assignment" : "Edit Assignment"}
          onClose={() => setAssignmentModal(null)}
        >
          <div className="flex flex-col gap-4">
            {/* Template picker */}
            {assignmentModal === "create" && templates.length > 0 && (
              <Field label="Use Template">
                <div className="relative">
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => { setTemplateSearch(e.target.value); setTemplateDropdownOpen(true); }}
                    onFocus={() => setTemplateDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setTemplateDropdownOpen(false), 150)}
                    placeholder="Search templates…"
                    className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#F6B78D]/50"
                  />
                  {templateDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-[#13161D] border border-white/12 rounded-xl overflow-hidden shadow-xl max-h-52 overflow-y-auto">
                      {templates
                        .filter((t) => {
                          const q = templateSearch.trim().toLowerCase();
                          return !q || t.title.toLowerCase().includes(q) || (t.track ?? "").toLowerCase().includes(q);
                        })
                        .slice(0, 12)
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onMouseDown={() => { applyTemplate(t); setTemplateSearch(`${t.track} · ${t.title}`); setTemplateDropdownOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-white/[0.06] transition-colors"
                          >
                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mr-2">{t.track}</span>
                            <span className="text-sm text-white/85">{t.title}</span>
                          </button>
                        ))}
                      {templates.filter((t) => {
                        const q = templateSearch.trim().toLowerCase();
                        return !q || t.title.toLowerCase().includes(q) || (t.track ?? "").toLowerCase().includes(q);
                      }).length === 0 && (
                        <p className="px-3 py-2 text-sm text-white/35">No templates match.</p>
                      )}
                    </div>
                  )}
                </div>
              </Field>
            )}
            <Field label="Title">
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Assignment title"
              />
            </Field>
            <Field label="Project">
              <Select
                value={assignmentForm.projectRef}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssignmentForm((p) => ({ ...p, projectRef: val }));
                  setBizSearch(val ? (refToLabel(val) ?? "") : "");
                }}
              >
                <option value="volta">Novus</option>
                {sortedBusinessOptions.length > 0 && (
                  <optgroup label="Businesses">
                    {sortedBusinessOptions.map((b) => (
                      <option key={b.id} value={`biz:${b.id}`}>{b.name}{b.neighborhood ? ` · ${b.neighborhood}` : ""}</option>
                    ))}
                  </optgroup>
                )}
                {sortedGroupOptions.length > 0 && (
                  <optgroup label="Project Groups">
                    {sortedGroupOptions.map((g) => (
                      <option key={g.id} value={`grp:${g.id}`}>{g.name}</option>
                    ))}
                  </optgroup>
                )}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Track">
                <Select
                  value={assignmentForm.track}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, track: e.target.value as CycleTrack }))}
                >
                  {MEMBER_TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={assignmentForm.status}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, status: e.target.value as AssignmentStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label={assignmentForm.recurringEnabled ? "Credits / check-in" : "Credits"}>
                <Input
                  type="number"
                  min={0}
                  value={assignmentForm.credits}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, credits: Number(e.target.value) }))}
                />
              </Field>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1.5">Claimant limit</label>
                <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignmentForm.limitClaims}
                      onChange={(e) => setAssignmentForm((p) => ({ ...p, limitClaims: e.target.checked }))}
                      className="members-checkbox"
                    />
                    Limit claimants
                  </label>
                  {assignmentForm.limitClaims && (
                    <div className="flex items-center gap-2 pl-5">
                      <Input
                        type="number"
                        min={1}
                        value={assignmentForm.capacity}
                        onChange={(e) => setAssignmentForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                        className="w-20"
                      />
                      <span className="text-xs text-white/40">max</span>
                    </div>
                  )}
                  {!assignmentForm.limitClaims && (
                    <p className="text-xs text-white/35 pl-5">Unlimited spots.</p>
                  )}
                </div>
              </div>
              <Field label="Min Role">
                <Select
                  value={assignmentForm.minRole}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Est. Hours">
                <Input
                  type="number"
                  min={0}
                  value={assignmentForm.estimatedHours}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, estimatedHours: Number(e.target.value) }))}
                />
              </Field>
            </div>
            {/* Recurring toggle */}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1014] px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm text-white/85 font-medium">Recurring check-in assignment</p>
                <p className="text-[11px] text-white/40 mt-0.5">Credits awarded per check-in, not once on completion.</p>
              </div>
              <input
                type="checkbox"
                className="members-checkbox"
                checked={assignmentForm.recurringEnabled}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, recurringEnabled: e.target.checked }))}
              />
            </label>

            {assignmentForm.recurringEnabled ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in every (days)">
                  <Input
                    type="number"
                    min={1}
                    value={assignmentForm.checkinIntervalDays}
                    placeholder="7"
                    onChange={(e) => setAssignmentForm((p) => ({ ...p, checkinIntervalDays: e.target.value }))}
                  />
                </Field>
                <Field label="Max duration (days, optional)">
                  <Input
                    type="number"
                    min={1}
                    value={assignmentForm.maxDurationDays}
                    placeholder="No limit"
                    onChange={(e) => setAssignmentForm((p) => ({ ...p, maxDurationDays: e.target.value }))}
                  />
                </Field>
              </div>
            ) : (
              <div>
                <div className="flex gap-2 mb-3">
                  {(["hard", "offset"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAssignmentForm((p) => ({ ...p, deadlineType: t }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-left border transition-colors ${
                        assignmentForm.deadlineType === t
                          ? "border-[#F6B78D]/40 bg-[#F6B78D]/10"
                          : "border-white/12 hover:border-white/25"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${assignmentForm.deadlineType === t ? "text-[#F3E28D]" : "text-white/55"}`}>
                        {t === "hard" ? "Fixed date" : "Days after claiming"}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${assignmentForm.deadlineType === t ? "text-[#F3E28D]/70" : "text-white/30"}`}>
                        {t === "hard" ? "Same date for everyone" : "Countdown starts when member signs up"}
                      </p>
                    </button>
                  ))}
                </div>
                {assignmentForm.deadlineType === "hard" ? (
                  <Field label="Deadline date">
                    <Input
                      type="date"
                      value={assignmentForm.hardDeadline}
                      onChange={(e) => setAssignmentForm((p) => ({ ...p, hardDeadline: e.target.value }))}
                    />
                  </Field>
                ) : (
                  <Field label="Days after member claims">
                    <Input
                      type="number"
                      min={1}
                      value={assignmentForm.deadlineOffsetDays}
                      placeholder="e.g. 7"
                      onChange={(e) => setAssignmentForm((p) => ({ ...p, deadlineOffsetDays: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={assignmentForm.priority}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, priority: e.target.checked }))}
                className="members-checkbox"
              />
              Priority assignment
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={assignmentForm.requiresApproval}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, requiresApproval: e.target.checked }))}
                className="members-checkbox"
              />
              <span>
                Requires approval
                <span className="ml-1.5 text-white/35 text-xs font-normal">— uncheck to auto-award credits on submit</span>
              </span>
            </label>
            <Field label="Description">
              <RichTextEditor
                ref={editorRef}
                content={assignmentForm.description}
                onChange={(v) => setAssignmentForm((p) => ({ ...p, description: v }))}
                placeholder="Assignment description…"
                minHeight={100}
              />
            </Field>
            <Field label="Notes (internal)">
              <Input
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes"
              />
            </Field>
          </div>
          {assignmentError && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
              {assignmentError}
            </p>
          )}
          <div className="flex items-center gap-2 justify-between mt-4 pt-4 border-t border-white/8">
            <div className="flex gap-2">
              {assignmentModal === "edit" && editingAssignment?.status !== "Archived" && (
                <Btn variant="danger" size="sm" onClick={() => void handleArchiveAssignment()}>Archive</Btn>
              )}
              {assignmentModal === "edit" && editingAssignment?.status === "Archived" && (
                <Btn variant="danger" size="sm" onClick={() => void handleHardDeleteAssignment()}>Delete permanently</Btn>
              )}
            </div>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setAssignmentModal(null)} disabled={assignmentBusy}>Cancel</Btn>
              <Btn variant="primary" size="sm" onClick={() => void handleSaveAssignment()} disabled={assignmentBusy}>
                {assignmentBusy ? "Saving…" : "Save"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Group modal */}
      {groupModal && (
        <Modal
          open={groupModal !== null}
          title={groupModal === "create" ? "New Project Group" : "Edit Project Group"}
          onClose={() => setGroupModal(null)}
        >
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Fall 2026 Cohort, Internal Tech Projects"
              />
            </Field>
            <Field label="Description (optional)">
              <Input
                value={groupForm.description}
                onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={groupForm.status}
                  onChange={(e) => setGroupForm((p) => ({ ...p, status: e.target.value as ProjectGroup["status"] }))}
                >
                  {GROUP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Color">
                <Select
                  value={groupForm.color}
                  onChange={(e) => setGroupForm((p) => ({ ...p, color: e.target.value as ProjectGroup["color"] }))}
                >
                  {GROUP_COLORS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          {groupError && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
              {groupError}
            </p>
          )}
          <div className="flex items-center gap-2 justify-end mt-5 pt-4 border-t border-white/8">
            {groupModal === "edit" && (
              <Btn variant="danger" size="sm" onClick={handleDeleteGroup} disabled={groupBusy}>Delete</Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={() => setGroupModal(null)} disabled={groupBusy}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={() => void handleSaveGroup()} disabled={!groupForm.name.trim() || groupBusy}>
              {groupBusy ? "Saving…" : "Save"}
            </Btn>
          </div>
        </Modal>
      )}

      <Dialog />

      {/* Claims detail modal */}
      {claimsModal && (() => {
        const claimList = claimsByAssignment.get(claimsModal.id) ?? [];
        const GROUPS: { label: string; statuses: string[]; color: string }[] = [
          { label: "Active",    statuses: ["claimed", "In Progress"], color: "text-cyan-300" },
          { label: "Submitted", statuses: ["Submitted"],              color: "text-yellow-300" },
          { label: "Approved",  statuses: ["Approved"],               color: "text-violet-300" },
          { label: "Rejected",  statuses: ["rejected"],               color: "text-red-300" },
        ];
        return (
          <Modal open onClose={() => setClaimsModal(null)} title={`${claimsModal.title} — Claims`}>
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
              {claimList.length === 0 && (
                <p className="text-sm text-white/45">No claims yet.</p>
              )}
              {GROUPS.map(({ label, statuses, color }) => {
                const group = claimList.filter((c) => statuses.includes(c.status));
                if (group.length === 0) return null;
                return (
                  <div key={label}>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${color}`}>{label} · {group.length}</p>
                    <div className="space-y-2">
                      {group.map((c) => (
                        <div key={c.id} className="bg-[#0F1014] rounded-lg px-3 py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white/85 font-medium">{c.memberName}</span>
                            <span className="text-white/30 shrink-0">claimed {new Date(c.claimedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                          {c.dueDate && <p className="text-white/40">Due {c.dueDate}</p>}
                          {c.deliverableUrl && (
                            <a href={c.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-[#F6B78D]/80 hover:text-[#F6B78D] underline underline-offset-2 block truncate">
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
                  </div>
                );
              })}
            </div>
          </Modal>
        );
      })()}
    </MembersLayout>
  );
}
