"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Table, Empty, StatCard, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBIDs, createBID, updateBID, deleteBID, type BID,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES   = ["Cold Outreach", "Form Sent", "In Conversation", "Active Partner", "Paused", "Dead"];
const BOROUGHS   = ["Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island"];
const PRIORITIES = ["High", "Medium", "Low"];

// Blank form values for creating a new BID record.
const BLANK_FORM: Omit<BID, "id" | "createdAt" | "updatedAt"> = {
  name: "", status: "Cold Outreach", contactName: "", contactEmail: "", phone: "",
  neighborhood: "", borough: "", lastContact: "", nextAction: "", nextActionDate: "",
  tourCompleted: false, notes: "", priority: "Medium", referredBy: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BIDTrackerPage() {
  const [bids, setBids]               = useState<BID[]>([]);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingBID, setEditingBID]   = useState<BID | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  // Subscribe to real-time BID updates; unsubscribe on unmount.
  useEffect(() => subscribeBIDs(setBids), []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingBID(null);
    setModal("create");
  };

  const openEdit = (bid: BID) => {
    setForm({
      name:           bid.name,
      status:         bid.status,
      contactName:    bid.contactName,
      contactEmail:   bid.contactEmail,
      phone:          bid.phone,
      neighborhood:   bid.neighborhood,
      borough:        bid.borough as BID["borough"],
      lastContact:    bid.lastContact,
      nextAction:     bid.nextAction,
      nextActionDate: bid.nextActionDate,
      tourCompleted:  bid.tourCompleted,
      notes:          bid.notes,
      priority:       bid.priority as BID["priority"],
      referredBy:     bid.referredBy,
    });
    setEditingBID(bid);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingBID) {
      await updateBID(editingBID.id, form as Partial<BID>);
    } else {
      await createBID(form as Omit<BID, "id" | "createdAt" | "updatedAt">);
    }
    setModal(null);
  };

  const handleDelete = (id: string) => ask(async () => deleteBID(id));

  // Filter by search text and/or status dropdown.
  const filtered = bids.filter((bid) => {
    const query = search.toLowerCase();
    const matchesSearch = !search
      || bid.name.toLowerCase().includes(query)
      || bid.neighborhood.toLowerCase().includes(query)
      || bid.contactName.toLowerCase().includes(query);
    const matchesStatus = !filterStatus || bid.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total:    bids.length,
    active:   bids.filter(b => b.status === "Active Partner").length,
    pipeline: bids.filter(b => ["Form Sent", "In Conversation"].includes(b.status)).length,
  };

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="BID Tracker"
        subtitle={`${stats.total} BIDs · ${stats.active} active · ${stats.pipeline} in pipeline`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New BID</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total BIDs"      value={stats.total} />
        <StatCard label="Active Partners" value={stats.active} color="text-green-400" />
        <StatCard label="In Pipeline"     value={stats.pipeline} color="text-blue-400" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search BIDs, neighborhoods…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* BID list */}
      <Table
        cols={["BID Name", "Status", "Neighborhood", "Contact", "Next Action", "Priority", "Actions"]}
        rows={filtered.map(bid => [
          <span key="name" className="text-white font-medium">{bid.name}</span>,
          <Badge key="status" label={bid.status} />,
          <span key="neighborhood" className="text-white/50">
            {bid.neighborhood}{bid.borough ? `, ${bid.borough}` : ""}
          </span>,
          <span key="contact" className="text-white/50">{bid.contactName || "—"}</span>,
          <span key="nextAction" className="text-white/50 max-w-[180px] truncate block">{bid.nextAction || "—"}</span>,
          <Badge key="priority" label={bid.priority} />,
          <div key="actions" className="flex gap-2">
            {canEdit && <Btn size="sm" variant="ghost" onClick={() => openEdit(bid)}>Edit</Btn>}
            {canEdit && <Btn size="sm" variant="danger" onClick={() => handleDelete(bid.id)}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && (
        <Empty
          message="No BIDs match your filters."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first BID</Btn> : undefined}
        />
      )}

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "New BID" : "Edit BID"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BID Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Park Slope BID" />
          </Field>
          <Field label="Status">
            <Select options={STATUSES} value={form.status} onChange={e => setField("status", e.target.value)} />
          </Field>
          <Field label="Contact Name">
            <Input value={form.contactName} onChange={e => setField("contactName", e.target.value)} />
          </Field>
          <Field label="Contact Email">
            <Input type="email" value={form.contactEmail} onChange={e => setField("contactEmail", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={e => setField("phone", e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select options={PRIORITIES} value={form.priority} onChange={e => setField("priority", e.target.value)} />
          </Field>
          <Field label="Neighborhood">
            <Input value={form.neighborhood} onChange={e => setField("neighborhood", e.target.value)} />
          </Field>
          <Field label="Borough">
            <Select options={BOROUGHS} value={form.borough} onChange={e => setField("borough", e.target.value)} />
          </Field>
          <Field label="Last Contact Date">
            <Input type="date" value={form.lastContact} onChange={e => setField("lastContact", e.target.value)} />
          </Field>
          <Field label="Next Action Date">
            <Input type="date" value={form.nextActionDate} onChange={e => setField("nextActionDate", e.target.value)} />
          </Field>
          <Field label="Referred By">
            <Input value={form.referredBy} onChange={e => setField("referredBy", e.target.value)} />
          </Field>
          <Field label="Tour Completed">
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="tour"
                checked={form.tourCompleted}
                onChange={e => setField("tourCompleted", e.target.checked)}
                className="accent-[#85CC17] w-4 h-4"
              />
              <label htmlFor="tour" className="text-sm text-white/60">Yes</label>
            </div>
          </Field>
          <div className="col-span-2">
            <Field label="Next Action">
              <Input value={form.nextAction} onChange={e => setField("nextAction", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes">
              <TextArea rows={3} value={form.notes} onChange={e => setField("notes", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingBID ? "Save Changes" : "Create BID"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
