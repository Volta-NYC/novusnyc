"use client";

// Assignments → Templates.
// Admin-managed blueprint library. Templates are reusable shells with no
// business_id and no status. Use "Create Assignment from Template" to
// pre-fill the By Business create form.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ASSIGNMENTS_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar, Spinner,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignmentTemplates, subscribeBusinesses, subscribeCycles, createAssignment,
  createAssignmentTemplate, updateAssignmentTemplate, deleteAssignmentTemplate,
  type AssignmentTemplate, type Business, type Cycle, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const MEMBER_TRACKS: CycleTrack[] = ["General", "Tech", "Marketing", "Finance"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const TRACK_PILL: Record<CycleTrack, string> = {
  Tech:      "border-blue-400/30 bg-blue-400/10 text-blue-300",
  Marketing: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  Finance:   "border-amber-400/30 bg-amber-400/10 text-amber-300",
  General:   "border-white/20 bg-white/8 text-white/55",
};

const TRACK_RANK: Record<CycleTrack, number> = { General: 0, Tech: 1, Marketing: 2, Finance: 3 };

interface FormState {
  title: string;
  description: string;
  track: CycleTrack;
  credits: number;
  minRole: CycleRole;
  limitClaims: boolean;
  maxClaims: string;
  requiresApproval: boolean;
  applicationRequired: boolean;
  allowMultipleCompletions: boolean;
  recurringEnabled: boolean;
  deadlineOffsetDays: string;
  checkinIntervalDays: string;
  maxDurationDays: string;
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  track: "Tech",
  credits: 1,
  minRole: "Analyst",
  limitClaims: true,
  maxClaims: "1",
  requiresApproval: true,
  applicationRequired: false,
  allowMultipleCompletions: false,
  recurringEnabled: false,
  deadlineOffsetDays: "",
  checkinIntervalDays: "7",
  maxDurationDays: "",
};

interface FromTemplateForm {
  projectRef: string;
  title: string;
  description: string;
  priority: boolean;
  requiresApproval: boolean;
  applicationRequired: boolean;
  allowMultipleCompletions: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40 mb-2">
      {children}
    </p>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer select-none">
      <div className="min-w-0">
        <p className="text-sm text-white/85 font-medium">{label}</p>
        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{description}</p>
      </div>
      <input
        type="checkbox"
        className="members-checkbox flex-shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function TemplatesPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AssignmentTemplate | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  const [fromTemplate, setFromTemplate] = useState<AssignmentTemplate | null>(null);
  const [fromTemplateForm, setFromTemplateForm] = useState<FromTemplateForm>({
    projectRef: "volta", title: "", description: "", priority: false,
    requiresApproval: true, applicationRequired: false, allowMultipleCompletions: false,
  });
  const [fromTemplateCreating, setFromTemplateCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fromTemplateError, setFromTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => { return subscribeAssignmentTemplates(setTemplates); }, []);
  useEffect(() => { return subscribeBusinesses(setBusinesses); }, []);
  useEffect(() => { return subscribeCycles(setCycles); }, []);

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const businessOptions = useMemo(
    () => [...businesses].filter((b) => b.name?.trim()).sort((a, b) => a.name.localeCompare(b.name)),
    [businesses],
  );

  const openFromTemplate = (t: AssignmentTemplate) => {
    setFromTemplate(t);
    setFromTemplateForm({
      projectRef: "volta",
      title: t.title,
      description: t.description ?? "",
      priority: false,
      requiresApproval: t.requiresApproval !== false,
      applicationRequired: Boolean(t.applicationRequired),
      allowMultipleCompletions: Boolean(t.allowMultipleCompletions),
    });
  };

  const handleCreateFromTemplate = async () => {
    if (!fromTemplate) return;
    setFromTemplateCreating(true);
    setFromTemplateError(null);
    try {
      const bizId = fromTemplateForm.projectRef.startsWith("biz:") ? fromTemplateForm.projectRef.slice(4) : undefined;
      const grpId = fromTemplateForm.projectRef.startsWith("grp:") ? fromTemplateForm.projectRef.slice(4) : undefined;
      const isRecurring = fromTemplate.recurringEnabled ?? false;
      await createAssignment({
        title: fromTemplateForm.title.trim() || fromTemplate.title,
        description: fromTemplateForm.description,
        track: fromTemplate.track,
        credits: fromTemplate.credits,
        difficulty: fromTemplate.difficulty ?? "Standard",
        estimatedHours: 0,
        minRole: fromTemplate.minRole,
        businessId: bizId,
        projectGroupId: grpId,
        capacity: fromTemplate.capacity ?? 0,
        deadlineType: isRecurring ? "hard" : (fromTemplate.deadlineOffsetDays != null ? "offset" : "hard"),
        deadlineOffsetDays: !isRecurring ? fromTemplate.deadlineOffsetDays : undefined,
        recurringEnabled: isRecurring,
        checkinIntervalDays: isRecurring ? (fromTemplate.checkinIntervalDays ?? 7) : undefined,
        maxDurationDays: isRecurring ? fromTemplate.maxDurationDays : undefined,
        priority: fromTemplateForm.priority,
        requiresApproval: fromTemplateForm.requiresApproval,
        applicationRequired: fromTemplateForm.applicationRequired,
        allowMultipleCompletions: fromTemplateForm.allowMultipleCompletions,
        status: "Open",
        cycleId: activeCycle?.id ?? "",
        notes: "",
        createdBy: userProfile?.email || user?.email || user?.id || "unknown",
      });
      setFromTemplate(null);
    } catch (err) {
      setFromTemplateError(err instanceof Error ? err.message : "Failed to create assignment. Please try again.");
    } finally {
      setFromTemplateCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? templates.filter((t) => t.title.toLowerCase().includes(q) || t.track.toLowerCase().includes(q))
      : templates;
    return [...list].sort((a, b) => {
      const td = (TRACK_RANK[a.track] ?? 9) - (TRACK_RANK[b.track] ?? 9);
      return td !== 0 ? td : a.title.localeCompare(b.title);
    });
  }, [templates, search]);

  const openCreate = () => { setForm({ ...BLANK_FORM }); setEditing(null); setSaveError(null); setModal("create"); };

  const openEdit = (t: AssignmentTemplate) => {
    const cap = t.capacity ?? 0;
    setForm({
      title: t.title,
      description: t.description ?? "",
      track: t.track,
      credits: t.credits,
      minRole: t.minRole,
      limitClaims: cap > 0,
      maxClaims: cap > 0 ? String(cap) : "1",
      requiresApproval: t.requiresApproval !== false,
      applicationRequired: Boolean(t.applicationRequired),
      allowMultipleCompletions: Boolean(t.allowMultipleCompletions),
      recurringEnabled: t.recurringEnabled ?? false,
      deadlineOffsetDays: t.deadlineOffsetDays != null ? String(t.deadlineOffsetDays) : "",
      checkinIntervalDays: t.checkinIntervalDays != null ? String(t.checkinIntervalDays) : "7",
      maxDurationDays: t.maxDurationDays != null ? String(t.maxDurationDays) : "",
    });
    setEditing(t);
    setSaveError(null);
    setModal("edit");
  };

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const buildPayload = (): Omit<AssignmentTemplate, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const offsetDays  = !form.recurringEnabled && form.deadlineOffsetDays.trim() ? Number(form.deadlineOffsetDays) : undefined;
    const intervalDays = form.recurringEnabled && form.checkinIntervalDays.trim() ? Number(form.checkinIntervalDays) : undefined;
    const maxDuration  = form.recurringEnabled && form.maxDurationDays.trim() ? Number(form.maxDurationDays) : undefined;
    return {
      title,
      description: form.description,
      track: form.track,
      credits: Math.max(0, Number(form.credits) || 0),
      estimatedHours: 0,
      minRole: form.minRole,
      capacity: form.limitClaims ? Math.max(1, Number(form.maxClaims) || 1) : 0,
      requiresApproval: form.requiresApproval,
      applicationRequired: form.applicationRequired,
      allowMultipleCompletions: form.allowMultipleCompletions,
      deadlineOffsetDays: offsetDays,
      recurringEnabled: form.recurringEnabled,
      checkinIntervalDays: intervalDays,
      maxDurationDays: maxDuration,
      notes: "",
      difficulty: editing?.difficulty ?? "Standard",
      createdBy: userProfile?.email || user?.email || user?.id || "unknown",
    };
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    setSaveError(null);
    try {
      if (editing) await updateAssignmentTemplate(editing.id, payload);
      else await createAssignmentTemplate(payload);
      if (opts?.addAnother && !editing) setForm((p) => ({ ...p, title: "" }));
      else setModal(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(async () => {
      await deleteAssignmentTemplate(editing.id);
      setModal(null);
    }, `Delete template "${editing.title}"? Any assignments already created from it are unaffected.`);
  };

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64"><Spinner /></div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ASSIGNMENTS_TABS} />

      <PageHeader
        title="Assignments"
        subtitle={`${filtered.length} template${filtered.length === 1 ? "" : "s"}`}
        action={<Btn variant="primary" onClick={openCreate}>+ New Template</Btn>}
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title or track…" />
      </div>

      {filtered.length === 0 ? (
        <Empty
          message={search ? "No templates match your search." : "No templates yet. Create one to speed up assignment creation."}
          action={<Btn variant="primary" onClick={openCreate}>+ New Template</Btn>}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: "800px" }}>
            <thead className="bg-[#0F1014]">
              <tr className="members-header-sep">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Title</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-28">Track</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-24 text-right">Credits</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-32">Min Role</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 w-44">Schedule</th>
                <th className="px-4 py-3 w-44" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const descText = t.description
                  ? t.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
                  : "";
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <p className="text-[13px] font-semibold text-white/90 leading-snug">{t.title}</p>
                      {descText && (
                        <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{descText}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.requiresApproval === false && (
                          <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/8 px-2 py-0.5 text-[10px] text-emerald-300/80">Auto-approved</span>
                        )}
                        {t.applicationRequired && (
                          <span className="inline-flex items-center rounded-full border border-blue-400/25 bg-blue-400/8 px-2 py-0.5 text-[10px] text-blue-300/80">Pre-approval</span>
                        )}
                        {t.allowMultipleCompletions && (
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/45">Repeatable</span>
                        )}
                        {(t.capacity ?? 0) > 0 && (
                          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/45">{t.capacity} spot{t.capacity !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${TRACK_PILL[t.track]}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${TRACK_DOT[t.track]}`} />
                        {t.track}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <span className="text-[15px] font-semibold text-[#F6B78D]">{t.credits}</span>
                      {t.recurringEnabled && (
                        <span className="text-[10px] text-[#F6B78D]/55 font-normal ml-1">/check-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="text-[12px] text-white/60">{t.minRole}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {t.recurringEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-400/80">
                          <span>↻</span>
                          <span>Every {t.checkinIntervalDays ?? 7}d{t.maxDurationDays ? ` · max ${t.maxDurationDays}d` : ""}</span>
                        </span>
                      ) : t.deadlineOffsetDays != null ? (
                        <span className="text-[12px] text-white/55">Due in {t.deadlineOffsetDays}d</span>
                      ) : (
                        <span className="text-[12px] text-white/25">No deadline</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openFromTemplate(t)}
                          className="px-3 py-1.5 rounded-lg border border-[#F6B78D]/30 bg-[#F6B78D]/[0.08] text-[11px] text-[#F3E28D]/80 hover:border-[#F6B78D]/50 hover:bg-[#F6B78D]/[0.14] hover:text-[#F3E28D] transition-colors font-medium whitespace-nowrap"
                        >
                          Use Template
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="px-3 py-1.5 rounded-lg border border-white/12 bg-white/[0.04] text-[11px] text-white/55 hover:border-white/25 hover:bg-white/[0.07] hover:text-white/80 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── New / Edit Template modal ──────────────────────────────────────── */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Template" : "New Template"}
      >
        <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">

          <Field label="Title" required>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. SEO Audit, Financial Model, Website Mockup"
            />
          </Field>

          <Field label="Description">
            <RichTextEditor
              content={form.description}
              onChange={(html) => set("description", html)}
              minHeight={120}
              placeholder="What this assignment typically involves. Admins can edit this per-assignment when creating from this template."
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Track" required>
              <Select
                options={MEMBER_TRACKS}
                value={form.track}
                onChange={(e) => set("track", e.target.value as CycleTrack)}
              />
            </Field>
            <Field label={form.recurringEnabled ? "Credits / check-in" : "Credits"} required>
              <Input
                type="number"
                min="0"
                value={String(form.credits)}
                onChange={(e) => set("credits", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Minimum Role">
              <Select
                options={ROLES}
                value={form.minRole}
                onChange={(e) => set("minRole", e.target.value as CycleRole)}
              />
            </Field>
          </div>

          <div>
            <SectionLabel>Schedule</SectionLabel>
            <div className="rounded-xl border border-white/10 bg-[#0F1014]">
              <ToggleRow
                label="Recurring check-in"
                description="Credits are awarded per check-in rather than once on completion."
                checked={form.recurringEnabled}
                onChange={(v) => set("recurringEnabled", v)}
              />
            </div>
            {form.recurringEnabled ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Check-in every (days)">
                  <Input
                    type="number"
                    min="1"
                    value={form.checkinIntervalDays}
                    placeholder="7"
                    onChange={(e) => set("checkinIntervalDays", e.target.value)}
                  />
                </Field>
                <Field label="Max duration (days, optional)">
                  <Input
                    type="number"
                    min="1"
                    value={form.maxDurationDays}
                    placeholder="No limit"
                    onChange={(e) => set("maxDurationDays", e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <div className="mt-3">
                <Field label="Deadline (days after claim, optional)">
                  <Input
                    type="number"
                    min="0"
                    value={form.deadlineOffsetDays}
                    placeholder="e.g. 7"
                    onChange={(e) => set("deadlineOffsetDays", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Participation</SectionLabel>
            <div className="rounded-xl border border-white/10 bg-[#0F1014] px-4 py-3 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("limitClaims", false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!form.limitClaims ? "bg-[#F6B78D]/15 border-[#F6B78D]/40 text-[#F6B78D]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
                >
                  For everyone
                </button>
                <button
                  type="button"
                  onClick={() => set("limitClaims", true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.limitClaims ? "bg-[#F6B78D]/15 border-[#F6B78D]/40 text-[#F6B78D]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
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
                    onChange={(e) => set("maxClaims", e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-white/45">max claimants</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <SectionLabel>Options</SectionLabel>
            <div className="rounded-xl border border-white/10 bg-[#0F1014] divide-y divide-white/[0.07]">
              <ToggleRow
                label="Requires approval"
                description="Admin must manually approve submissions before credits are awarded."
                checked={form.requiresApproval}
                onChange={(v) => set("requiresApproval", v)}
              />
              <ToggleRow
                label="Requires pre-approval"
                description="Members are told to contact the board before claiming; admin is alerted on claim."
                checked={form.applicationRequired}
                onChange={(v) => set("applicationRequired", v)}
              />
              <ToggleRow
                label="Allow multiple completions"
                description="Member can re-claim and complete again after each approval."
                checked={form.allowMultipleCompletions}
                onChange={(v) => set("allowMultipleCompletions", v)}
              />
            </div>
          </div>

        </div>

        {saveError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {saveError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-white/8">
          <div>{editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)} disabled={busy}>Cancel</Btn>
            {!editing && (
              <Btn variant="secondary" onClick={() => void handleSave({ addAnother: true })} disabled={!form.title.trim() || busy}>
                Save & New
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.title.trim() || busy}>
              {busy ? "Saving…" : editing ? "Save" : "Create Template"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Create Assignment from Template modal ─────────────────────────── */}
      <Modal
        open={fromTemplate !== null}
        onClose={() => setFromTemplate(null)}
        title="Create Assignment"
      >
        {fromTemplate && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 flex items-start gap-3">
              <span className={`mt-1 inline-block h-2 w-2 rounded-full flex-shrink-0 ${TRACK_DOT[fromTemplate.track]}`} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35 mb-0.5">Template</p>
                <p className="text-sm font-semibold text-white/90">{fromTemplate.title}</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {fromTemplate.track} · {fromTemplate.credits} {fromTemplate.recurringEnabled ? "credits/check-in" : "credits"} · Min {fromTemplate.minRole}
                  {fromTemplate.capacity ? ` · ${fromTemplate.capacity} spots` : " · Open"}
                  {fromTemplate.recurringEnabled
                    ? ` · ↻ every ${fromTemplate.checkinIntervalDays ?? 7}d${fromTemplate.maxDurationDays ? `, max ${fromTemplate.maxDurationDays}d` : ""}`
                    : fromTemplate.deadlineOffsetDays != null ? ` · due in ${fromTemplate.deadlineOffsetDays}d` : ""}
                </p>
              </div>
            </div>

            <div>
              <SectionLabel>Assignment</SectionLabel>
              <div className="space-y-3">
                <Field label="Business" required>
                  <Select
                    value={fromTemplateForm.projectRef}
                    onChange={(e) => setFromTemplateForm((p) => ({ ...p, projectRef: e.target.value }))}
                  >
                    <option value="volta">Novus NYC</option>
                    {businessOptions.map((b) => (
                      <option key={b.id} value={`biz:${b.id}`}>
                        {[b.name, b.neighborhood].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Title">
                  <Input
                    value={fromTemplateForm.title}
                    onChange={(e) => setFromTemplateForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder={fromTemplate.title}
                  />
                </Field>

                <Field label="Description / more info">
                  <RichTextEditor
                    content={fromTemplateForm.description}
                    onChange={(html) => setFromTemplateForm((p) => ({ ...p, description: html }))}
                    minHeight={140}
                    placeholder="Add member-facing context, links, acceptance criteria, or business-specific details."
                  />
                </Field>
              </div>
            </div>

            {fromTemplate.recurringEnabled ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[11px] text-amber-300/75 leading-relaxed">
                <span className="font-semibold">↻ Recurring</span> — members earn {fromTemplate.credits} credit{fromTemplate.credits !== 1 ? "s" : ""} per check-in (every {fromTemplate.checkinIntervalDays ?? 7} days{fromTemplate.maxDurationDays ? `, up to ${fromTemplate.maxDurationDays} days` : ""}).
              </div>
            ) : fromTemplate.deadlineOffsetDays != null ? (
              <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 text-[11px] text-white/45 leading-relaxed">
                Deadline will be set automatically — {fromTemplate.deadlineOffsetDays} day{fromTemplate.deadlineOffsetDays !== 1 ? "s" : ""} after each member claims.
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 text-[11px] text-white/45 leading-relaxed">
                No deadline configured. You can add one by editing the assignment after creating it.
              </div>
            )}

            <div>
              <SectionLabel>Options</SectionLabel>
              <div className="rounded-xl border border-white/10 bg-[#0F1014] divide-y divide-white/[0.07]">
                <ToggleRow
                  label="Priority"
                  description="Marks this assignment as high-priority for the current cycle."
                  checked={fromTemplateForm.priority}
                  onChange={(v) => setFromTemplateForm((p) => ({ ...p, priority: v }))}
                />
                <ToggleRow
                  label="Requires approval"
                  description="Admin must manually approve submissions before credits are awarded."
                  checked={fromTemplateForm.requiresApproval}
                  onChange={(v) => setFromTemplateForm((p) => ({ ...p, requiresApproval: v }))}
                />
                <ToggleRow
                  label="Requires pre-approval"
                  description="Members are told to contact the board before claiming; admin is alerted on claim."
                  checked={fromTemplateForm.applicationRequired}
                  onChange={(v) => setFromTemplateForm((p) => ({ ...p, applicationRequired: v }))}
                />
                <ToggleRow
                  label="Allow multiple completions"
                  description="Member can re-claim and complete again after each approval."
                  checked={fromTemplateForm.allowMultipleCompletions}
                  onChange={(v) => setFromTemplateForm((p) => ({ ...p, allowMultipleCompletions: v }))}
                />
              </div>
            </div>
          </div>
        )}

        {fromTemplateError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {fromTemplateError}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setFromTemplate(null)} disabled={fromTemplateCreating}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void handleCreateFromTemplate()} disabled={fromTemplateCreating}>
            {fromTemplateCreating ? "Creating…" : "Create Assignment"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
