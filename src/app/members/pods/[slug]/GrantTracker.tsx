"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Badge, Btn, Empty, Field, Input, LoadError, Modal, SearchBar, Select, TextArea,
} from "@/components/members/ui";
import {
  GRANT_STATUSES,
  createGrantOpportunity,
  deleteGrantOpportunity,
  subscribeGrantOpportunities,
  updateGrantOpportunity,
  type GrantOpportunity,
  type GrantStatus,
  type Pod,
} from "@/lib/members/storage";

type Draft = {
  name: string;
  funder: string;
  url: string;
  deadline: string;
  amount: string;
  geography: string;
  eligibility: string;
  focusAreas: string;
  status: GrantStatus;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "", funder: "", url: "", deadline: "", amount: "", geography: "NYC",
  eligibility: "", focusAreas: "", status: "Researching", notes: "",
};

function toDraft(item: GrantOpportunity): Draft {
  return {
    name: item.name,
    funder: item.funder,
    url: item.url,
    deadline: item.deadline ?? "",
    amount: item.amount,
    geography: item.geography,
    eligibility: item.eligibility,
    focusAreas: item.focusAreas.join(", "),
    status: item.status,
    notes: item.notes,
  };
}

function normalizedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function GrantTracker({ pod, canEdit }: { pod: Pod; canEdit: boolean }) {
  const [rows, setRows] = useState<GrantOpportunity[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | GrantStatus>("All");
  const [editing, setEditing] = useState<GrantOpportunity | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => subscribeGrantOpportunities((next, state) => {
    setRows(next);
    setLoadError(state.error);
  }), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => row.podId === pod.id && !row.deletedAt)
      .filter((row) => filter === "All" || row.status === filter)
      .filter((row) => !q || [
        row.name, row.funder, row.amount, row.geography, row.eligibility,
        row.focusAreas.join(" "), row.notes,
      ].some((value) => value.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.status === "Closed" && b.status !== "Closed") return 1;
        if (b.status === "Closed" && a.status !== "Closed") return -1;
        return (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31");
      });
  }, [filter, pod.id, query, rows]);

  const openNew = () => {
    setDraft(EMPTY_DRAFT);
    setSaveError("");
    setEditing("new");
  };

  const openEdit = (item: GrantOpportunity) => {
    setDraft(toDraft(item));
    setSaveError("");
    setEditing(item);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    setSaveError("");
    const value = {
      podId: pod.id,
      name: draft.name.trim(),
      funder: draft.funder.trim(),
      url: normalizedUrl(draft.url),
      deadline: draft.deadline || null,
      amount: draft.amount.trim(),
      geography: draft.geography.trim(),
      eligibility: draft.eligibility.trim(),
      focusAreas: draft.focusAreas.split(",").map((v) => v.trim()).filter(Boolean),
      status: draft.status,
      notes: draft.notes.trim(),
      createdBy: null,
    };
    try {
      if (editing === "new") await createGrantOpportunity(value);
      else if (editing) await updateGrantOpportunity(editing.id, value);
      setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The grant was not saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="grant-tracker-title">
      <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">Finance workspace</p>
            <h2 id="grant-tracker-title" className="mt-1 font-display text-lg font-semibold text-white">Master grant tracker</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/50">
              One filterable source for grants that Novus can share with small businesses. Keep eligibility and deadlines here instead of rebuilding a spreadsheet for every cycle.
            </p>
          </div>
          {canEdit && <Btn variant="primary" onClick={openNew}>+ Add grant</Btn>}
        </div>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search funder, eligibility, focus area…" />
        <Select value={filter} onChange={(e) => setFilter(e.target.value as "All" | GrantStatus)}>
          <option value="All">All stages</option>
          {GRANT_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </Select>
      </div>

      {loadError ? (
        <LoadError message={loadError} onRetry={() => window.location.reload()} />
      ) : rows === null ? (
        <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      ) : visible.length === 0 ? (
        <Empty
          message={query || filter !== "All" ? "No grants match those filters." : "No grants have been added yet."}
          action={canEdit && !query && filter === "All" ? <Btn variant="primary" onClick={openNew}>Add the first grant</Btn> : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#15181F]">
          <div className="hidden grid-cols-[minmax(210px,1.2fr)_minmax(140px,.8fr)_110px_120px_130px] gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 lg:grid">
            <span>Opportunity</span><span>Fit</span><span>Amount</span><span>Deadline</span><span>Stage</span>
          </div>
          {visible.map((item) => {
            const overdue = !!item.deadline && item.deadline < new Date().toISOString().slice(0, 10) && item.status !== "Closed";
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => canEdit && openEdit(item)}
                className="grid w-full gap-2 border-b border-white/7 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.035] lg:grid-cols-[minmax(210px,1.2fr)_minmax(140px,.8fr)_110px_120px_130px] lg:items-center lg:gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white/90">{item.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/40">{item.funder || "Funder not recorded"}</span>
                </span>
                <span className="text-[11px] text-white/55">
                  {[item.geography, item.focusAreas.slice(0, 2).join(" · ")].filter(Boolean).join(" · ") || "Fit not recorded"}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-white/70">{item.amount || "—"}</span>
                <span className={`font-mono text-[11px] tabular-nums ${overdue ? "text-red-400" : "text-white/60"}`}>
                  {item.deadline || "Rolling"}
                </span>
                <span><Badge label={item.status} /></span>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === "new" ? "Add grant opportunity" : "Edit grant opportunity"}
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opportunity" required><Input autoFocus value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} /></Field>
            <Field label="Funder"><Input value={draft.funder} onChange={(e) => setDraft((v) => ({ ...v, funder: e.target.value }))} /></Field>
            <Field label="Deadline"><Input type="date" value={draft.deadline} onChange={(e) => setDraft((v) => ({ ...v, deadline: e.target.value }))} /></Field>
            <Field label="Amount"><Input placeholder="$5,000–$25,000" value={draft.amount} onChange={(e) => setDraft((v) => ({ ...v, amount: e.target.value }))} /></Field>
            <Field label="Geography"><Input placeholder="NYC, Queens, nationwide…" value={draft.geography} onChange={(e) => setDraft((v) => ({ ...v, geography: e.target.value }))} /></Field>
            <Field label="Stage"><Select value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value as GrantStatus }))} options={GRANT_STATUSES} /></Field>
          </div>
          <Field label="Link"><Input type="url" placeholder="https://…" value={draft.url} onChange={(e) => setDraft((v) => ({ ...v, url: e.target.value }))} /></Field>
          <Field label="Focus areas"><Input placeholder="Restaurants, storefronts, women-owned…" value={draft.focusAreas} onChange={(e) => setDraft((v) => ({ ...v, focusAreas: e.target.value }))} /></Field>
          <Field label="Eligibility"><TextArea rows={3} value={draft.eligibility} onChange={(e) => setDraft((v) => ({ ...v, eligibility: e.target.value }))} /></Field>
          <Field label="Notes"><TextArea rows={3} value={draft.notes} onChange={(e) => setDraft((v) => ({ ...v, notes: e.target.value }))} /></Field>
          {saveError && <p role="alert" className="text-xs text-red-400">{saveError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Btn type="submit" variant="primary" disabled={saving || !draft.name.trim()}>{saving ? "Saving…" : "Save grant"}</Btn>
            <Btn type="button" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
            {editing && editing !== "new" && canEdit && (
              <Btn
                type="button"
                variant="danger"
                className="sm:ml-auto"
                onClick={async () => {
                  if (!window.confirm(`Remove “${editing.name}” from the tracker?`)) return;
                  await deleteGrantOpportunity(editing.id);
                  setEditing(null);
                }}
              >Remove</Btn>
            )}
          </div>
        </form>
      </Modal>
    </section>
  );
}
