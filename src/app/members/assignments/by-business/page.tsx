"use client";

// Assignments → By Business.
// Groups active assignments under their business. By default only shows
// businesses whose overall status is Ongoing. A "Show all" toggle reveals
// Upcoming and Completed businesses. Unassigned assignments (no business_id)
// are listed at the bottom in an "Unassigned" bucket.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, SearchBar, Empty, useConfirm,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeCycles,
  subscribeAssignmentTemplates,
  createAssignment, updateAssignment, deleteAssignment,
  type Assignment, type AssignmentClaim, type AssignmentStatus,
  type Business, type Cycle, type CycleRole, type CycleTrack,
  type AssignmentTemplate,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

type ProjectStatusValue = "Ongoing" | "Upcoming" | "Completed";

function normalizeBusinessStatus(raw: unknown): ProjectStatusValue {
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

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "In Progress", "Submitted", "Approved", "Finalized"];

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  Open: "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]",
  "In Progress": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Submitted: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Approved: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Finalized: "border-white/15 bg-white/5 text-white/55",
};

const BIZ_STATUS_STYLES: Record<ProjectStatusValue, string> = {
  Ongoing: "text-green-400",
  Upcoming: "text-blue-400",
  Completed: "text-white/40",
};

interface FormState {
  title: string;
  description: string;
  track: CycleTrack;
  type: string;
  businessId: string;
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

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  track: "Tech",
  type: "",
  businessId: "",
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

export default function ByBusinessPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [prefillBizId, setPrefillBizId] = useState<string>("");

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    const unsub1 = subscribeAssignments(setAssignments);
    const unsub2 = subscribeAssignmentClaims(setClaims);
    const unsub3 = subscribeBusinesses(setBusinesses);
    const unsub4 = subscribeCycles(setCycles);
    const unsub5 = subscribeAssignmentTemplates(setTemplates);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
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

  const assignmentsByBiz = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = a.businessId ?? "__unassigned__";
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const q = search.trim().toLowerCase();

  // Businesses that have at least one assignment, filtered by showInactive + search.
  const activeBizIds = useMemo(
    () => new Set([...assignmentsByBiz.keys()].filter((k) => k !== "__unassigned__")),
    [assignmentsByBiz],
  );

  const visibleBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        if (!activeBizIds.has(b.id)) return false;
        const status = normalizeBusinessStatus(b.projectStatus);
        if (!showInactive && status !== "Ongoing") return false;
        if (q) {
          const matches = b.name.toLowerCase().includes(q) || b.neighborhood?.toLowerCase().includes(q);
          const assignmentMatch = (assignmentsByBiz.get(b.id) ?? []).some(
            (a) => a.title.toLowerCase().includes(q) || a.track.toLowerCase().includes(q),
          );
          if (!matches && !assignmentMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Ongoing first, then Upcoming, then Completed; then by name.
        const order: Record<ProjectStatusValue, number> = { Ongoing: 0, Upcoming: 1, Completed: 2 };
        const da = order[normalizeBusinessStatus(a.projectStatus)] ?? 9;
        const db = order[normalizeBusinessStatus(b.projectStatus)] ?? 9;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name);
      });
  }, [businesses, activeBizIds, showInactive, q, assignmentsByBiz]);

  const unassigned = useMemo(() => {
    const list = assignmentsByBiz.get("__unassigned__") ?? [];
    if (!q) return list;
    return list.filter((a) => a.title.toLowerCase().includes(q) || a.track.toLowerCase().includes(q));
  }, [assignmentsByBiz, q]);

  const inactiveCount = useMemo(
    () => businesses.filter((b) => activeBizIds.has(b.id) && normalizeBusinessStatus(b.projectStatus) !== "Ongoing").length,
    [businesses, activeBizIds],
  );

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const businessOptions = useMemo(
    () => [...businesses].sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const openCreate = (bizId?: string) => {
    const defaultBiz = bizId ?? prefillBizId ?? "";
    setForm({ ...BLANK_FORM, businessId: defaultBiz });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (a: Assignment) => {
    setForm({
      title: a.title,
      description: a.description ?? "",
      track: a.track ?? "Tech",
      type: a.type ?? "",
      businessId: a.businessId ?? "",
      credits: a.credits ?? 1,
      estimatedHours: a.estimatedHours ?? 0,
      minRole: a.minRole ?? "Analyst",
      capacity: a.capacity ?? 1,
      deadline: (a.deadlines?.[0]?.date) ?? a.deadline ?? "",
      status: a.status,
      notes: a.notes ?? "",
      region: a.region ?? "",
      teamLabel: a.teamLabel ?? "",
    });
    setEditing(a);
    setModal("edit");
  };

  const applyTemplate = (t: AssignmentTemplate) => {
    setForm((prev) => ({
      ...prev,
      title: t.title,
      description: t.description ?? "",
      track: t.track,
      type: t.type ?? "",
      credits: t.credits,
      estimatedHours: t.estimatedHours,
      minRole: t.minRole,
      capacity: t.capacity,
      notes: t.notes ?? "",
    }));
  };

  const buildPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    return {
      title,
      description: form.description,
      track: form.track,
      type: form.type || undefined,
      businessId: form.businessId || undefined,
      status: form.status,
      credits: Math.max(0, Number(form.credits) || 0),
      estimatedHours: Math.max(0, Number(form.estimatedHours) || 0),
      minRole: form.minRole,
      capacity: Math.max(1, Number(form.capacity) || 1),
      deadlines: form.deadline ? [{ label: "Final Deadline", date: form.deadline }] : undefined,
      notes: form.notes,
      region: form.region || undefined,
      teamLabel: form.teamLabel || undefined,
      cycleId: editing?.cycleId ?? activeCycle?.id ?? "",
      createdBy: userProfile?.email || user?.email || user?.id || "unknown",
      difficulty: editing?.difficulty ?? "Standard",
      visibleTracks: MEMBER_TRACKS,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) await updateAssignment(editing.id, payload);
    else await createAssignment(payload);
    setModal(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(async () => {
      await deleteAssignment(editing.id);
      setModal(null);
    }, `Delete "${editing.title}"? Existing claims keep their credit history.`);
  };

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  const renderAssignmentCard = (a: Assignment) => {
    const claimList = claimsByAssignment.get(a.id) ?? [];
    const activeClaims = claimList.filter((c) => c.status !== "rejected");
    const claimerNames = activeClaims.map((c) => c.memberName ?? "").filter(Boolean);
    const spotsLeft = a.capacity - activeClaims.length;
    const deadline = a.deadlines?.[0]?.date ?? "";
    const isOpen = a.status === "Open";
    return (
      <div key={a.id} className="group relative rounded-xl border border-white/8 bg-[#0F1014] p-4 flex flex-col gap-3 hover:border-white/15 transition-colors">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${TRACK_DOT[a.track]}`} />
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{a.track}{a.type ? ` · ${a.type}` : ""}</span>
          </div>
          <span className={`members-chip flex-shrink-0 ${STATUS_STYLES[a.status]}`}>{a.status}</span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-white/90 leading-snug">{a.title}</p>

        {/* Description (truncated) */}
        {a.description && (
          <p className="text-[11px] text-white/45 line-clamp-2 leading-relaxed">{a.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-white/45">
          <span>{a.credits} cr · {a.estimatedHours}h est.</span>
          <span>Min: {a.minRole}</span>
          {deadline && (
            <span className={isOpen ? "text-[#85CC17]/70" : ""}>Due {deadline}</span>
          )}
          <span className={spotsLeft > 0 ? "text-white/45" : "text-red-400/70"}>
            {activeClaims.length}/{a.capacity} slots filled
          </span>
        </div>

        {/* Assignees */}
        {claimerNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {claimerNames.map((name) => (
              <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-[10px] text-white/60">{name}</span>
            ))}
          </div>
        )}

        {/* Edit button */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Btn size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Btn>
        </div>
      </div>
    );
  };

  const renderBusinessBucket = (b: Business) => {
    const bizAssignments = assignmentsByBiz.get(b.id) ?? [];
    const isOpen = expanded.has(b.id);
    const status = normalizeBusinessStatus(b.projectStatus);
    const openCount = bizAssignments.filter((a) => a.status === "Open").length;
    const trackSet = [...new Set(bizAssignments.map((a) => a.track))];
    return (
      <div key={b.id} className={`rounded-2xl border mb-4 overflow-hidden ${status === "Ongoing" ? "border-white/12 bg-[#111418]" : "border-white/7 bg-[#0E1014] opacity-80"}`}>
        {/* Business header */}
        <button
          type="button"
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.025] transition-colors"
          onClick={() => toggleExpanded(b.id)}
        >
          <span className={`text-xs font-bold transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`}>▶</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-white/90">{b.name}</span>
              {b.neighborhood && <span className="text-xs text-white/40">{b.neighborhood}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${BIZ_STATUS_STYLES[status]}`}>{status}</span>
              {trackSet.map((t) => (
                <span key={t} className={`inline-block h-1.5 w-1.5 rounded-full ${TRACK_DOT[t]}`} title={t} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {openCount > 0 && (
              <span className="text-[10px] text-[#9BE22B] bg-[#85CC17]/10 border border-[#85CC17]/25 rounded-full px-2.5 py-1 font-semibold">
                {openCount} open
              </span>
            )}
            <span className="text-xs text-white/35">{bizAssignments.length} total</span>
            <Btn
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setPrefillBizId(b.id); openCreate(b.id); }}
            >
              + Add
            </Btn>
          </div>
        </button>

        {/* Assignment cards grid */}
        {isOpen && (
          <div className="border-t border-white/8 p-4">
            {bizAssignments.length === 0 ? (
              <p className="text-[11px] text-white/35 text-center py-4">No assignments for this business yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bizAssignments.map(renderAssignmentCard)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ASSIGNMENTS_TABS} />

      <PageHeader
        title="Assignments"
        subtitle="By Business — assignments grouped by client. Ongoing businesses shown by default."
        action={<Btn variant="primary" onClick={() => openCreate()}>+ New Assignment</Btn>}
      />

      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search business, assignment title, or track…" />
        </div>
        <button
          type="button"
          onClick={() => setShowInactive((v) => !v)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showInactive
              ? "border-white/20 bg-white/8 text-white/75 hover:bg-white/12"
              : "border-white/12 bg-transparent text-white/45 hover:text-white/70 hover:border-white/18"
          }`}
        >
          {showInactive ? "Hide completed & upcoming" : `Show all (${inactiveCount} inactive)`}
        </button>
      </div>

      {visibleBusinesses.length === 0 && unassigned.length === 0 ? (
        <Empty
          message={q ? "No matches found." : showInactive ? "No businesses with assignments yet." : "No ongoing businesses with assignments. Click \"Show all\" to see inactive ones."}
          action={<Btn variant="primary" onClick={() => openCreate()}>+ New Assignment</Btn>}
        />
      ) : (
        <>
          {visibleBusinesses.map(renderBusinessBucket)}

          {unassigned.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 mb-4 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02]"
                onClick={() => toggleExpanded("__unassigned__")}
              >
                <span className={`text-xs font-bold transition-transform ${expanded.has("__unassigned__") ? "rotate-90" : ""}`}>▶</span>
                <span className="text-base font-bold text-amber-300/80 flex-1">Unassigned</span>
                <span className="text-xs text-white/35">{unassigned.length} — no business set</span>
              </button>
              {expanded.has("__unassigned__") && (
                <div className="border-t border-amber-400/15 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unassigned.map(renderAssignmentCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Assignment" : "New Assignment"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Template picker (create mode only) */}
          {!editing && templates.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Load from template</p>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-2.5 py-1 rounded-md border border-white/12 bg-white/5 text-[11px] text-white/65 hover:border-[#85CC17]/45 hover:text-white/90 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Business" required>
            <select
              value={form.businessId}
              onChange={(e) => setForm((p) => ({ ...p, businessId: e.target.value }))}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="">— Select a business —</option>
              {businessOptions.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.neighborhood ? ` · ${b.neighborhood}` : ""}</option>
              ))}
            </select>
          </Field>

          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="What is this assignment?" />
          </Field>

          <Field label="Description">
            <RichTextEditor
              content={form.description}
              onChange={(html) => setForm((p) => ({ ...p, description: html }))}
              minHeight={140}
              placeholder="What does 'done' look like? Links, context, scope."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Track" required>
              <Select
                options={MEMBER_TRACKS}
                value={form.track}
                onChange={(e) => setForm((p) => ({ ...p, track: e.target.value as CycleTrack }))}
              />
            </Field>
            <Field label="Type (Finance only)">
              <Select
                options={["", "Report", "Case Study"]}
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Credits" required>
              <Input type="number" min="0" value={String(form.credits)}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label="Slots">
              <Input type="number" min="1" value={String(form.capacity)}
                onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))} />
            </Field>
            <Field label="Min Role">
              <Select options={ROLES} value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <Input type="date" value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
            </Field>
            <Field label="Status" required>
              <Select options={STATUS_OPTIONS} value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AssignmentStatus }))} />
            </Field>
          </div>

          {form.track === "Finance" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Region">
                <Input value={form.region}
                  onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} />
              </Field>
              <Field label="Team Label">
                <Input value={form.teamLabel}
                  onChange={(e) => setForm((p) => ({ ...p, teamLabel: e.target.value }))} />
              </Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div>{editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.title.trim()}>
              {editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
