"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeCycles,
  subscribeProjectGroups,
  createAssignment, updateAssignment, deleteAssignment,
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
  return "";
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
  maxClaims: string;  // empty = unlimited (saved as 0)
  deadline: string;
  status: AssignmentStatus;  // only used when editing
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  track: "Tech",
  credits: 1,
  minRole: "Analyst",
  projectRef: "",
  maxClaims: "",
  deadline: "",
  status: "Open",
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTracks, setFilterTracks] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
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
    return null;
  };

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assignments]
      .filter((a) => {
        if (filterTracks.size > 0 && !filterTracks.has(a.track ?? a.primaryTrack ?? "Tech")) return false;
        if (filterStatuses.size > 0 && !filterStatuses.has(a.status)) return false;
        if (!q) return true;
        const proj = resolveProjectLabel(a);
        return [a.title, (a.track ?? a.primaryTrack ?? ""), proj?.name ?? "", proj?.subtitle ?? ""]
          .some((v) => v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const ta = TRACK_RANK[(a.track ?? a.primaryTrack ?? "Tech")] ?? 9;
        const tb = TRACK_RANK[(b.track ?? b.primaryTrack ?? "Tech")] ?? 9;
        if (ta !== tb) return ta - tb;
        return (a.title || "").localeCompare(b.title || "");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, filterTracks, filterStatuses, businessById, projectGroupById]);

  const counts = {
    open: assignments.filter((a) => a.status === "Open").length,
    claimed: claims.filter((c) => c.status === "claimed" || c.status === "In Progress").length,
    awaitingApproval: claims.filter((c) => c.status === "Submitted").length,
    completed: claims.filter((c) => c.status === "Approved").length + assignments.filter((a) => a.status === "Approved" || a.status === "Finalized").length,
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
      title:      a.title,
      description: a.description ?? "",
      track:      a.track ?? (a.primaryTrack as CycleTrack) ?? "Tech",
      credits:    a.credits,
      minRole:    a.minRole,
      projectRef: encodeProjectRef(a.businessId, a.projectGroupId),
      maxClaims:  cap > 0 ? String(cap) : "",
      deadline:   a.deadlines?.[0]?.date ?? a.deadline ?? "",
      status:     a.status,
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
      visibleTracks:  MEMBER_TRACKS,
      credits:        Math.max(0, Number(form.credits) || 0),
      difficulty:     editing?.difficulty ?? "Standard",
      estimatedHours: 0,
      minRole:        form.minRole,
      businessId,
      projectGroupId,
      capacity:       form.maxClaims.trim() ? Math.max(0, Number(form.maxClaims)) : 0,
      deadlines:      form.deadline ? [{ label: "Final Deadline", date: form.deadline }] : undefined,
      status:         editing ? form.status : "Open",
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

  const handleDelete = async () => {
    if (!editing) return;
    await ask(async () => { await deleteAssignment(editing.id); setModal(null); },
      `Delete "${editing.title}"? Existing claims keep their credit history.`);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStat label="Open" value={counts.open} accent="text-[#85CC17]" />
        <SummaryStat label="Claimed / In Progress" value={counts.claimed} accent="text-blue-300" />
        <SummaryStat label="Awaiting approval" value={counts.awaitingApproval} accent="text-yellow-300" />
        <SummaryStat label="Completed" value={counts.completed} accent="text-violet-300" />
      </div>

      {/* Toolbar */}
      {(() => {
        const hasActiveFilters = filterTracks.size > 0 || filterStatuses.size > 0;
        return (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex-1 min-w-[180px]">
                <SearchBar value={search} onChange={setSearch} placeholder="Search title, track, business…" />
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
                Filter{hasActiveFilters ? ` (${filterTracks.size + filterStatuses.size})` : ""}
              </button>
            </div>

            {filterOpen && (
              <div className="rounded-xl border border-white/10 bg-[#13161D] p-4 mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2">Track</p>
                    <div className="space-y-1.5">
                      {MEMBER_TRACKS.map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filterTracks.has(t)}
                            onChange={() => setFilterTracks((prev) => {
                              const next = new Set(prev);
                              if (next.has(t)) next.delete(t); else next.add(t);
                              return next;
                            })}
                            className="accent-[#85CC17]"
                          />
                          <span className={`inline-block h-2 w-2 rounded-full ${TRACK_DOT[t]}`} />
                          <span className="text-xs text-white/65 group-hover:text-white/90 transition-colors">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2">Status</p>
                    <div className="space-y-1.5">
                      {STATUS_OPTIONS.map((s) => (
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
                </div>
                {hasActiveFilters && (
                  <div className="mt-3 pt-3 border-t border-white/8 flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setFilterTracks(new Set()); setFilterStatuses(new Set()); }}
                      className="text-[11px] text-white/45 hover:text-white/75 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Card grid */}
      {sorted.length === 0 ? (
        <Empty
          message={search || filterTracks.size > 0 || filterStatuses.size > 0 ? "No assignments match your filters." : "No assignments in the catalog yet."}
          action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((a) => {
            const track = (a.track ?? a.primaryTrack ?? "Tech") as CycleTrack;
            const proj = resolveProjectLabel(a);
            const claimList = claimsByAssignment.get(a.id) ?? [];
            const activeClaims = claimList.filter((c) => c.status !== "rejected");
            const deadline = a.deadlines?.[0]?.date ?? a.deadline ?? "";
            const claimerNames = activeClaims.map((c) => c.memberName ?? "").filter(Boolean);

            return (
              <div
                key={a.id}
                className={`flex flex-col rounded-xl border border-white/8 bg-[#13161D] border-l-4 ${TRACK_BORDER[track]} overflow-hidden`}
              >
                <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${TRACK_DOT[track]}`} />
                      <span className="text-[10px] text-white/40 uppercase tracking-wide">{track}</span>
                      <span className={`ml-auto members-chip text-[9px] font-semibold ${STATUS_STYLES[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-white/90 leading-snug">{a.title}</p>
                    {proj && (
                      <p className="text-[11px] text-white/40 mt-0.5 truncate">
                        {proj.name}{proj.subtitle && <span> · {proj.subtitle}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 px-4 py-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/50">
                  <span className="text-[#85CC17] font-semibold">{a.credits} credits</span>
                  <span>{a.minRole}</span>
                  {deadline && <span>Due {deadline}</span>}
                  {a.capacity > 0 && (
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
              </div>
            );
          })}
        </div>
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
                <option value="">— None —</option>
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

          <div>
            <label className="block text-[11px] font-medium text-white/50 mb-1">
              Max Claims <span className="text-white/30 font-normal">(leave blank for no limit — for open assignments like social follows)</span>
            </label>
            <Input
              type="number"
              min="0"
              placeholder="No limit"
              value={form.maxClaims}
              onChange={(e) => setForm((p) => ({ ...p, maxClaims: e.target.value }))}
            />
          </div>

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
          <div>
            {editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}
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
