"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, SearchBar, Empty, useConfirm,
} from "@/components/members/ui";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/members/RichTextEditor";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeProjectGroups, subscribeCycles, subscribeAssignmentTemplates,
  createAssignment, updateAssignment, deleteAssignment,
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

const STATUS_TIER: Record<ProjectStatusValue, number> = { Ongoing: 0, Upcoming: 1, Completed: 2 };

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const ASSIGNMENT_STATUS_STYLES: Record<AssignmentStatus, string> = {
  Open: "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]",
  "In Progress": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Submitted: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Approved: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Finalized: "border-white/15 bg-white/5 text-white/55",
};

const BIZ_STATUS_LABEL: Record<ProjectStatusValue, { text: string; cls: string }> = {
  Ongoing:   { text: "Ongoing",   cls: "text-green-400" },
  Upcoming:  { text: "Upcoming",  cls: "text-blue-400" },
  Completed: { text: "Completed", cls: "text-white/40" },
};

const GROUP_COLOR_BORDER: Record<ProjectGroup["color"], string> = {
  green:  "border-l-[#85CC17]/60",
  blue:   "border-l-blue-500/60",
  amber:  "border-l-amber-500/60",
  purple: "border-l-purple-500/60",
  gray:   "border-l-white/20",
};

const BIZ_STATUS_BORDER: Record<ProjectStatusValue, string> = {
  Ongoing:   "border-l-[#85CC17]/40",
  Upcoming:  "border-l-blue-500/40",
  Completed: "border-l-white/15",
};

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "In Progress", "Submitted", "Approved", "Finalized"];
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
}

interface AssignmentFormState {
  title: string;
  description: string;
  track: CycleTrack;
  type: string;
  projectRef: string; // "biz:<id>" | "grp:<id>" | ""
  credits: number;
  estimatedHours: number;
  minRole: CycleRole;
  capacity: number;
  deadline: string;
  status: AssignmentStatus;
  notes: string;
  region: string;
  teamLabel: string;
}

const BLANK_ASSIGNMENT: AssignmentFormState = {
  title: "",
  description: "",
  track: "Tech",
  type: "",
  projectRef: "",
  credits: 1,
  estimatedHours: 1,
  minRole: "Analyst",
  capacity: 1,
  deadline: "",
  status: "Open",
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
  return "";
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

  const [search, setSearch]             = useState("");
  const [trackFilter, setTrackFilter]   = useState<CycleTrack | "All">("All");
  const [filterOpen, setFilterOpen]     = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());

  // per-card "show all assignments" toggle (keyed by card.key)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  // per-assignment inline expand (keyed by assignment.id)
  const [expandedRows, setExpandedRows]   = useState<Set<string>>(new Set());

  const [assignmentModal, setAssignmentModal] = useState<"create" | "edit" | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentForm, setAssignmentForm]       = useState<AssignmentFormState>(BLANK_ASSIGNMENT);

  const [groupModal, setGroupModal]       = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup]   = useState<ProjectGroup | null>(null);
  const [groupForm, setGroupForm]         = useState<GroupFormState>(BLANK_GROUP);

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

    // Business cards
    const bizAssignments = new Map<string, Assignment[]>();
    for (const a of assignments) {
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
    for (const a of assignments) {
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

    return result;
  }, [assignments, businesses, projectGroups]);

  const hasActiveFilters = filterStatuses.size > 0;

  const visibleCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (filterStatuses.size > 0 && !filterStatuses.has(card.status)) return false;
        // track filter — keep card if at least one assignment passes
        const assignmentsForTrack =
          trackFilter === "All"
            ? card.assignments
            : card.assignments.filter((a) => a.track === trackFilter);
        if (!assignmentsForTrack.length) return false;
        if (!q) return true;
        const nameMatch = card.label.toLowerCase().includes(q) || card.subtitle.toLowerCase().includes(q);
        const assignmentMatch = assignmentsForTrack.some((a) => a.title.toLowerCase().includes(q));
        return nameMatch || assignmentMatch;
      })
      .sort((a, b) => {
        const td = STATUS_TIER[a.status] - STATUS_TIER[b.status];
        if (td !== 0) return td;
        return a.label.localeCompare(b.label);
      });
  }, [cards, filterStatuses, trackFilter, q]);

  const toggleCardExpand = (key: string) =>
    setExpandedCards((prev) => {
      const n = new Set(prev);
      if (n.has(key)) { n.delete(key); } else { n.add(key); }
      return n;
    });
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

  const openCreateAssignment = (prefillRef = "") => {
    setAssignmentForm({ ...BLANK_ASSIGNMENT, projectRef: prefillRef });
    setEditingAssignment(null);
    setAssignmentModal("create");
  };

  const openEditAssignment = (a: Assignment) => {
    setAssignmentForm({
      title:         a.title,
      description:   a.description ?? "",
      track:         a.track ?? "Tech",
      type:          a.type ?? "",
      projectRef:    encodeProjectRef(a.businessId, a.projectGroupId),
      credits:       a.credits ?? 1,
      estimatedHours: a.estimatedHours ?? 0,
      minRole:       a.minRole ?? "Analyst",
      capacity:      a.capacity ?? 1,
      deadline:      (a.deadlines?.[0]?.date) ?? a.deadline ?? "",
      status:        a.status,
      notes:         a.notes ?? "",
      region:        a.region ?? "",
      teamLabel:     a.teamLabel ?? "",
    });
    setEditingAssignment(a);
    setAssignmentModal("edit");
  };

  const applyTemplate = (t: AssignmentTemplate) => {
    setAssignmentForm((prev) => ({
      ...prev,
      title:          t.title,
      description:    t.description ?? "",
      track:          t.track,
      type:           t.type ?? "",
      credits:        t.credits,
      estimatedHours: t.estimatedHours,
      minRole:        t.minRole,
      capacity:       t.capacity,
      notes:          t.notes ?? "",
    }));
  };

  const buildAssignmentPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = assignmentForm.title.trim();
    if (!title) return null;
    const { businessId, projectGroupId } = decodeProjectRef(assignmentForm.projectRef);
    return {
      title,
      description:    assignmentForm.description,
      track:          assignmentForm.track,
      type:           assignmentForm.type || undefined,
      businessId,
      projectGroupId,
      status:         assignmentForm.status,
      credits:        Math.max(0, Number(assignmentForm.credits) || 0),
      estimatedHours: Math.max(0, Number(assignmentForm.estimatedHours) || 0),
      minRole:        assignmentForm.minRole,
      capacity:       Math.max(1, Number(assignmentForm.capacity) || 1),
      deadlines:      assignmentForm.deadline ? [{ label: "Final Deadline", date: assignmentForm.deadline }] : undefined,
      notes:          assignmentForm.notes,
      region:         assignmentForm.region || undefined,
      teamLabel:      assignmentForm.teamLabel || undefined,
      cycleId:        editingAssignment?.cycleId ?? activeCycle?.id ?? "",
      createdBy:      userProfile?.email || user?.email || user?.id || "unknown",
      difficulty:     editingAssignment?.difficulty ?? "Standard",
      visibleTracks:  MEMBER_TRACKS,
    };
  };

  const handleSaveAssignment = async () => {
    const payload = buildAssignmentPayload();
    if (!payload) return;
    if (editingAssignment) await updateAssignment(editingAssignment.id, payload);
    else await createAssignment(payload);
    setAssignmentModal(null);
  };

  const handleDeleteAssignment = async () => {
    if (!editingAssignment) return;
    await ask(async () => {
      await deleteAssignment(editingAssignment.id);
      setAssignmentModal(null);
    }, `Delete "${editingAssignment.title}"? Existing claims keep their credit history.`);
  };

  // ── Group form helpers ────────────────────────────────────────────────────

  const openCreateGroup = () => {
    setGroupForm(BLANK_GROUP);
    setEditingGroup(null);
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
    setGroupModal("edit");
  };

  const handleSaveGroup = async () => {
    const name = groupForm.name.trim();
    if (!name) return;
    const payload = { name, description: groupForm.description, color: groupForm.color, status: groupForm.status, sortOrder: 0 };
    if (editingGroup) await updateProjectGroup(editingGroup.id, payload);
    else await createProjectGroup(payload);
    setGroupModal(null);
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
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects or assignments…" />
        <div className="flex items-center gap-1">
          {(["All", ...MEMBER_TRACKS] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTrackFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                trackFilter === t
                  ? "bg-[#85CC17]/15 text-[#9BE22B] border border-[#85CC17]/30"
                  : "text-white/45 hover:text-white/75 border border-transparent hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            hasActiveFilters || filterOpen
              ? "border-[#85CC17]/40 bg-[#85CC17]/10 text-[#9BE22B]"
              : "border-white/12 bg-transparent text-white/45 hover:text-white/70 hover:border-white/18"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filter{hasActiveFilters ? ` (${filterStatuses.size})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="rounded-xl border border-white/10 bg-[#13161D] p-4 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2">Status</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {(["Ongoing", "Upcoming", "Completed"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filterStatuses.has(s)}
                    onChange={() => setFilterStatuses((prev) => {
                      const next = new Set(prev);
                      if (next.has(s)) next.delete(s); else next.add(s);
                      return next;
                    })}
                    className="accent-[#85CC17]"
                  />
                  <span className="text-xs text-white/65 group-hover:text-white/90 transition-colors">{s}</span>
                </label>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-white/8 flex justify-end">
              <button
                type="button"
                onClick={() => setFilterStatuses(new Set())}
                className="text-[11px] text-white/45 hover:text-white/75 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      {visibleCards.length === 0 ? (
        <Empty message={q ? "No projects match your search." : "No active projects with assignments."} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => {
            const statusInfo = BIZ_STATUS_LABEL[card.status];
            const assignmentsToShow =
              trackFilter === "All"
                ? card.assignments
                : card.assignments.filter((a) => a.track === trackFilter);

            const filteredAssignments = q
              ? assignmentsToShow.filter(
                  (a) => a.title.toLowerCase().includes(q) || a.track.toLowerCase().includes(q),
                )
              : assignmentsToShow;

            const PREVIEW_LIMIT = 4;
            const isCardExpanded = expandedCards.has(card.key);
            const visibleAssignments = isCardExpanded
              ? filteredAssignments
              : filteredAssignments.slice(0, PREVIEW_LIMIT);
            const hiddenCount = filteredAssignments.length - PREVIEW_LIMIT;

            const openCount = filteredAssignments.filter(
              (a) => a.status === "Open" || a.status === "In Progress",
            ).length;

            const grp = card.grpId ? projectGroups.find((g) => g.id === card.grpId) : null;

            return (
              <div
                key={card.key}
                className={`flex flex-col rounded-xl border border-white/8 bg-[#13161D] border-l-4 ${card.borderCls} overflow-hidden`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/90 truncate">{card.label}</span>
                      {openCount > 0 && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#85CC17]/10 text-[#9BE22B] border border-[#85CC17]/20">
                          {openCount} open
                        </span>
                      )}
                    </div>
                    {card.subtitle && (
                      <p className="text-[11px] text-white/40 mt-0.5 truncate">{card.subtitle}</p>
                    )}
                    <p className={`text-[10px] font-semibold mt-0.5 ${statusInfo.cls}`}>{statusInfo.text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {grp && (
                      <button
                        onClick={() => openEditGroup(grp)}
                        className="text-[10px] text-white/30 hover:text-white/65 px-1.5 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => openCreateAssignment(card.key)}
                      className="text-[10px] text-white/30 hover:text-[#9BE22B] px-1.5 py-1 rounded transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Assignment rows */}
                <div className="flex flex-col border-t border-white/5">
                  {filteredAssignments.length === 0 && (
                    <p className="text-[11px] text-white/30 px-4 py-3">No assignments.</p>
                  )}
                  {visibleAssignments.map((a) => {
                    const isRowExpanded = expandedRows.has(a.id);
                    const claimList = claimsByAssignment.get(a.id) ?? [];
                    const activeClaims = claimList.filter((c) => c.status !== "rejected");
                    const claimerNames = activeClaims.map((c) => c.memberName ?? "").filter(Boolean);
                    const deadline = a.deadlines?.[0]?.date ?? "";
                    return (
                      <div key={a.id} className="border-b border-white/5 last:border-b-0">
                        {/* Row summary */}
                        <button
                          onClick={() => toggleRowExpand(a.id)}
                          className="w-full flex items-center gap-2 px-4 h-8 hover:bg-white/4 transition-colors text-left"
                        >
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TRACK_DOT[a.track] ?? "bg-gray-400"}`} />
                          <span className="flex-1 min-w-0 text-[11px] text-white/75 truncate">{a.title}</span>
                          <span className={`shrink-0 members-chip text-[9px] font-semibold border rounded ${ASSIGNMENT_STATUS_STYLES[a.status]}`}>
                            {a.status}
                          </span>
                          <span className={`shrink-0 text-[10px] text-white/25 transition-transform ${isRowExpanded ? "rotate-180" : ""}`}>
                            ▾
                          </span>
                        </button>
                        {/* Inline expand */}
                        {isRowExpanded && (
                          <div className="px-4 pb-3 pt-1 flex flex-col gap-2 bg-[#0F1014]">
                            <div className="flex flex-wrap gap-3 text-[11px] text-white/50">
                              <span className="text-white/70 font-medium">{a.track}</span>
                              <span>{a.credits} cr</span>
                              {deadline && <span>Due {deadline}</span>}
                              {a.capacity > 1 && (
                                <span>{activeClaims.length}/{a.capacity} claimed</span>
                              )}
                            </div>
                            {claimerNames.length > 0 && (
                              <p className="text-[11px] text-white/45">{claimerNames.join(", ")}</p>
                            )}
                            {a.description && (
                              <div
                                className="text-[11px] text-white/55 prose-invert line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: a.description }}
                              />
                            )}
                            <div className="flex gap-2 mt-1">
                              <Btn variant="secondary" size="sm" onClick={() => openEditAssignment(a)}>Edit</Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!isCardExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => toggleCardExpand(card.key)}
                      className="text-[11px] text-white/35 hover:text-white/65 px-4 py-2 text-left transition-colors"
                    >
                      + {hiddenCount} more
                    </button>
                  )}
                  {isCardExpanded && filteredAssignments.length > PREVIEW_LIMIT && (
                    <button
                      onClick={() => toggleCardExpand(card.key)}
                      className="text-[11px] text-white/35 hover:text-white/65 px-4 py-2 text-left transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
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
                <select
                  value=""
                  onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) applyTemplate(t); }}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  <option value="">— select template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.track} · {t.title}</option>
                  ))}
                </select>
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
              <select
                value={assignmentForm.projectRef}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, projectRef: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-[12px] text-white/85 focus:outline-none focus:border-[#85CC17]/50"
              >
                <option value="">— none —</option>
                {sortedBusinessOptions.length > 0 && (
                  <optgroup label="Businesses">
                    {sortedBusinessOptions.map((b) => (
                      <option key={b.id} value={`biz:${b.id}`}>{b.name}</option>
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
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Track">
                <select
                  value={assignmentForm.track}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, track: e.target.value as CycleTrack }))}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  {MEMBER_TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={assignmentForm.status}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, status: e.target.value as AssignmentStatus }))}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Credits">
                <Input
                  type="number"
                  min={0}
                  value={assignmentForm.credits}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, credits: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Capacity">
                <Input
                  type="number"
                  min={1}
                  value={assignmentForm.capacity}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Min Role">
                <select
                  value={assignmentForm.minRole}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
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
            <Field label="Deadline">
              <Input
                type="date"
                value={assignmentForm.deadline}
                onChange={(e) => setAssignmentForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </Field>
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
          <div className="flex items-center gap-2 justify-end mt-5 pt-4 border-t border-white/8">
            {assignmentModal === "edit" && (
              <Btn variant="danger" size="sm" onClick={handleDeleteAssignment}>Delete</Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={() => setAssignmentModal(null)}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSaveAssignment}>Save</Btn>
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
                <select
                  value={groupForm.status}
                  onChange={(e) => setGroupForm((p) => ({ ...p, status: e.target.value as ProjectGroup["status"] }))}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  {GROUP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Color">
                <select
                  value={groupForm.color}
                  onChange={(e) => setGroupForm((p) => ({ ...p, color: e.target.value as ProjectGroup["color"] }))}
                  className="w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
                >
                  {GROUP_COLORS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end mt-5 pt-4 border-t border-white/8">
            {groupModal === "edit" && (
              <Btn variant="danger" size="sm" onClick={handleDeleteGroup}>Delete</Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={() => setGroupModal(null)}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={handleSaveGroup}>Save</Btn>
          </div>
        </Modal>
      )}

      <Dialog />
    </MembersLayout>
  );
}
