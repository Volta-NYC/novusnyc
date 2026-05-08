"use client";

// Admin page A2 — Infractions catalog. Defines the *types* of infractions and
// their point values. Issued instances against members live elsewhere (member
// drawer on the team directory).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ADMIN_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, TextArea, Select, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeInfractions, createInfraction, updateInfraction, deleteInfraction,
  type Infraction, type InfractionSeverity,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const SEVERITY_OPTIONS: InfractionSeverity[] = ["minor", "major", "severe"];

const SEVERITY_STYLES: Record<InfractionSeverity, { dot: string; pill: string }> = {
  minor:  { dot: "bg-yellow-400", pill: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" },
  major:  { dot: "bg-orange-400", pill: "border-orange-400/30 bg-orange-400/10 text-orange-300" },
  severe: { dot: "bg-red-400",    pill: "border-red-400/30 bg-red-400/10 text-red-300" },
};

const BLANK_FORM: Omit<Infraction, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  points: 2,
  severity: "minor",
  active: true,
  sortIndex: 0,
};

export default function InfractionsPage() {
  const { authRole, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Infraction | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [showInactive, setShowInactive] = useState(true);

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeInfractions(setInfractions), []);

  const sorted = useMemo(() => {
    const list = showInactive ? infractions : infractions.filter((i) => i.active);
    return [...list].sort((a, b) => {
      // Active first, then by sortIndex, then by name as a stable tiebreaker.
      if (a.active !== b.active) return a.active ? -1 : 1;
      const aIdx = a.sortIndex ?? 0;
      const bIdx = b.sortIndex ?? 0;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [infractions, showInactive]);

  const openCreate = () => {
    const nextSortIndex = infractions.reduce((m, i) => Math.max(m, i.sortIndex ?? 0), 0) + 10;
    setForm({ ...BLANK_FORM, sortIndex: nextSortIndex });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (i: Infraction) => {
    setForm({
      name: i.name,
      description: i.description,
      points: i.points,
      severity: i.severity,
      active: i.active,
      sortIndex: i.sortIndex ?? 0,
    });
    setEditing(i);
    setModal("edit");
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      ...form,
      name,
      description: form.description.trim(),
      points: Math.max(0, Math.round(form.points || 0)),
    };
    if (editing) await updateInfraction(editing.id, payload);
    else await createInfraction(payload);
    setModal(null);
  };

  const toggleActive = async (i: Infraction) => {
    await updateInfraction(i.id, { active: !i.active });
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(
      async () => {
        await deleteInfraction(editing.id);
        setModal(null);
      },
      `Delete “${editing.name}”? This permanently removes the infraction type. To preserve historical issued strikes, mark it inactive instead.`,
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
      <SectionTabs tabs={ADMIN_GROUP_TABS} />

      <PageHeader
        title="Infractions"
        subtitle="The catalog of infraction types and their point values. This list is what members see on their dashboard rules card."
        action={<Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>}
      />

      <div className="flex items-center justify-between mb-4">
        <p className="text-white/45 text-xs">
          {infractions.filter((i) => i.active).length} active · {infractions.length} total
        </p>
        <label className="inline-flex items-center gap-2 text-xs text-white/65">
          <input
            type="checkbox"
            className="members-checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show retired
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[26%]">Name</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45">Description</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[100px]">Severity</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[80px]">Points</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[80px]">Order</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[100px]">Status</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => {
              const styles = SEVERITY_STYLES[i.severity];
              return (
                <tr key={i.id} className={`border-b border-white/8 align-top hover:bg-white/[0.03] ${i.active ? "" : "opacity-60"}`}>
                  <td className="px-3 py-2.5 text-sm text-white/90 break-words">{i.name}</td>
                  <td className="px-3 py-2.5 text-xs text-white/65 break-words">{i.description || <span className="text-white/30">—</span>}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.pill}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                      {i.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-[#85CC17] font-mono">{i.points}</td>
                  <td className="px-3 py-2.5 text-xs text-white/45">{i.sortIndex ?? 0}</td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => void toggleActive(i)}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        i.active
                          ? "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]"
                          : "border-white/15 bg-[#11141A] text-white/55"
                      }`}
                      title={i.active ? "Click to retire" : "Click to reactivate"}
                    >
                      {i.active ? "Active" : "Retired"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Btn size="sm" variant="secondary" onClick={() => openEdit(i)}>Edit</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-6">
            <Empty
              message="No infractions in the catalog yet."
              action={<Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>}
            />
          </div>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Infraction" : "New Infraction"}
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Did not respond to email within 48 hours"
            />
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="When this should be issued — used as guidance for the admin issuing it."
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Severity" required>
              <Select
                options={SEVERITY_OPTIONS}
                value={form.severity}
                onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value as InfractionSeverity }))}
              />
            </Field>
            <Field label="Points" required>
              <Input
                type="number"
                min="0"
                value={String(form.points)}
                onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Display order">
              <Input
                type="number"
                min="0"
                value={String(form.sortIndex)}
                onChange={(e) => setForm((p) => ({ ...p, sortIndex: Number(e.target.value) || 0 }))}
              />
            </Field>
          </div>
          <Field label="Status">
            <label className="inline-flex items-center gap-2.5 text-sm text-white/80 rounded-lg border border-white/10 bg-[#11141A] px-3 py-2">
              <input
                type="checkbox"
                className="members-checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              Active — shown to members and selectable when issuing strikes
            </label>
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div>
            {editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim()}>
              {editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
