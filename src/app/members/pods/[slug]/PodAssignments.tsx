"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Badge, Btn, Empty, Field, Input, LoadError, Modal, SearchBar, Select, TextArea } from "@/components/members/ui";
import {
  createPodAssignment, deletePodAssignment, setPodAssignmentStatus, subscribePodAssignments,
  updatePodAssignment, type Pod, type PodAssignment, type PodMember,
} from "@/lib/members/storage";

const STATUSES: PodAssignment["status"][] = ["Open", "In Progress", "In Review", "Done"];
type Draft = { title: string; description: string; dueDate: string; hours: string; deliverableUrl: string; assignedMemberIds: string[] };
const blank = (pod: Pod): Draft => ({ title: "", description: "", dueDate: "", hours: String(pod.defaultTaskHours), deliverableUrl: "", assignedMemberIds: [] });
const statusHelp = (status: PodAssignment["status"]) => status === "Open" ? "Not started" : status === "In Progress" ? "Member is working" : status === "In Review" ? "LIT needs to check it" : "Approved; hours certified";

export default function PodAssignments({ pod, roster, nameById, canEdit, myId }: {
  pod: Pod; roster: PodMember[]; nameById: Map<string, string>; canEdit: boolean; myId: string | null;
}) {
  const [all, setAll] = useState<PodAssignment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PodAssignment | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blank(pod));
  const [filter, setFilter] = useState<"Active" | PodAssignment["status"] | "All">("Active");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => subscribePodAssignments((rows, state) => { setAll(rows); setLoadError(state.error); }), []);
  const podRows = useMemo(() => (all ?? []).filter((a) => a.podId === pod.id), [all, pod.id]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, podRows.filter((r) => r.status === s).length])) as Record<PodAssignment["status"], number>, [podRows]);
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = (s: PodAssignment["status"]) => s === "In Review" ? 0 : s === "Open" ? 1 : s === "In Progress" ? 2 : 3;
    return podRows
      .filter((row) => filter === "All" || (filter === "Active" ? row.status !== "Done" : row.status === filter))
      .filter((row) => !q || [row.title, row.description, ...row.assignedMemberNames].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => rank(a.status) - rank(b.status) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  }, [filter, podRows, query]);

  const openNew = () => { setDraft(blank(pod)); setError(""); setEditing("new"); };
  const openEdit = (item: PodAssignment) => {
    setDraft({ title: item.title, description: item.description, dueDate: item.dueDate ?? "", hours: String(item.hours ?? pod.defaultTaskHours), deliverableUrl: item.deliverableUrl ?? "", assignedMemberIds: item.assignedMemberIds });
    setError(""); setEditing(item);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || draft.assignedMemberIds.length === 0) return;
    setSaving(true); setError("");
    const value = {
      podId: pod.id, title: draft.title.trim(), description: draft.description.trim(),
      status: editing === "new" ? "Open" as const : editing?.status ?? "Open" as const,
      assignedMemberIds: draft.assignedMemberIds,
      assignedMemberNames: draft.assignedMemberIds.map((id) => nameById.get(id) ?? "Unknown"),
      dueDate: draft.dueDate || null, hours: draft.hours === "" ? null : Number(draft.hours),
      deliverableUrl: draft.deliverableUrl.trim() || null,
      reviewRequestedAt: editing === "new" ? null : editing?.reviewRequestedAt ?? null,
    };
    try {
      if (editing === "new") await createPodAssignment(value);
      else if (editing) await updatePodAssignment(editing.id, value);
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "The assignment was not saved."); }
    finally { setSaving(false); }
  };
  const move = async (item: PodAssignment, status: PodAssignment["status"]) => {
    setActionId(item.id); setError("");
    try { await setPodAssignmentStatus(item.id, status); }
    catch (err) { setError(err instanceof Error ? err.message : "The assignment did not move."); }
    finally { setActionId(null); }
  };

  return <section aria-labelledby="assignments-title">
    <h2 id="assignments-title" className="sr-only">Assignments</h2>
    <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {STATUSES.map((status) => <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status}
        className={`rounded-xl border p-3 text-left transition-colors ${filter === status ? "border-[#F6B78D]/50 bg-[#F6B78D]/10" : "border-white/10 bg-[#15181F] hover:border-white/25"}`}>
        <span className="block font-display text-xl font-semibold tabular-nums text-white">{counts[status]}</span>
        <span className="mt-1 block text-[11px] font-medium text-white/65">{status}</span>
        <span className="mt-0.5 block text-[10px] text-white/35">{statusHelp(status)}</span>
      </button>)}
    </div>
    <div className="mb-3 flex flex-col gap-2 md:flex-row">
      <SearchBar value={query} onChange={setQuery} placeholder="Search assignments or members…" />
      <div className="flex gap-2">
        <Select className="min-w-36" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="Active">Active work</option><option value="All">All assignments</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {canEdit && <Btn variant="primary" className="shrink-0" onClick={openNew}>+ Assign work</Btn>}
      </div>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}
    {loadError ? <LoadError message={loadError} onRetry={() => window.location.reload()} /> : all === null ? <div className="h-36 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" /> : items.length === 0 ?
      <Empty message={podRows.length === 0 ? "No assignments yet. Create one after the next pod call." : "No assignments match this view."} action={canEdit && podRows.length === 0 ? <Btn variant="primary" onClick={openNew}>Create the first assignment</Btn> : undefined} /> :
      <div className="space-y-2">{items.map((item) => {
        const isMine = !!myId && item.assignedMemberIds.includes(myId);
        const overdue = item.status !== "Done" && !!item.dueDate && item.dueDate < new Date().toISOString().slice(0, 10);
        const next = item.status === "Open" ? "In Progress" : item.status === "In Progress" ? "In Review" : null;
        return <article key={item.id} className={`rounded-xl border bg-[#15181F] p-4 ${item.status === "In Review" ? "border-yellow-400/35" : overdue ? "border-red-400/30" : "border-white/10"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start"><div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-semibold text-white/95">{item.title}</h3><Badge label={item.status} />{overdue && <Badge label="Blocked" />}</div>
            {item.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-[12px] leading-relaxed text-white/55">{item.description}</p>}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/40">
              <span>{item.assignedMemberIds.map((id) => nameById.get(id) ?? "Unknown").join(", ")}</span>
              <span className={overdue ? "text-red-400" : ""}>{item.dueDate ? `Due ${item.dueDate}` : "No deadline"}</span>
              <span>{item.hours ?? pod.defaultTaskHours} certified hours</span>
              {item.deliverableUrl && <a href={item.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline">Open deliverable ↗</a>}
            </div>
          </div><div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit ? <Select aria-label={`Status for ${item.title}`} className="min-w-36 py-1.5 text-xs" value={item.status} disabled={actionId === item.id} onChange={(e) => void move(item, e.target.value as PodAssignment["status"])} options={STATUSES} /> :
              isMine && next ? <Btn size="sm" variant="primary" disabled={actionId === item.id} onClick={() => void move(item, next)}>{next === "In Progress" ? "Start work" : "Request review"}</Btn> : null}
            {canEdit && <Btn size="sm" variant="ghost" onClick={() => openEdit(item)}>Edit</Btn>}
          </div></div>
        </article>;
      })}</div>}

    <Modal open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? "Assign work" : "Edit assignment"}>
      <form className="space-y-4" onSubmit={save}>
        <Field label="Assignment" required><Input autoFocus value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} /></Field>
        <Field label="What does done look like?"><TextArea rows={4} placeholder="Describe the deliverable and where it should be shared." value={draft.description} onChange={(e) => setDraft((v) => ({ ...v, description: e.target.value }))} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Due date"><Input type="date" value={draft.dueDate} onChange={(e) => setDraft((v) => ({ ...v, dueDate: e.target.value }))} /></Field>
          <Field label="Service hours"><Input type="number" min="0" step="0.25" value={draft.hours} onChange={(e) => setDraft((v) => ({ ...v, hours: e.target.value }))} /></Field>
          <Field label="Deliverable link"><Input type="url" placeholder="https://…" value={draft.deliverableUrl} onChange={(e) => setDraft((v) => ({ ...v, deliverableUrl: e.target.value }))} /></Field>
        </div>
        <Field label={`Assign to · ${draft.assignedMemberIds.length} selected`} required><div className="flex flex-wrap gap-2 rounded-xl border border-white/20 bg-[#0F1014] p-3">
          {roster.map((member) => { const selected = draft.assignedMemberIds.includes(member.memberId); return <button type="button" key={member.memberId} aria-pressed={selected}
            onClick={() => setDraft((value) => ({ ...value, assignedMemberIds: selected ? value.assignedMemberIds.filter((id) => id !== member.memberId) : [...value.assignedMemberIds, member.memberId] }))}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${selected ? "border-sky-400/45 bg-sky-400/15 text-sky-300" : "border-white/15 text-white/55 hover:border-white/30 hover:text-white"}`}>
            {nameById.get(member.memberId) ?? "Unknown"}{member.role === "lit" ? " · LIT" : ""}</button>; })}
        </div></Field>
        <div className="flex flex-wrap items-center gap-2">
          <Btn type="submit" variant="primary" disabled={saving || !draft.title.trim() || draft.assignedMemberIds.length === 0}>{saving ? "Saving…" : editing === "new" ? "Create assignment" : "Save changes"}</Btn>
          <Btn type="button" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
          {editing && editing !== "new" && canEdit && <Btn type="button" variant="danger" className="sm:ml-auto" onClick={async () => { if (!window.confirm(`Delete “${editing.title}”?`)) return; await deletePodAssignment(editing.id); setEditing(null); }}>Delete</Btn>}
        </div>
      </form>
    </Modal>
  </section>;
}
