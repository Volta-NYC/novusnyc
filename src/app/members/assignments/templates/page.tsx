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
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, SearchBar,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeAssignmentTemplates,
  createAssignmentTemplate, updateAssignmentTemplate, deleteAssignmentTemplate,
  type AssignmentTemplate, type CycleRole, type CycleTrack,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const MEMBER_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance"];
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
  type: string;
  track: CycleTrack;
  credits: number;
  estimatedHours: number;
  minRole: CycleRole;
  capacity: number;
  deadlineOffsetDays: string;
  notes: string;
}

const BLANK_FORM: FormState = {
  title: "",
  description: "",
  type: "",
  track: "Tech",
  credits: 1,
  estimatedHours: 1,
  minRole: "Analyst",
  capacity: 1,
  deadlineOffsetDays: "",
  notes: "",
};

export default function TemplatesPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<AssignmentTemplate | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => {
    return subscribeAssignmentTemplates(setTemplates);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? templates.filter(
          (t) => t.title.toLowerCase().includes(q) || t.track.toLowerCase().includes(q) || (t.notes ?? "").toLowerCase().includes(q),
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
    setModal("create");
  };

  const openEdit = (t: AssignmentTemplate) => {
    setForm({
      title: t.title,
      description: t.description ?? "",
      type: t.type ?? "",
      track: t.track,
      credits: t.credits,
      estimatedHours: t.estimatedHours ?? 0,
      minRole: t.minRole,
      capacity: t.capacity ?? 1,
      deadlineOffsetDays: t.deadlineOffsetDays != null ? String(t.deadlineOffsetDays) : "",
      notes: t.notes ?? "",
    });
    setEditing(t);
    setModal("edit");
  };

  const buildPayload = (): Omit<AssignmentTemplate, "id" | "createdAt" | "updatedAt"> | null => {
    const title = form.title.trim();
    if (!title) return null;
    const offsetDays = form.deadlineOffsetDays.trim() ? Number(form.deadlineOffsetDays) : undefined;
    return {
      title,
      description: form.description,
      type: form.type || undefined,
      track: form.track,
      credits: Math.max(0, Number(form.credits) || 0),
      estimatedHours: Math.max(0, Number(form.estimatedHours) || 0),
      minRole: form.minRole,
      capacity: Math.max(1, Number(form.capacity) || 1),
      deadlineOffsetDays: offsetDays,
      notes: form.notes,
      difficulty: editing?.difficulty ?? "Standard",
      createdBy: userProfile?.email || user?.email || user?.id || "unknown",
    };
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    const payload = buildPayload();
    if (!payload) return;
    if (editing) await updateAssignmentTemplate(editing.id, payload);
    else await createAssignmentTemplate(payload);
    if (opts?.addAnother && !editing) {
      setForm((p) => ({ ...p, title: "" }));
    } else {
      setModal(null);
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
        subtitle="Templates — reusable blueprints. Not open assignments. Use &quot;Create Assignment from Template&quot; in the By Business view to instantiate one."
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
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[260px]">Title</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[90px]">Track</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[80px]">Type</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[65px]">Credits</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[90px]">Min Role</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[100px]">Deadline offset</th>
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
                  <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle">
                    {t.type || <span className="text-white/25">—</span>}
                  </td>
                  <td className="px-3 py-0 h-9 text-[11px] text-[#85CC17] font-mono align-middle">{t.credits}</td>
                  <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle">{t.minRole}</td>
                  <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle">
                    {t.deadlineOffsetDays != null ? `${t.deadlineOffsetDays}d` : <span className="text-white/25">—</span>}
                  </td>
                  <td className="px-3 py-0 h-9 align-middle">
                    <div className="members-row-actions">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Track" required>
              <Select options={MEMBER_TRACKS} value={form.track}
                onChange={(e) => setForm((p) => ({ ...p, track: e.target.value as CycleTrack }))} />
            </Field>
            <Field label="Type (Finance only)">
              <Select options={["", "Report", "Case Study"]} value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Credits" required>
              <Input type="number" min="0" value={String(form.credits)}
                onChange={(e) => setForm((p) => ({ ...p, credits: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label="Est. hours">
              <Input type="number" min="0" step="0.5" value={String(form.estimatedHours)}
                onChange={(e) => setForm((p) => ({ ...p, estimatedHours: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label="Slots">
              <Input type="number" min="1" value={String(form.capacity)}
                onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) || 1 }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Role">
              <Select options={ROLES} value={form.minRole}
                onChange={(e) => setForm((p) => ({ ...p, minRole: e.target.value as CycleRole }))} />
            </Field>
            <Field label="Deadline offset (days from creation)">
              <Input type="number" min="0" value={form.deadlineOffsetDays} placeholder="e.g. 28"
                onChange={(e) => setForm((p) => ({ ...p, deadlineOffsetDays: e.target.value }))} />
            </Field>
          </div>

          <Field label="Notes">
            <Input value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Admin notes about when to use this template" />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div>{editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            {!editing && (
              <Btn variant="secondary" onClick={() => void handleSave({ addAnother: true })} disabled={!form.title.trim()}>
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
