"use client";

// Project Management → Assignment Catalog. Full record of past, present, and
// future assignments. Awaiting-approval claims show up on the sibling Approvals
// tab and disappear from there once approved.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_MGMT_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses, subscribeCycles,
  createAssignment, updateAssignment, deleteAssignment,
  type Assignment, type AssignmentClaim, type AssignmentStatus, type Business, type Cycle, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["open", "claimed", "in_progress", "submitted", "approved", "closed"];
const DEFAULT_DIFFICULTIES = ["Starter", "Standard", "Stretch"];

// "Volta Internal" is a sentinel businessId for assignments not tied to any
// outside business — common for finance work, internal templates, etc.
const VOLTA_INTERNAL_ID = "__volta_internal__";

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  open: "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]",
  claimed: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  in_progress: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  submitted: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  approved: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  closed: "border-white/15 bg-white/5 text-white/55",
};

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
};

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2 };

// Status sort: active/upcoming first, then completed/closed. Lower number sorts higher.
const STATUS_RANK: Record<AssignmentStatus, number> = {
  open: 0,
  claimed: 1,
  in_progress: 2,
  submitted: 3,
  approved: 4,
  closed: 5,
};

interface FormState {
  title: string;
  description: string;
  primaryTrack: CycleTrack;
  visibleTracks: CycleTrack[];
  credits: number;
  difficulty: string;
  estimatedHours: number;
  minRole: CycleRole;
  businessId: string;       // "" or VOLTA_INTERNAL_ID or real business id
  capacity: number;
  deadline: string;
  status: AssignmentStatus;
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  primaryTrack: "Tech",
  visibleTracks: ["Tech"],
  credits: 1,
  difficulty: "Standard",
  estimatedHours: 1,
  minRole: "Analyst",
  businessId: VOLTA_INTERNAL_ID,
  capacity: 1,
  deadline: "",
  status: "open",
};

export default function CatalogPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeCycles(setCycles), []);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  // Resolve the displayed business name for an assignment, including the
  // "Volta Internal" sentinel.
  const resolveBusinessLabel = (assignment: Assignment): { name: string; neighborhood?: string } | null => {
    if (!assignment.businessId) return null;
    if (assignment.businessId === VOLTA_INTERNAL_ID) return { name: "Volta Internal" };
    const business = businessById.get(assignment.businessId);
    if (!business) return null;
    return { name: business.name, neighborhood: business.neighborhood };
  };

  // Search across title, description (stripped HTML), business name, and any
  // claimer's member name.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => {
      const business = resolveBusinessLabel(a);
      const claimerNames = (claimsByAssignment.get(a.id) ?? [])
        .map((c) => String(c.memberName ?? "").toLowerCase());
      return [
        a.title,
        a.description?.replace(/<[^>]+>/g, " "),
        a.difficulty,
        business?.name ?? "",
        business?.neighborhood ?? "",
        ...claimerNames,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, businessById, claimsByAssignment]);

  // Sort: status first (active/upcoming → completed/closed), then track
  // (Tech → Marketing → Finance), then credits (low→high), then title alphabetical.
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const sCmp = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      if (sCmp !== 0) return sCmp;
      const tCmp = (TRACK_RANK[a.primaryTrack] ?? 9) - (TRACK_RANK[b.primaryTrack] ?? 9);
      if (tCmp !== 0) return tCmp;
      const cCmp = a.credits - b.credits;
      if (cCmp !== 0) return cCmp;
      return a.title.localeCompare(b.title);
    });
  }, [filtered]);

  // Summary counters at the top.
  const counts = {
    open: assignments.filter((a) => a.status === "open").length,
    claimed: claims.filter((c) => c.status === "claimed" || c.status === "in_progress").length,
    awaitingApproval: claims.filter((c) => c.status === "submitted").length,
    completed: claims.filter((c) => c.status === "approved").length + assignments.filter((a) => a.status === "approved" || a.status === "closed").length,
  };

  const businessOptions = useMemo(
    () => businesses
      .filter((b) => String(b.name ?? "").trim())
      .sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const difficultyOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_DIFFICULTIES);
    for (const a of assignments) if (a.difficulty) set.add(a.difficulty);
    return Array.from(set).sort();
  }, [assignments]);

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (a: Assignment) => {
    setForm({
      title: a.title,
      description: a.description ?? "",
      primaryTrack: a.primaryTrack,
      visibleTracks: a.visibleTracks?.length ? a.visibleTracks : [a.primaryTrack],
      credits: a.credits,
      difficulty: a.difficulty ?? "Standard",
      estimatedHours: a.estimatedHours ?? 0,
      minRole: a.minRole,
      businessId: a.businessId ?? VOLTA_INTERNAL_ID,
      capacity: a.capacity ?? 1,
      deadline: a.deadline ?? "",
      status: a.status,
    });
    setEditing(a);
    setModal("edit");
  };

  const duplicateAssignment = (a: Assignment) => {
    setForm({
      title: `${a.title} (copy)`,
      description: a.description ?? "",
      primaryTrack: a.primaryTrack,
      visibleTracks: a.visibleTracks?.length ? a.visibleTracks : [a.primaryTrack],
      credits: a.credits,
      difficulty: a.difficulty ?? "Standard",
      estimatedHours: a.estimatedHours ?? 0,
      minRole: a.minRole,
      businessId: a.businessId ?? VOLTA_INTERNAL_ID,
      capacity: a.capacity ?? 1,
      deadline: a.deadline ?? "",
      status: "open",
    });
    setEditing(null);
    setModal("create");
  };

  const buildPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const visibleTracks = form.visibleTracks.length > 0 ? form.visibleTracks : [form.primaryTrack];
    return {
      title,
      description: form.description,
      primaryTrack: form.primaryTrack,
      visibleTracks: Array.from(new Set([form.primaryTrack, ...visibleTracks])),
      credits: Math.max(0, Number(form.credits) || 0),
      difficulty: form.difficulty.trim() || "Standard",
      estimatedHours: Math.max(0, Number(form.estimatedHours) || 0),
      minRole: form.minRole,
      businessId: form.businessId || VOLTA_INTERNAL_ID,
      capacity: Math.max(1, Number(form.capacity) || 1),
      deadline: form.deadline || undefined,
      status: form.status,
      cycleId: editing?.cycleId ?? activeCycle?.id ?? "",
      createdBy: userProfile?.email || user?.email || user?.uid || "unknown",
    };
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) await updateAssignment(editing.id, payload);
    else await createAssignment(payload);
    if (opts?.addAnother && !editing) {
      setForm((prev) => ({ ...prev, title: "" }));
    } else {
      setModal(null);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(
      async () => {
        await deleteAssignment(editing.id);
        setModal(null);
      },
      `Delete “${editing.title}”? This permanently removes the catalog entry. Existing claims keep their credit history.`,
    );
  };

  const toggleVisibleTrack = (track: CycleTrack) => {
    setForm((prev) => {
      const has = prev.visibleTracks.includes(track);
      const next = has ? prev.visibleTracks.filter((t) => t !== track) : [...prev.visibleTracks, track];
      return { ...prev, visibleTracks: next };
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
      <SectionTabs tabs={PROJECT_MGMT_TABS} />

      <PageHeader
        title="Project Management"
        subtitle="Assignment catalog — full record of past, present, and future assignments. Submitted ones also appear under Approvals until they're reviewed."
        action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
      />

      {/* Summary counters at the very top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStat label="Open" value={counts.open} accent="text-[#85CC17]" />
        <SummaryStat label="Claimed / In Progress" value={counts.claimed} accent="text-blue-300" />
        <SummaryStat label="Awaiting approval" value={counts.awaitingApproval} accent="text-yellow-300" />
        <SummaryStat label="Completed" value={counts.completed} accent="text-violet-300" />
      </div>

      {/* Search only — no track/status/business filters per spec; sorting is fixed. */}
      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search title, description, business, member who claimed…"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[26%]">Assignment</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Track</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Credits</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Difficulty</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Business</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]" title="How many members can claim this assignment simultaneously">Slots</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Deadline</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Status</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[6%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const business = resolveBusinessLabel(a);
              const claimList = claimsByAssignment.get(a.id) ?? [];
              const activeClaims = claimList.filter((c) => c.status !== "rejected").length;
              return (
                <tr key={a.id} className="border-b border-white/8 align-top hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5 text-sm text-white/90 break-words">
                    <div className="font-medium">{a.title}</div>
                    {a.description && (
                      <div className="text-[11px] text-white/45 line-clamp-2 mt-0.5">
                        {a.description.replace(/<[^>]+>/g, " ").trim()}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/75">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${TRACK_DOT[a.primaryTrack]}`} />
                      {a.primaryTrack}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-[#85CC17] font-mono">{a.credits}</td>
                  <td className="px-3 py-2.5 text-xs text-white/70">{a.difficulty || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-white/70 break-words">
                    {business?.name ? (
                      <span title={business.neighborhood ?? ""}>
                        {business.name}
                        {business.neighborhood && (
                          <span className="block text-white/40 text-[11px]">{business.neighborhood}</span>
                        )}
                      </span>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-white/70">{activeClaims} / {a.capacity}</td>
                  <td className="px-3 py-2.5 text-xs text-white/70">{a.deadline || <span className="text-white/30">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      <Btn size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => duplicateAssignment(a)}>Duplicate</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-6">
            <Empty
              message={search ? "No assignments match your search." : "No assignments in the catalog yet."}
              action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
            />
          </div>
        )}
      </div>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Primary track" required>
              <Select
                options={TRACKS}
                value={form.primaryTrack}
                onChange={(e) => setForm((p) => ({ ...p, primaryTrack: e.target.value as CycleTrack }))}
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
            <Field label="Difficulty">
              <input
                list="assignment-difficulty-options"
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              />
              <datalist id="assignment-difficulty-options">
                {difficultyOptions.map((d) => <option key={d} value={d} />)}
              </datalist>
            </Field>
          </div>

          <Field label="Visible to tracks">
            <div className="flex flex-wrap gap-2">
              {TRACKS.map((track) => {
                const on = form.visibleTracks.includes(track);
                const isPrimary = form.primaryTrack === track;
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => !isPrimary && toggleVisibleTrack(track)}
                    disabled={isPrimary}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      on
                        ? "border-[#85CC17]/45 bg-[#85CC17]/10 text-[#9BE22B]"
                        : "border-white/15 bg-[#11141A] text-white/65 hover:border-white/35"
                    } ${isPrimary ? "opacity-100 cursor-default" : ""}`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${TRACK_DOT[track]}`} />
                    {track}
                    {isPrimary && <span className="text-[10px] text-white/55">primary</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">Primary track is always included. Add other tracks to surface this assignment in their marketplace too.</p>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Estimated hours">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={String(form.estimatedHours)}
                onChange={(e) => setForm((p) => ({ ...p, estimatedHours: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Slots (how many members can claim this)">
              <Input
                type="number"
                min="1"
                value={String(form.capacity)}
                onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))}
              />
            </Field>
            <Field label="Min role to claim">
              <Select
                options={ROLES}
                value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Business / context">
              <select
                value={form.businessId}
                onChange={(e) => setForm((p) => ({ ...p, businessId: e.target.value }))}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value={VOLTA_INTERNAL_ID}>Volta Internal</option>
                {businessOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.neighborhood ? ` · ${b.neighborhood}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/40 mt-1.5">Use Volta Internal for finance work, internal templates, sponsor outreach, etc.</p>
            </Field>
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Status" required>
            <Select
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AssignmentStatus }))}
            />
          </Field>
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
