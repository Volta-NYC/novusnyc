"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, StatCard, useConfirm } from "@/components/members/ui";
import { getBIDs, createBID, updateBID, deleteBID, type BID } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const STATUSES = ["Cold Outreach", "Form Sent", "In Conversation", "Active Partner", "Paused", "Dead"];
const BOROUGHS = ["Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island"];
const PRIORITIES = ["High", "Medium", "Low"];
const BLANK: Omit<BID, "id" | "createdAt" | "updatedAt"> = {
  name: "", status: "Cold Outreach", contactName: "", contactEmail: "", phone: "",
  neighborhood: "", borough: "", lastContact: "", nextAction: "", nextActionDate: "",
  tourCompleted: false, notes: "", priority: "Medium", referredBy: "",
};

export default function BIDTrackerPage() {
  const session = getSession();
  const editable = session ? canEdit(session.role) : false;
  const deletable = session ? canDelete(session.role) : false;

  const [bids, setBids] = useState<BID[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<BID | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setBids(getBIDs()); }, []);

  const refresh = () => setBids(getBIDs());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (bid: BID) => {
    setForm({ name: bid.name, status: bid.status, contactName: bid.contactName, contactEmail: bid.contactEmail,
      phone: bid.phone, neighborhood: bid.neighborhood, borough: bid.borough as BID["borough"],
      lastContact: bid.lastContact, nextAction: bid.nextAction, nextActionDate: bid.nextActionDate,
      tourCompleted: bid.tourCompleted, notes: bid.notes, priority: bid.priority as BID["priority"],
      referredBy: bid.referredBy });
    setEditing(bid);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) { updateBID(editing.id, form as Partial<BID>); }
    else { createBID(form as Omit<BID, "id" | "createdAt" | "updatedAt">); }
    refresh();
    setModal(null);
  };

  const handleDelete = (id: string) => ask(() => { deleteBID(id); refresh(); });

  const filtered = bids.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !search || b.name.toLowerCase().includes(q) || b.neighborhood.toLowerCase().includes(q) || b.contactName.toLowerCase().includes(q);
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = { total: bids.length, active: bids.filter(b => b.status === "Active Partner").length, pipeline: bids.filter(b => ["Form Sent", "In Conversation"].includes(b.status)).length };

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="BID Tracker"
        subtitle={`${stats.total} BIDs · ${stats.active} active partners · ${stats.pipeline} in pipeline`}
        action={editable ? <Btn variant="primary" onClick={openCreate}>+ New BID</Btn> : undefined}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total BIDs" value={stats.total} />
        <StatCard label="Active Partners" value={stats.active} color="text-green-400" />
        <StatCard label="In Pipeline" value={stats.pipeline} color="text-blue-400" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search BIDs, neighborhoods…" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[#85CC17]/40">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Table
        cols={["BID Name", "Status", "Neighborhood", "Contact", "Next Action", "Priority", "Actions"]}
        rows={filtered.map(b => [
          <span key="n" className="text-white font-medium">{b.name}</span>,
          <Badge key="s" label={b.status} />,
          <span key="nb" className="text-white/50">{b.neighborhood}{b.borough ? `, ${b.borough}` : ""}</span>,
          <span key="c" className="text-white/50">{b.contactName || "—"}</span>,
          <span key="na" className="text-white/50 max-w-[180px] truncate block">{b.nextAction || "—"}</span>,
          <Badge key="p" label={b.priority} />,
          <div key="a" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {editable && <Btn size="sm" variant="ghost" onClick={() => openEdit(b)}>Edit</Btn>}
            {deletable && <Btn size="sm" variant="danger" onClick={() => handleDelete(b.id)}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && <Empty message="No BIDs match your filters." action={editable ? <Btn variant="primary" onClick={openCreate}>Add first BID</Btn> : undefined} />}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "New BID" : "Edit BID"}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="BID Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Park Slope BID" /></Field>
          <Field label="Status"><Select options={STATUSES} value={form.status} onChange={e => set("status", e.target.value)} /></Field>
          <Field label="Contact Name"><Input value={form.contactName} onChange={e => set("contactName", e.target.value)} /></Field>
          <Field label="Contact Email"><Input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></Field>
          <Field label="Priority"><Select options={PRIORITIES} value={form.priority} onChange={e => set("priority", e.target.value)} /></Field>
          <Field label="Neighborhood"><Input value={form.neighborhood} onChange={e => set("neighborhood", e.target.value)} placeholder="e.g. Park Slope" /></Field>
          <Field label="Borough"><Select options={BOROUGHS} value={form.borough} onChange={e => set("borough", e.target.value)} /></Field>
          <Field label="Last Contact Date"><Input type="date" value={form.lastContact} onChange={e => set("lastContact", e.target.value)} /></Field>
          <Field label="Next Action Date"><Input type="date" value={form.nextActionDate} onChange={e => set("nextActionDate", e.target.value)} /></Field>
          <Field label="Referred By"><Input value={form.referredBy} onChange={e => set("referredBy", e.target.value)} /></Field>
          <Field label="Tour Completed">
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="tour" checked={form.tourCompleted} onChange={e => set("tourCompleted", e.target.checked)} className="accent-[#85CC17] w-4 h-4" />
              <label htmlFor="tour" className="text-sm text-white/60">Yes</label>
            </div>
          </Field>
          <div className="col-span-2"><Field label="Next Action"><Input value={form.nextAction} onChange={e => set("nextAction", e.target.value)} placeholder="What happens next?" /></Field></div>
          <div className="col-span-2"><Field label="Notes"><TextArea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save Changes" : "Create BID"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
