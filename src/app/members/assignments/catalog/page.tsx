"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar, Spinner,
  ViewPanel, ViewSection,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeCycles,
  subscribeProjectGroups,
  createAssignment, updateAssignment, archiveAssignment, hardDeleteAssignment, deleteAssignmentClaim,
  type Assignment, type AssignmentClaim, type AssignmentStatus, type Business, type Cycle,
  type CycleRole, type CycleTrack, type ProjectGroup,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance", "General"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "In Progress", "Submitted", "Approved", "Finalized"];

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
  "In Progress": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Submitted: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Approved: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Finalized: "border-white/15 bg-white/5 text-white/55",
  Archived: "border-white/10 bg-white/5 text-white/35",
};

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const TRACK_BORDER: Record<CycleTrack, string> = {
  Tech: "border-l-blue-500/50",
  Marketing: "border-l-lime-500/50",
  Finance: "border-l-amber-500/50",
  General: "border-l-gray-400/50",
};

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2, General: 3 };

interface FormState {
  title: string;
  description: string;
  track: CycleTrack;
  credits: number;
  minRole: CycleRole;
  projectRef: string;
  limitClaims: boolean;
  maxClaims: string;
  deadline: string;
  status: AssignmentStatus;  // only used when editing
  priority: boolean;
  requiresApproval: boolean;
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
  deadline: "",
  status: "Open",
  priority: false,
  requiresApproval: true,
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

  const [search, setSearch] = useState("");
  const [filterTracks, setFilterTracks] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

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
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
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

  const resolveProjectLabel = (assignment: Assignment): { name: string; subtitle?: string } | null => {
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
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, filterTracks, filterStatuses, businessById, projectGroupById]);

  const activeAssignments = assignments.filter((a) => a.status !== "Archived");
  const counts = {
    open: activeAssignments.filter((a) => a.status === "Open").length,
    claimed: claims.filter((c) => c.status === "claimed" || c.status === "In Progress").length,
    awaitingApproval: claims.filter((c) => c.status === "Submitted").length,
    completed: claims.filter((c) => c.status === "Approved").length + activeAssignments.filter((a) => a.status === "Approved" || a.status === "Finalized").length,
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

  const openCreate = () => { setForm({ ...BLANK_FORM }); setEditing(null); setModal("create"); };

  const openEdit = (a: Assignment) => {
    const cap = a.capacity ?? 0;
    setForm({
      title:           a.title,
      description:     a.description ?? "",
      track:           a.track ?? (a.primaryTrack as CycleTrack) ?? "Tech",
      credits:         a.credits,
      minRole:         a.minRole,
      projectRef:      encodeProjectRef(a.businessId, a.projectGroupId),
      limitClaims:     cap > 0,
      maxClaims:       cap > 0 ? String(cap) : "1",
      deadline:        a.deadlines?.[0]?.date ?? a.deadline ?? "",
      status:          a.status,
      priority:        Boolean(a.priority),
      requiresApproval: a.requiresApproval !== false,
    });
    setEditing(a);
    setModal("edit");
  };

  const buildPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const { businessId, projectGroupId } = decodeProjectRef(form.projectRef);
    return {
      title,
      description:    form.description,
      track:          form.track,
      credits:        Math.max(0, Number(form.credits) || 0),
      difficulty:     editing?.difficulty ?? "Standard",
      estimatedHours: 0,
      minRole:        form.minRole,
      businessId,
      projectGroupId,
      capacity:        form.limitClaims ? Math.max(1, Number(form.maxClaims) || 1) : 0,
      deadlines:       form.deadline ? [{ label: "Final Deadline", date: form.deadline }] : undefined,
      status:          editing ? form.status : "Open",
      priority:        form.priority,
      requiresApproval: form.requiresApproval,
      cycleId:        editing?.cycleId ?? activeCycle?.id ?? "",
      createdBy:      userProfile?.email || user?.email || user?.id || "unknown",
      notes:          "",
    };
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) await updateAssignment(editing.id, payload);
    else await createAssignment(payload);
    if (opts?.addAnother && !editing) setForm((prev) => ({ ...prev, title: "" }));
    else setModal(null);
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
        <div className="flex-1 min-w-[180px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Search title, track, business…" />
        </div>
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
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 transition-colors">
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
                  <label key={s} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 transition-colors">
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

      {/* Card grid */}
      {sorted.length === 0 ? (
        <Empty
          message={search || filterTracks.size > 0 || filterStatuses.size > 0 ? "No assignments match your filters." : "No assignments in the catalog yet."}
          action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {sorted.map((a) => {
            const track = (a.track ?? a.primaryTrack ?? "Tech") as CycleTrack;
            const proj = resolveProjectLabel(a);
            const claimList = claimsByAssignment.get(a.id) ?? [];
            const activeClaims = claimList.filter((c) => c.status !== "rejected");
            const deadline = a.deadlines?.[0]?.date ?? a.deadline ?? "";
            const claimerNames = activeClaims.map((c) => c.memberName ?? "").filter(Boolean);

            const isUnlimited = a.capacity === 0;

            return (
              <motion.div
                key={a.id}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18 } } }}
                className={`flex flex-col rounded-xl border border-l-4 overflow-hidden
                  ${a.priority
                    ? "border-amber-400/40 border-l-amber-400 bg-amber-400/5"
                    : `border-white/8 bg-[#13161D] ${TRACK_BORDER[track]}`
                  }`}
              >
                <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TRACK_DOT[track]}`} />
                      <span className="text-[10px] text-white/45 uppercase tracking-wide">{track}</span>
                      {a.priority && (
                        <span className="members-chip border-amber-400/45 bg-amber-400/15 text-amber-300 text-[9px] font-bold uppercase tracking-wide">
                          ⚡ Priority
                        </span>
                      )}
                      <span className={`ml-auto members-chip text-[9px] font-semibold ${STATUS_STYLES[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-[14px] font-semibold text-white/90 leading-snug">{a.title}</p>
                    {proj && (
                      <p className="text-[11px] text-white/55 mt-0.5 truncate">
                        {proj.name}{proj.subtitle && <span> · {proj.subtitle}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 px-4 py-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55">
                  <span className="text-[#85CC17] font-bold">{a.credits} {a.credits === 1 ? "credit" : "credits"}</span>
                  <span>{a.minRole}</span>
                  {deadline && <span>Due {deadline}</span>}
                  {isUnlimited ? (
                    activeClaims.length > 0 ? <span>{activeClaims.length} claiming</span> : <span className="text-white/35">Unlimited spots</span>
                  ) : (
                    <span>{activeClaims.length}/{a.capacity} claimed</span>
                  )}
                </div>

                {claimerNames.length > 0 && (
                  <div className="px-4 pb-2 text-[11px] text-white/35 truncate">
                    {claimerNames.join(", ")}
                  </div>
                )}

                <div className="border-t border-white/5 px-4 py-2 flex justify-end">
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(a)}>Edit</Btn>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

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
            <Field label="Credits" required>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select
                value={form.projectRef}
                onChange={(e) => setForm((p) => ({ ...p, projectRef: e.target.value }))}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value="volta">Volta</option>
                {sortedBusinessOptions.length > 0 && (
                  <optgroup label="Businesses">
                    {sortedBusinessOptions.map((b) => (
                      <option key={b.id} value={`biz:${b.id}`}>
                        {[b.name, b.neighborhood].filter(Boolean).join(" · ")}
                      </option>
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
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={form.limitClaims}
                onChange={(e) => setForm((p) => ({ ...p, limitClaims: e.target.checked }))}
                className="accent-[#85CC17]"
              />
              Limit the number of claimants
            </label>
            {form.limitClaims && (
              <div className="flex items-center gap-2 pl-5">
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
            {!form.limitClaims && (
              <p className="text-xs text-white/40 pl-5">Anyone can claim — no cap on spots.</p>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input
              type="checkbox"
              checked={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.checked }))}
              className="accent-[#85CC17]"
            />
            <span>
              Priority assignment
              <span className="ml-1.5 text-white/35 text-xs font-normal">— highlighted in amber for members</span>
            </span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiresApproval}
              onChange={(e) => setForm((p) => ({ ...p, requiresApproval: e.target.checked }))}
              className="accent-[#85CC17]"
            />
            <span>
              Requires approval
              <span className="ml-1.5 text-white/35 text-xs font-normal">— uncheck for simple tasks (follow on social, etc.) to auto-award credits on submit</span>
            </span>
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

        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div className="flex gap-2">
            {editing && editing.status !== "Archived" && (
              <Btn variant="danger" onClick={() => void handleArchive()}>Archive</Btn>
            )}
            {editing && editing.status === "Archived" && (
              <Btn variant="danger" onClick={() => void handleHardDelete()}>Delete permanently</Btn>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            {!editing && (
              <Btn
                variant="secondary"
                onClick={() => void handleSave({ addAnother: true })}
                disabled={!form.title.trim()}
              >
                Save & New
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.title.trim()}>
              {editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
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
