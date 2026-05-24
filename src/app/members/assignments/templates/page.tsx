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
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance", "General"];
const ROLES: CycleRole[] = ["Analyst", "Senior Analyst", "Associate"];

const TRACK_DOT: Record<CycleTrack, string> = {
  Tech: "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance: "bg-amber-500",
  General: "bg-gray-400",
};

const TRACK_RANK: Record<CycleTrack, number> = { Tech: 0, Marketing: 1, Finance: 2, General: 3 };

interface FormState {
  title: string;
  description: string;
  track: CycleTrack;
  credits: number;
  minRole: CycleRole;
  maxClaims: string;              // "0" or "" = unlimited
  requiresApproval: boolean;
  applicationRequired: boolean;
  allowMultipleCompletions: boolean;
  recurringEnabled: boolean;
  deadlineOffsetDays: string;     // used when not recurring
  checkinIntervalDays: string;    // used when recurring
  maxDurationDays: string;        // optional cap for recurring
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  track: "Tech",
  credits: 1,
  minRole: "Analyst",
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
  });
  const [fromTemplateCreating, setFromTemplateCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fromTemplateError, setFromTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    return subscribeAssignmentTemplates(setTemplates);
  }, []);

  useEffect(() => {
    return subscribeBusinesses(setBusinesses);
  }, []);

  useEffect(() => {
    return subscribeCycles(setCycles);
  }, []);

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
        requiresApproval: fromTemplate.requiresApproval !== false,
        applicationRequired: fromTemplate.applicationRequired,
        allowMultipleCompletions: fromTemplate.allowMultipleCompletions,
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
      ? templates.filter(
          (t) => t.title.toLowerCase().includes(q) || t.track.toLowerCase().includes(q),
        )
      : templates;
    return [...list].sort((a, b) => {
      const td = (TRACK_RANK[a.track] ?? 9) - (TRACK_RANK[b.track] ?? 9);
      if (td !== 0) return td;
      return a.title.localeCompare(b.title);
    });
  }, [templates, search]);

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setEditing(null);
    setSaveError(null);
    setModal("create");
  };

  const openEdit = (t: AssignmentTemplate) => {
    const cap = t.capacity ?? 0;
    setForm({
      title: t.title,
      description: t.description ?? "",
      track: t.track,
      credits: t.credits,
      minRole: t.minRole,
      maxClaims: cap > 0 ? String(cap) : "",
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

  const buildPayload = (): Omit<AssignmentTemplate, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const offsetDays = !form.recurringEnabled && form.deadlineOffsetDays.trim() ? Number(form.deadlineOffsetDays) : undefined;
    const intervalDays = form.recurringEnabled && form.checkinIntervalDays.trim() ? Number(form.checkinIntervalDays) : undefined;
    const maxDuration = form.recurringEnabled && form.maxDurationDays.trim() ? Number(form.maxDurationDays) : undefined;
    return {
      title,
      description: form.description,
      track: form.track,
      credits: Math.max(0, Number(form.credits) || 0),
      estimatedHours: 0,
      minRole: form.minRole,
      capacity: form.maxClaims.trim() ? Math.max(0, Number(form.maxClaims)) : 0,
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
      if (opts?.addAnother && !editing) {
        setForm((p) => ({ ...p, title: "" }));
      } else {
        setModal(null);
      }
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
        action={<Btn variant="primary" onClick={openCreate}>+ New Template</Btn>}
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title, track, or notes…" />
      </div>

      {filtered.length === 0 ? (
        <Empty
          message={search ? "No templates match your search." : "No templates yet. Create one to speed up assignment creation."}
          action={<Btn variant="primary" onClick={openCreate}>+ New Template</Btn>}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
          <table className="table-fixed text-left" style={{ width: "100%", minWidth: "860px" }}>
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[240px]">Title</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[100px]">Track</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[65px]">Credits</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Min Role</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[160px]">Schedule</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[175px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.025]">
                  <td className="px-3 py-0 h-9 text-[11px] text-white/90 align-middle overflow-hidden">
                    <span className="font-medium block truncate" title={t.title}>{t.title}</span>
                  </td>
                  <td className="px-3 py-0 h-9 text-[11px] text-white/70 align-middle">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${TRACK_DOT[t.track]}`} />
                      {t.track}
                    </span>
                  </td>
                  <td className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{t.credits}</td>
                  <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle">{t.minRole}</td>
                  <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle">
                    {t.recurringEnabled ? (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <span>↻</span>
                        <span>Every {t.checkinIntervalDays ?? 7}d{t.maxDurationDays ? ` · max ${t.maxDurationDays}d` : ""}</span>
                      </span>
                    ) : t.deadlineOffsetDays != null ? (
                      `Due in ${t.deadlineOffsetDays}d`
                    ) : (
                      <span className="text-white/25">No deadline</span>
                    )}
                  </td>
                  <td className="px-3 py-0 h-9 align-middle">
                    <div className="members-row-actions">
                      <Btn size="sm" variant="primary" onClick={() => openFromTemplate(t)}>Create +</Btn>
                      <Btn size="sm" variant="secondary" onClick={() => openEdit(t)}>Edit</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Template" : "New Template"}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. SEO Audit, Financial Model, Website Mockup" />
          </Field>

          <Field label="Description">
            <RichTextEditor
              content={form.description}
              onChange={(html) => setForm((p) => ({ ...p, description: html }))}
              minHeight={140}
              placeholder="What this assignment typically involves. Admins can edit this per-assignment when creating from this template."
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Track" required>
              <Select options={MEMBER_TRACKS} value={form.track}
                onChange={(e) => setForm((p) => ({ ...p, track: e.target.value as CycleTrack }))} />
            </Field>
            <Field label={form.recurringEnabled ? "Credits / check-in" : "Credits"} required>
              <Input type="number" min="0" value={String(form.credits)}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label="Minimum Role">
              <Select options={ROLES} value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))} />
            </Field>
          </div>

          {/* Recurring toggle */}
          <div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1014] px-4 py-3 cursor-pointer">
              <div>
                <p className="text-sm text-white/85 font-medium">Recurring check-in assignment</p>
                <p className="text-[11px] text-white/45 mt-0.5">Credits are awarded per check-in rather than once on completion.</p>
              </div>
              <input
                type="checkbox"
                className="members-checkbox"
                checked={form.recurringEnabled}
                onChange={(e) => setForm((p) => ({ ...p, recurringEnabled: e.target.checked }))}
              />
            </label>
          </div>

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
              <Field label="Max Claims">
                <Input type="number" min="0" placeholder="0 = no limit" value={form.maxClaims}
                  onChange={(e) => setForm((p) => ({ ...p, maxClaims: e.target.value }))} />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline offset (days after claim)">
                <Input type="number" min="0" value={form.deadlineOffsetDays} placeholder="e.g. 7"
                  onChange={(e) => setForm((p) => ({ ...p, deadlineOffsetDays: e.target.value }))} />
              </Field>
              <Field label="Max Claims">
                <Input type="number" min="0" placeholder="0 = no limit" value={form.maxClaims}
                  onChange={(e) => setForm((p) => ({ ...p, maxClaims: e.target.value }))} />
              </Field>
            </div>
          )}

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" className="members-checkbox" checked={form.requiresApproval}
              onChange={(e) => setForm((p) => ({ ...p, requiresApproval: e.target.checked }))} />
            <span>Requires approval
              <span className="ml-1.5 text-white/35 text-xs font-normal">— uncheck to auto-award credits on submit</span>
            </span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" className="members-checkbox" checked={form.applicationRequired}
              onChange={(e) => setForm((p) => ({ ...p, applicationRequired: e.target.checked }))} />
            <span>Requires pre-approval
              <span className="ml-1.5 text-white/35 text-xs font-normal">— members told to email board first; admin alerted on claim</span>
            </span>
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
            <input type="checkbox" className="members-checkbox" checked={form.allowMultipleCompletions}
              onChange={(e) => setForm((p) => ({ ...p, allowMultipleCompletions: e.target.checked }))} />
            <span>Allow multiple completions
              <span className="ml-1.5 text-white/35 text-xs font-normal">— member can re-claim after approval (off by default)</span>
            </span>
          </label>
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
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Create from Template modal ─────────────────────────── */}
      <Modal
        open={fromTemplate !== null}
        onClose={() => setFromTemplate(null)}
        title="Create Assignment from Template"
      >
        {fromTemplate && (
          <div className="space-y-4">
            {/* Template summary */}
            <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 flex items-start gap-3">
              <span className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${TRACK_DOT[fromTemplate.track]}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/90">{fromTemplate.title}</p>
                <p className="text-[11px] text-white/45 mt-0.5">
                  {fromTemplate.track} · {fromTemplate.credits} {fromTemplate.recurringEnabled ? "credits/check-in" : "credits"} · Min {fromTemplate.minRole}
                  {fromTemplate.capacity ? ` · max ${fromTemplate.capacity} claims` : ""}
                  {fromTemplate.recurringEnabled
                    ? ` · check-in every ${fromTemplate.checkinIntervalDays ?? 7}d${fromTemplate.maxDurationDays ? ` · max ${fromTemplate.maxDurationDays}d` : ""}`
                    : fromTemplate.deadlineOffsetDays ? ` · due in ${fromTemplate.deadlineOffsetDays}d` : ""
                  }
                </p>
                {fromTemplate.description && (
                  <p
                    className="text-[11px] text-white/55 mt-1.5 line-clamp-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(fromTemplate.description) }}
                  />
                )}
              </div>
            </div>

            <Field label="Business" required>
              <select
                value={fromTemplateForm.projectRef}
                onChange={(e) => setFromTemplateForm((p) => ({ ...p, projectRef: e.target.value }))}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value="volta">Volta</option>
                {businessOptions.map((b) => (
                  <option key={b.id} value={`biz:${b.id}`}>
                    {[b.name, b.neighborhood].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignment title">
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
                minHeight={160}
                placeholder="Add member-facing context, links, acceptance criteria, and any business-specific details."
              />
            </Field>

            {fromTemplate.recurringEnabled ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-[11px] text-amber-300/80">
                <span className="font-semibold">↻ Recurring assignment</span> — members earn {fromTemplate.credits} credits per check-in (every {fromTemplate.checkinIntervalDays ?? 7} days{fromTemplate.maxDurationDays ? `, up to ${fromTemplate.maxDurationDays} days` : ""}).
              </div>
            ) : fromTemplate.deadlineOffsetDays != null ? (
              <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 text-[11px] text-white/50">
                Deadline is set automatically — {fromTemplate.deadlineOffsetDays} days after each member claims. Edit the assignment to add a hard deadline instead.
              </div>
            ) : (
              <div className="rounded-xl border border-white/8 bg-[#0F1014] px-4 py-3 text-[11px] text-white/50">
                No deadline configured. You can add one by editing the assignment after creating it.
              </div>
            )}

            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
              <input
                type="checkbox"
                checked={fromTemplateForm.priority}
                onChange={(e) => setFromTemplateForm((p) => ({ ...p, priority: e.target.checked }))}
                className="members-checkbox"
              />
              Priority assignment
            </label>
          </div>
        )}

        {fromTemplateError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {fromTemplateError}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setFromTemplate(null)} disabled={fromTemplateCreating}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => void handleCreateFromTemplate()}
            disabled={fromTemplateCreating}
          >
            {fromTemplateCreating ? "Creating…" : "Create Assignment"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
