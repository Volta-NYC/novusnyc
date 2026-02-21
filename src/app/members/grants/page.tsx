"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Table, Empty, StatCard, TagInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeGrants, createGrant, updateGrant, deleteGrant, type Grant,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES     = ["Researched", "Application In Progress", "Submitted", "Awarded", "Rejected", "Cycle Closed"];
const CATEGORIES   = ["Government", "Foundation", "Corporate", "CDFI", "Other"];
const LIKELIHOODS  = ["High", "Medium", "Low"];
const FREQUENCIES  = ["Annual", "Biannual", "Rolling", "One-Time"];
const NEIGHBORHOODS = [
  "Park Slope", "Sunnyside", "Chinatown", "LIC", "Cypress Hills",
  "Flatbush", "Mott Haven", "Flushing", "Bayside",
];

// Blank form values for creating a new grant.
const BLANK_FORM: Omit<Grant, "id" | "createdAt"> = {
  name: "", funder: "", amount: "", deadline: "", businessIds: [], neighborhoodFocus: [],
  category: "Government", status: "Researched", assignedResearcher: "", likelihood: "Medium",
  requirements: "", applicationUrl: "", notes: "", cycleFrequency: "Annual",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function GrantsPage() {
  const [grants, setGrants]             = useState<Grant[]>([]);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal]               = useState<"create" | "edit" | null>(null);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [form, setForm]                 = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  // Subscribe to real-time grant updates; unsubscribe on unmount.
  useEffect(() => subscribeGrants(setGrants), []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingGrant(null);
    setModal("create");
  };

  const openEdit = (grant: Grant) => {
    setForm({
      name:               grant.name,
      funder:             grant.funder,
      amount:             grant.amount,
      deadline:           grant.deadline,
      // Guard against undefined: Firebase omits empty arrays when storing.
      businessIds:        grant.businessIds ?? [],
      neighborhoodFocus:  grant.neighborhoodFocus ?? [],
      category:           grant.category,
      status:             grant.status,
      assignedResearcher: grant.assignedResearcher,
      likelihood:         grant.likelihood,
      requirements:       grant.requirements,
      applicationUrl:     grant.applicationUrl,
      notes:              grant.notes,
      cycleFrequency:     grant.cycleFrequency,
    });
    setEditingGrant(grant);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingGrant) {
      await updateGrant(editingGrant.id, form as Partial<Grant>);
    } else {
      await createGrant(form as Omit<Grant, "id" | "createdAt">);
    }
    setModal(null);
  };

  // Filter by search text and/or status dropdown.
  const filtered = grants.filter(grant =>
    (!search
      || grant.name.toLowerCase().includes(search.toLowerCase())
      || grant.funder.toLowerCase().includes(search.toLowerCase()))
    && (!filterStatus || grant.status === filterStatus)
  );

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Grant Library"
        subtitle={`${grants.length} grants · ${grants.filter(g => g.status === "Awarded").length} awarded`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Grant</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total"       value={grants.length} />
        <StatCard label="In Progress" value={grants.filter(g => g.status === "Application In Progress").length} color="text-blue-400" />
        <StatCard label="Submitted"   value={grants.filter(g => g.status === "Submitted").length} color="text-cyan-400" />
        <StatCard label="Awarded"     value={grants.filter(g => g.status === "Awarded").length} color="text-yellow-400" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search grants, funders…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Grant list */}
      <Table
        cols={["Grant Name", "Funder", "Amount", "Deadline", "Status", "Likelihood", "Researcher", "Actions"]}
        rows={filtered.map(grant => [
          <span key="name" className="text-white font-medium">{grant.name}</span>,
          <span key="funder" className="text-white/60">{grant.funder}</span>,
          <span key="amount" className="text-[#85CC17] font-mono text-sm">{grant.amount || "—"}</span>,
          <span key="deadline" className="text-white/40">{grant.deadline || "—"}</span>,
          <Badge key="status" label={grant.status} />,
          <Badge key="likelihood" label={grant.likelihood} />,
          <span key="researcher" className="text-white/50">{grant.assignedResearcher || "—"}</span>,
          <div key="actions" className="flex gap-2">
            {canEdit && <Btn size="sm" variant="ghost" onClick={() => openEdit(grant)}>Edit</Btn>}
            {canEdit && <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteGrant(grant.id))}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && (
        <Empty
          message="No grants found."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first grant</Btn> : undefined}
        />
      )}

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingGrant ? "Edit Grant" : "New Grant"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="col-span-2">
            <Field label="Grant Name" required>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} />
            </Field>
          </div>
          <Field label="Funder">
            <Input value={form.funder} onChange={e => setField("funder", e.target.value)} />
          </Field>
          <Field label="Amount">
            <Input value={form.amount} onChange={e => setField("amount", e.target.value)} placeholder="e.g. $10,000" />
          </Field>
          <Field label="Deadline">
            <Input type="date" value={form.deadline} onChange={e => setField("deadline", e.target.value)} />
          </Field>
          <Field label="Category">
            <Select options={CATEGORIES} value={form.category} onChange={e => setField("category", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select options={STATUSES} value={form.status} onChange={e => setField("status", e.target.value)} />
          </Field>
          <Field label="Likelihood">
            <Select options={LIKELIHOODS} value={form.likelihood} onChange={e => setField("likelihood", e.target.value)} />
          </Field>
          <Field label="Cycle Frequency">
            <Select options={FREQUENCIES} value={form.cycleFrequency} onChange={e => setField("cycleFrequency", e.target.value)} />
          </Field>
          <Field label="Assigned Researcher">
            <Input value={form.assignedResearcher} onChange={e => setField("assignedResearcher", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Application URL">
              <Input value={form.applicationUrl} onChange={e => setField("applicationUrl", e.target.value)} placeholder="https://" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Neighborhood Focus">
              <TagInput values={form.neighborhoodFocus} onChange={v => setField("neighborhoodFocus", v)} options={NEIGHBORHOODS} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Requirements">
              <TextArea rows={3} value={form.requirements} onChange={e => setField("requirements", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes">
              <TextArea rows={2} value={form.notes} onChange={e => setField("notes", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingGrant ? "Save" : "Create Grant"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
