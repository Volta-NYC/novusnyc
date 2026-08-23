"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Badge, Btn, Empty, Field, Input, LoadError, Modal, SearchBar, Select, TextArea,
} from "@/components/members/ui";
import {
  OUTREACH_STATUSES,
  createPodOutreachRecord,
  deletePodOutreachRecord,
  subscribePodOutreachRecords,
  updatePodOutreachRecord,
  type OutreachStatus,
  type OutreachSubjectType,
  type Pod,
  type PodMember,
  type PodOutreachRecord,
} from "@/lib/members/storage";

type Draft = {
  subjectType: OutreachSubjectType;
  subjectName: string;
  contactName: string;
  contactEmail: string;
  sourceUrl: string;
  ownerMemberId: string;
  status: OutreachStatus;
  lastContactOn: string;
  followUpOn: string;
  notes: string;
};

function defaultSubjectType(pod: Pod): OutreachSubjectType {
  return /ambassador/i.test(pod.name) ? "School" : "Business";
}

function emptyDraft(pod: Pod): Draft {
  return {
    subjectType: defaultSubjectType(pod), subjectName: "", contactName: "", contactEmail: "",
    sourceUrl: "", ownerMemberId: "", status: "Researching", lastContactOn: "", followUpOn: "", notes: "",
  };
}

function toDraft(row: PodOutreachRecord): Draft {
  return {
    subjectType: row.subjectType, subjectName: row.subjectName, contactName: row.contactName,
    contactEmail: row.contactEmail, sourceUrl: row.sourceUrl, ownerMemberId: row.ownerMemberId ?? "",
    status: row.status, lastContactOn: row.lastContactOn ?? "", followUpOn: row.followUpOn ?? "", notes: row.notes,
  };
}

function normalizedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function OutreachTracker({ pod, roster, nameById, canEdit }: {
  pod: Pod;
  roster: PodMember[];
  nameById: Map<string, string>;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<PodOutreachRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | OutreachStatus>("All");
  const [editing, setEditing] = useState<PodOutreachRecord | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(pod));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => subscribePodOutreachRecords((next, state) => {
    setRows(next);
    setLoadError(state.error);
  }), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => row.podId === pod.id && !row.deletedAt)
      .filter((row) => status === "All" || row.status === status)
      .filter((row) => !q || [row.subjectName, row.subjectType, row.contactName, row.contactEmail, row.notes]
        .some((value) => value.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.status === "Closed" && b.status !== "Closed") return 1;
        if (b.status === "Closed" && a.status !== "Closed") return -1;
        return (a.followUpOn ?? "9999-12-31").localeCompare(b.followUpOn ?? "9999-12-31");
      });
  }, [pod.id, query, rows, status]);

  const openNew = () => {
    setDraft(emptyDraft(pod));
    setSaveError("");
    setEditing("new");
  };

  const openEdit = (row: PodOutreachRecord) => {
    setDraft(toDraft(row));
    setSaveError("");
    setEditing(row);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.subjectName.trim()) return;
    setSaving(true);
    setSaveError("");
    const value = {
      podId: pod.id,
      subjectType: draft.subjectType,
      subjectName: draft.subjectName.trim(),
      contactName: draft.contactName.trim(),
      contactEmail: draft.contactEmail.trim().toLowerCase(),
      sourceUrl: normalizedUrl(draft.sourceUrl),
      ownerMemberId: draft.ownerMemberId || null,
      status: draft.status,
      lastContactOn: draft.lastContactOn || null,
      followUpOn: draft.followUpOn || null,
      notes: draft.notes.trim(),
    };
    try {
      if (editing === "new") await createPodOutreachRecord(value);
      else if (editing) await updatePodOutreachRecord(editing.id, value);
      setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The outreach record was not saved.");
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const openCount = (rows ?? []).filter((row) => row.podId === pod.id && !row.deletedAt && row.status !== "Closed").length;
  const dueCount = (rows ?? []).filter((row) => row.podId === pod.id && !row.deletedAt && row.status !== "Closed" && row.followUpOn && row.followUpOn <= today).length;

  return (
    <section aria-labelledby="outreach-title">
      <div className="mb-4 rounded-xl border border-sky-400/25 bg-sky-400/[0.06] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">Outreach workspace</p>
            <h2 id="outreach-title" className="mt-1 font-display text-lg font-semibold text-white">Contacts and follow-ups</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/50">
              Keep research, contact details, responses, calls, and handoffs in one shared queue. {openCount} open · {dueCount} due for follow-up.
            </p>
          </div>
          {canEdit && <Btn variant="primary" onClick={openNew}>+ Add outreach</Btn>}
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search organization, contact, or notes…" />
        <Select value={status} onChange={(event) => setStatus(event.target.value as "All" | OutreachStatus)}>
          <option value="All">All stages</option>
          {OUTREACH_STATUSES.map((item) => <option key={item}>{item}</option>)}
        </Select>
      </div>

      {loadError ? <LoadError message={loadError} onRetry={() => window.location.reload()} /> : rows === null ? (
        <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      ) : visible.length === 0 ? (
        <Empty
          message={query || status !== "All" ? "No outreach records match those filters." : "No outreach has been added yet."}
          action={canEdit && !query && status === "All" ? <Btn variant="primary" onClick={openNew}>Add the first contact</Btn> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#15181F]">
          <div className="hidden grid-cols-[minmax(210px,1.3fr)_130px_150px_120px_140px] gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 lg:grid">
            <span>Organization</span><span>Type</span><span>Owner</span><span>Follow-up</span><span>Stage</span>
          </div>
          {visible.map((row) => {
            const due = !!row.followUpOn && row.followUpOn <= today && row.status !== "Closed";
            return <button key={row.id} type="button" onClick={() => canEdit && openEdit(row)} className="grid w-full gap-2 border-b border-white/7 px-4 py-3 text-left last:border-0 hover:bg-white/[0.035] lg:grid-cols-[minmax(210px,1.3fr)_130px_150px_120px_140px] lg:items-center lg:gap-3">
              <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-white/90">{row.subjectName}</span><span className="mt-0.5 block truncate text-[11px] text-white/40">{row.contactName || row.contactEmail || "Contact not recorded"}</span></span>
              <span className="text-[11px] text-white/55">{row.subjectType}</span>
              <span className="truncate text-[11px] text-white/55">{row.ownerMemberId ? nameById.get(row.ownerMemberId) ?? "Unknown" : "Unassigned"}</span>
              <span className={`font-mono text-[11px] tabular-nums ${due ? "font-semibold text-red-400" : "text-white/60"}`}>{row.followUpOn || "—"}</span>
              <span><Badge label={row.status} /></span>
            </button>;
          })}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => !saving && setEditing(null)} title={editing === "new" ? "Add outreach" : "Edit outreach"}>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Record type"><Select value={draft.subjectType} onChange={(event) => setDraft((value) => ({ ...value, subjectType: event.target.value as OutreachSubjectType }))} options={["Business", "School", "Partner Organization"]} /></Field>
            <Field label="Organization or school" required><Input autoFocus value={draft.subjectName} onChange={(event) => setDraft((value) => ({ ...value, subjectName: event.target.value }))} /></Field>
            <Field label="Contact name"><Input value={draft.contactName} onChange={(event) => setDraft((value) => ({ ...value, contactName: event.target.value }))} /></Field>
            <Field label="Contact email"><Input type="email" value={draft.contactEmail} onChange={(event) => setDraft((value) => ({ ...value, contactEmail: event.target.value }))} /></Field>
            <Field label="Owner"><Select value={draft.ownerMemberId} onChange={(event) => setDraft((value) => ({ ...value, ownerMemberId: event.target.value }))}><option value="">Unassigned</option>{roster.filter((member) => !member.leftAt).map((member) => <option key={member.memberId} value={member.memberId}>{nameById.get(member.memberId) ?? "Unknown"}</option>)}</Select></Field>
            <Field label="Stage"><Select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value as OutreachStatus }))} options={OUTREACH_STATUSES} /></Field>
            <Field label="Last contacted"><Input type="date" value={draft.lastContactOn} onChange={(event) => setDraft((value) => ({ ...value, lastContactOn: event.target.value }))} /></Field>
            <Field label="Follow up on"><Input type="date" value={draft.followUpOn} onChange={(event) => setDraft((value) => ({ ...value, followUpOn: event.target.value }))} /></Field>
          </div>
          <Field label="Source or website"><Input type="url" placeholder="https://…" value={draft.sourceUrl} onChange={(event) => setDraft((value) => ({ ...value, sourceUrl: event.target.value }))} /></Field>
          <Field label="Notes"><TextArea rows={4} placeholder="What was sent, response, call outcome, and next step…" value={draft.notes} onChange={(event) => setDraft((value) => ({ ...value, notes: event.target.value }))} /></Field>
          {saveError && <p role="alert" className="text-xs text-red-400">{saveError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Btn type="submit" variant="primary" disabled={saving || !draft.subjectName.trim()}>{saving ? "Saving…" : "Save outreach"}</Btn>
            <Btn type="button" variant="ghost" disabled={saving} onClick={() => setEditing(null)}>Cancel</Btn>
            {editing && editing !== "new" && canEdit && <Btn type="button" variant="danger" className="sm:ml-auto" onClick={async () => { if (!window.confirm(`Remove “${editing.subjectName}” from this tracker?`)) return; await deletePodOutreachRecord(editing.id); setEditing(null); }}>Remove</Btn>}
          </div>
        </form>
      </Modal>
    </section>
  );
}
