"use client";

// Admin page A3 — Assignments Catalog. The workhorse for spinning up work
// during a cycle. Members claim entries from this catalog through the
// marketplace; admins author, edit, and close them here.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ADMIN_GROUP_TABS } from "@/components/members/SectionTabs";
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
// Default difficulty list — admins can type any string; this is just a starter.
const DEFAULT_DIFFICULTIES = ["Starter", "Standard", "Stretch"];

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

interface FormState {
  title: string;
  description: string;
  primaryTrack: CycleTrack;
  visibleTracks: CycleTrack[];
  credits: number;
  difficulty: string;
  estimatedHours: number;
  minRole: CycleRole;
  businessId: string;
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
  businessId: "",
  capacity: 1,
  deadline: "",
  status: "open",
};

export default function AssignmentsCatalogPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims] = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState<"" | CycleTrack>("");
  const [filterStatus, setFilterStatus] = useState<"" | AssignmentStatus>("");
  const [filterBusiness, setFilterBusiness] = useState("");

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

  // Claim count per assignment, used for capacity readouts.
  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (filterTrack && a.primaryTrack !== filterTrack) return false;
        if (filterStatus && a.status !== filterStatus) return false;
        if (filterBusiness && a.businessId !== filterBusiness) return false;
        if (!q) return true;
        const business = a.businessId ? businessById.get(a.businessId) : undefined;
        return [
          a.title,
          a.description?.replace(/<[^>]+>/g, " "),
          a.difficulty,
          business?.name ?? "",
          business?.neighborhood ?? "",
        ].some((v) => String(v ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [assignments, search, filterTrack, filterStatus, filterBusiness, businessById]);

  const businessOptions = useMemo(
    () => businesses
      .filter((b) => String(b.name ?? "").trim())
      .sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  // Difficulty suggestions derived from existing rows + defaults so admins
  // get a small autocomplete list without having to maintain a managed taxonomy.
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
      businessId: a.businessId ?? "",
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
      businessId: a.businessId ?? "",
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
      businessId: form.businessId || undefined,
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
    if (editing) {
      await updateAssignment(editing.id, payload);
    } else {
      await createAssignment(payload);
    }
    if (opts?.addAnother && !editing) {
      setForm((prev) => ({ ...prev, title: "", credits: prev.credits, businessId: prev.businessId }));
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
      `Delete “${editing.title}”? This permanently removes the catalog entry. Existing claims still keep credit history.`,
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
      <SectionTabs tabs={ADMIN_GROUP_TABS} />

      <PageHeader
        title="Assignments Catalog"
        subtitle={
          activeCycle
            ? `Active cycle: ${activeCycle.name}. New assignments scope to this cycle automatically.`
            : "No active cycle — create one first so assignments scope correctly."
        }
        action={
          <Btn variant="primary" onClick={openCreate} disabled={!activeCycle && !editing}>
            + New Assignment
          </Btn>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title, description, business…" />
        <Select
          options={TRACKS}
          value={filterTrack}
          onChange={(e) => setFilterTrack(e.target.value as typeof filterTrack)}
          emptyLabel="All tracks"
          className="min-w-[160px]"
        />
        <Select
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          emptyLabel="All statuses"
          className="min-w-[160px]"
        />
        <select
          value={filterBusiness}
          onChange={(e) => setFilterBusiness(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white/70 focus:outline-none min-w-[180px]"
        >
          <option value="">All businesses</option>
          {businessOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[24%]">Title</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Track</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Credits</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Difficulty</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Business</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Capacity</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Deadline</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Status</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[6%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const business = a.businessId ? businessById.get(a.businessId) : undefined;
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

        {filtered.length === 0 && (
          <div className="p-6">
            <Empty
              message="No assignments match these filters."
              action={<Btn variant="primary" onClick={openCreate} disabled={!activeCycle}>+ New Assignment</Btn>}
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
            <Field label="Capacity">
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
            <Field label="Linked business">
              <select
                value={form.businessId}
                onChange={(e) => setForm((p) => ({ ...p, businessId: e.target.value }))}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value="">— None —</option>
                {businessOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.neighborhood ? ` · ${b.neighborhood}` : ""}
                  </option>
                ))}
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

      <ClaimSummary claims={claims} assignments={assignments} />
    </MembersLayout>
  );
}

// ── Light claim summary at the bottom: tells admins how many claims are
// currently outstanding so they know if approvals are piling up.

function ClaimSummary({ claims, assignments }: { claims: AssignmentClaim[]; assignments: Assignment[] }) {
  const counts = claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});
  const totals = {
    open: assignments.filter((a) => a.status === "open").length,
    submitted: counts.submitted ?? 0,
    in_progress: counts.in_progress ?? 0,
    claimed: counts.claimed ?? 0,
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
      <div className="rounded-xl border border-white/8 bg-[#13161D] p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Catalog open</p>
        <p className="text-2xl font-bold text-[#85CC17] mt-1">{totals.open}</p>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#13161D] p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Claimed</p>
        <p className="text-2xl font-bold text-blue-300 mt-1">{totals.claimed}</p>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#13161D] p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40">In progress</p>
        <p className="text-2xl font-bold text-cyan-300 mt-1">{totals.in_progress}</p>
      </div>
      <div className="rounded-xl border border-white/8 bg-[#13161D] p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-white/40">Awaiting approval</p>
        <p className="text-2xl font-bold text-yellow-300 mt-1">{totals.submitted}</p>
      </div>
    </div>
  );
}
