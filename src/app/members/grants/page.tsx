"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, StatCard, TagInput, useConfirm } from "@/components/members/ui";
import { getGrants, createGrant, updateGrant, deleteGrant, type Grant } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const STATUSES = ["Researched", "Application In Progress", "Submitted", "Awarded", "Rejected", "Cycle Closed"];
const CATEGORIES = ["Government", "Foundation", "Corporate", "CDFI", "Other"];
const LIKELIHOODS = ["High", "Medium", "Low"];
const FREQUENCIES = ["Annual", "Biannual", "Rolling", "One-Time"];

const BLANK: Omit<Grant, "id" | "createdAt"> = {
  name: "", funder: "", amount: "", deadline: "", businessIds: [], neighborhoodFocus: [],
  category: "Government", status: "Researched", assignedResearcher: "", likelihood: "Medium",
  requirements: "", applicationUrl: "", notes: "", cycleFrequency: "Annual",
};

const NEIGHBORHOODS = ["Park Slope", "Sunnyside", "Chinatown", "LIC", "Cypress Hills", "Flatbush", "Mott Haven", "Flushing", "Bayside"];

export default function GrantsPage() {
  const session = getSession()!;
  const editable = canEdit(session.role);
  const deletable = canDelete(session.role);

  const [grants, setGrants] = useState<Grant[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Grant | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setGrants(getGrants()); }, []);
  const refresh = () => setGrants(getGrants());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (g: Grant) => {
    setForm({ name: g.name, funder: g.funder, amount: g.amount, deadline: g.deadline,
      businessIds: g.businessIds, neighborhoodFocus: g.neighborhoodFocus, category: g.category,
      status: g.status, assignedResearcher: g.assignedResearcher, likelihood: g.likelihood,
      requirements: g.requirements, applicationUrl: g.applicationUrl, notes: g.notes, cycleFrequency: g.cycleFrequency });
    setEditing(g);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateGrant(editing.id, form as Partial<Grant>);
    else createGrant(form as Omit<Grant, "id" | "createdAt">);
    refresh();
    setModal(null);
  };

  const filtered = grants.filter(g =>
    (!search || g.name.toLowerCase().includes(search.toLowerCase()) || g.funder.toLowerCase().includes(search.toLowerCase()))
    && (!filterStatus || g.status === filterStatus)
  );

  const awarded = grants.filter(g => g.status === "Awarded");

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Grant Library"
        subtitle={`${grants.length} grants tracked · ${awarded.length} awarded`}
        action={editable ? <Btn variant="primary" onClick={openCreate}>+ New Grant</Btn> : undefined}
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Grants" value={grants.length} />
        <StatCard label="In Progress" value={grants.filter(g => g.status === "Application In Progress").length} color="text-blue-400" />
        <StatCard label="Submitted" value={grants.filter(g => g.status === "Submitted").length} color="text-cyan-400" />
        <StatCard label="Awarded" value={awarded.length} color="text-yellow-400" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search grants, funders…" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Table
        cols={["Grant Name", "Funder", "Amount", "Deadline", "Status", "Likelihood", "Researcher", "Actions"]}
        rows={filtered.map(g => [
          <span key="n" className="text-white font-medium">{g.name}</span>,
          <span key="f" className="text-white/60">{g.funder}</span>,
          <span key="a" className="text-[#85CC17] font-mono text-sm">{g.amount || "—"}</span>,
          <span key="d" className="text-white/40">{g.deadline || "—"}</span>,
          <Badge key="s" label={g.status} />,
          <Badge key="l" label={g.likelihood} />,
          <span key="r" className="text-white/50">{g.assignedResearcher || "—"}</span>,
          <div key="ac" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {editable && <Btn size="sm" variant="ghost" onClick={() => openEdit(g)}>Edit</Btn>}
            {deletable && <Btn size="sm" variant="danger" onClick={() => ask(() => { deleteGrant(g.id); refresh(); })}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && <Empty message="No grants found." action={editable ? <Btn variant="primary" onClick={openCreate}>Add first grant</Btn> : undefined} />}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Grant" : "New Grant"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="col-span-2"><Field label="Grant Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} /></Field></div>
          <Field label="Funder / Organization"><Input value={form.funder} onChange={e => set("funder", e.target.value)} /></Field>
          <Field label="Amount"><Input value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="e.g. $10,000" /></Field>
          <Field label="Deadline"><Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} /></Field>
          <Field label="Category"><Select options={CATEGORIES} value={form.category} onChange={e => set("category", e.target.value)} /></Field>
          <Field label="Status"><Select options={STATUSES} value={form.status} onChange={e => set("status", e.target.value)} /></Field>
          <Field label="Likelihood"><Select options={LIKELIHOODS} value={form.likelihood} onChange={e => set("likelihood", e.target.value)} /></Field>
          <Field label="Cycle Frequency"><Select options={FREQUENCIES} value={form.cycleFrequency} onChange={e => set("cycleFrequency", e.target.value)} /></Field>
          <Field label="Assigned Researcher"><Input value={form.assignedResearcher} onChange={e => set("assignedResearcher", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Application URL"><Input value={form.applicationUrl} onChange={e => set("applicationUrl", e.target.value)} placeholder="https://" /></Field></div>
          <div className="col-span-2">
            <Field label="Neighborhood Focus">
              <TagInput values={form.neighborhoodFocus} onChange={v => set("neighborhoodFocus", v)} options={NEIGHBORHOODS} />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Requirements"><TextArea rows={3} value={form.requirements} onChange={e => set("requirements", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Notes"><TextArea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save" : "Create Grant"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
