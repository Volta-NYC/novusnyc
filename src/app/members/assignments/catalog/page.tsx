"use client";

// Assignments → Catalog. Full record of past, present, and
// future assignments. Awaiting-approval claims show up on the sibling For Review
// tab and disappear from there once approved.

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
  createAssignment, updateAssignment, deleteAssignment,
  type Assignment, type AssignmentClaim, type AssignmentStatus, type Business, type Cycle, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];
const STATUS_OPTIONS: AssignmentStatus[] = ["Open", "In Progress", "Submitted", "Approved", "Finalized"];

// "Volta Internal" is a sentinel businessId for assignments not tied to any
// outside business — common for finance work, internal templates, etc.
const VOLTA_INTERNAL_ID = "__volta_internal__";

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

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2, General: 3 };

// col 0=Title, 1=Track, 2=Business Name, 3=Claimer Names
const ASSIGNMENT_SORT_OPTIONS = [
  { value: 0, label: "Title" },
  { value: 1, label: "Track" },
  { value: 2, label: "Business Name" },
  { value: 3, label: "Claimer Names" },
];

const CATALOG_COLS = [
  { key: "title",      label: "Assignment",  width: 280 },
  { key: "track",      label: "Track",       width: 90  },
  { key: "credits",    label: "Credits",     width: 70  },
  { key: "business",   label: "Business",    width: 190 },
  { key: "slots",      label: "Slots",       width: 70  },
  { key: "deadline",   label: "Deadline",    width: 110 },
  { key: "status",     label: "Status",      width: 110 },
  { key: "actions",    label: "Actions",     width: 140 },
];

const DEFAULT_ASSIGNMENT_SORT_RULES: { col: number; dir: "asc" | "desc" }[] = [
  { col: 1, dir: "asc" },
  { col: 0, dir: "asc" },
  { col: 2, dir: "asc" },
  { col: 3, dir: "asc" },
];

interface FormState {
  title: string;
  description: string;
  primaryTrack: CycleTrack;
  credits: number;
  estimatedHours: number;
  minRole: CycleRole;
  businessId: string;       // "" or VOLTA_INTERNAL_ID or real business id
  businessLabel: string;
  capacity: number;
  deadline: string;
  status: AssignmentStatus;
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  primaryTrack: "Tech",
  credits: 1,
  estimatedHours: 1,
  minRole: "Analyst",
  businessId: VOLTA_INTERNAL_ID,
  businessLabel: "Volta Internal",
  capacity: 1,
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
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const [search, setSearch] = useState("");
  const [sortRules, setSortRules] = useState<{ col: number; dir: "asc" | "desc" }[]>(DEFAULT_ASSIGNMENT_SORT_RULES);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colsMenuOpen, setColsMenuOpen] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    const unsub1 = subscribeAssignmentClaims(setClaims);
    const unsub2 = subscribeBusinesses(setBusinesses);
    const unsub3 = subscribeCycles(setCycles);
    const unsub4 = subscribeAssignments((all) => {
      // Non-admin members only see Open assignments.
      setAssignments(authRole === "admin" ? all : all.filter((a) => a.status === "Open"));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [authRole]);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => {
      const business = resolveBusinessLabel(a);
      const claimerNames = (claimsByAssignment.get(a.id) ?? [])
        .map((c) => String(c.memberName ?? "").toLowerCase());
      return [
        a.title,
        a.primaryTrack,
        business?.name ?? "",
        business?.neighborhood ?? "",
        ...claimerNames,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, search, businessById, claimsByAssignment]);

  const compareAssignmentByCol = (a: Assignment, b: Assignment, col: number): number => {
    switch (col) {
      case 0: return (a.title || "").localeCompare(b.title || "");
      case 1: return (TRACK_RANK[a.primaryTrack] ?? 9) - (TRACK_RANK[b.primaryTrack] ?? 9);
      case 2: {
        const aB = resolveBusinessLabel(a)?.name ?? "";
        const bB = resolveBusinessLabel(b)?.name ?? "";
        return aB.localeCompare(bB);
      }
      case 3: {
        const aNames = (claimsByAssignment.get(a.id) ?? []).map((c) => c.memberName ?? "").sort().join(", ");
        const bNames = (claimsByAssignment.get(b.id) ?? []).map((c) => c.memberName ?? "").sort().join(", ");
        return aNames.localeCompare(bNames);
      }
      default: return 0;
    }
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        const cmp = compareAssignmentByCol(a, b, rule.col);
        if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortRules, businessById, claimsByAssignment]);

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

  // Summary counters at the top.
  const counts = {
    open: assignments.filter((a) => a.status === "Open").length,
    claimed: claims.filter((c) => c.status === "claimed" || c.status === "In Progress").length,
    awaitingApproval: claims.filter((c) => c.status === "Submitted").length,
    completed: claims.filter((c) => c.status === "Approved").length + assignments.filter((a) => a.status === "Approved" || a.status === "Finalized").length,
  };

  const businessOptions = useMemo(
    () => businesses
      .filter((b) => String(b.name ?? "").trim())
      .sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const businessChoiceLabel = (businessId: string): string => {
    if (!businessId || businessId === VOLTA_INTERNAL_ID) return "Volta Internal";
    const business = businessById.get(businessId);
    if (!business) return "";
    return [business.name, business.neighborhood].filter(Boolean).join(" · ");
  };

  const businessChoices = useMemo(
    () => [
      { id: VOLTA_INTERNAL_ID, label: "Volta Internal" },
      ...businessOptions.map((b) => ({
        id: b.id,
        label: [b.name, b.neighborhood].filter(Boolean).join(" · "),
      })),
    ],
    [businessOptions],
  );

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
      credits: a.credits,
      estimatedHours: a.estimatedHours ?? 0,
      minRole: a.minRole,
      businessId: a.businessId ?? VOLTA_INTERNAL_ID,
      businessLabel: businessChoiceLabel(a.businessId ?? VOLTA_INTERNAL_ID),
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
      credits: a.credits,
      estimatedHours: a.estimatedHours ?? 0,
      minRole: a.minRole,
      businessId: a.businessId ?? VOLTA_INTERNAL_ID,
      businessLabel: businessChoiceLabel(a.businessId ?? VOLTA_INTERNAL_ID),
      capacity: a.capacity ?? 1,
      deadline: a.deadline ?? "",
      status: "Open",
    });
    setEditing(null);
    setModal("create");
  };

  const buildPayload = (): Omit<Assignment, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    return {
      title,
      description: form.description,
      primaryTrack: form.primaryTrack,
      visibleTracks: MEMBER_TRACKS,
      credits: Math.max(0, Number(form.credits) || 0),
      difficulty: editing?.difficulty ?? "Standard",
      estimatedHours: Math.max(0, Number(form.estimatedHours) || 0),
      minRole: form.minRole,
      businessId: form.businessId || VOLTA_INTERNAL_ID,
      capacity: Math.max(1, Number(form.capacity) || 1),
      deadline: form.deadline || undefined,
      status: form.status,
      cycleId: editing?.cycleId ?? activeCycle?.id ?? "",
      createdBy: userProfile?.email || user?.email || user?.id || "unknown",
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
        subtitle="Catalog — full record of past, present, and future assignments. Submitted ones also appear under For Review until they're reviewed."
        action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
      />

      {/* Summary counters at the very top */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStat label="Open" value={counts.open} accent="text-[#85CC17]" />
        <SummaryStat label="Claimed / In Progress" value={counts.claimed} accent="text-blue-300" />
        <SummaryStat label="Awaiting approval" value={counts.awaitingApproval} accent="text-yellow-300" />
        <SummaryStat label="Completed" value={counts.completed} accent="text-violet-300" />
      </div>

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
              {CATALOG_COLS.filter((c) => c.key !== "actions").map((col) => (
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
        const visCols = CATALOG_COLS.filter((c) => !hiddenCols.has(c.key));
        const tableWidth = visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
            <table className="table-fixed text-left" style={{ width: tableWidth }}>
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
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
                {sorted.map((a) => {
                  const business = resolveBusinessLabel(a);
                  const claimList = claimsByAssignment.get(a.id) ?? [];
                  const activeClaims = claimList.filter((c) => c.status !== "rejected").length;
                  return (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.025]">
                      {visCols.map((col) => {
                        switch (col.key) {
                          case "title": return (
                            <td key="title" className="px-3 py-0 h-9 text-[11px] text-white/90 align-middle overflow-hidden">
                              <span className="font-medium block truncate" title={a.title}>{a.title}</span>
                            </td>
                          );
                          case "track": return (
                            <td key="track" className="px-3 py-0 h-9 text-[11px] text-white/70 align-middle">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${TRACK_DOT[a.primaryTrack]}`} />
                                {a.primaryTrack}
                              </span>
                            </td>
                          );
                          case "credits": return (
                            <td key="credits" className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{a.credits}</td>
                          );
                          case "business": return (
                            <td key="business" className="px-3 py-0 h-9 text-[11px] text-white/65 align-middle overflow-hidden">
                              {business?.name ? (
                                <span className="block truncate" title={[business.name, business.neighborhood].filter(Boolean).join(" · ")}>
                                  {business.name}{business.neighborhood && <span className="text-white/40"> · {business.neighborhood}</span>}
                                </span>
                              ) : <span className="text-white/30">—</span>}
                            </td>
                          );
                          case "slots": return (
                            <td key="slots" className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle">{activeClaims} / {a.capacity}</td>
                          );
                          case "deadline": return (
                            <td key="deadline" className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle overflow-hidden">
                              <span className="block truncate">{a.deadline || <span className="text-white/30">—</span>}</span>
                            </td>
                          );
                          case "status": return (
                            <td key="status" className="px-3 py-0 h-9 align-middle">
                              <span className={`members-chip ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                            </td>
                          );
                          case "actions": return (
                            <td key="actions" className="px-3 py-0 h-9 align-middle">
                              <div className="members-row-actions">
                                <Btn size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Btn>
                                <Btn size="sm" variant="ghost" onClick={() => duplicateAssignment(a)}>Dup</Btn>
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
            {sorted.length === 0 && (
              <div className="p-6">
                <Empty
                  message={search ? "No assignments match your search." : "No assignments in the catalog yet."}
                  action={<Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>}
                />
              </div>
            )}
          </div>
        );
      })()}

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
                options={MEMBER_TRACKS}
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
          </div>

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
            <Field label="Slots">
              <Input
                type="number"
                min="1"
                value={String(form.capacity)}
                onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))}
              />
            </Field>
            <Field label="Required Role">
              <Select
                options={ROLES}
                value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Business">
              <input
                list="assignment-business-options"
                value={form.businessLabel}
                onChange={(e) => {
                  const label = e.target.value;
                  const match = businessChoices.find((choice) => choice.label === label);
                  setForm((p) => ({ ...p, businessLabel: label, businessId: match?.id ?? "" }));
                }}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              />
              <datalist id="assignment-business-options">
                {businessChoices.map((choice) => (
                  <option key={choice.id} value={choice.label} />
                ))}
              </datalist>
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
