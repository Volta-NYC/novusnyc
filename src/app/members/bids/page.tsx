"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Table, Empty, StatCard, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBIDs, createBID, updateBID, deleteBID,
  addBIDTimelineEntry, deleteBIDTimelineEntry,
  type BID,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES   = ["Active Partner", "In Conversation", "Materials Sent", "Cold Outreach", "Paused", "Dead"];
const BOROUGHS   = ["Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island"];
const PRIORITIES = ["High", "Medium", "Low"];
const TIMELINE_TYPES = ["Email", "Call", "Tour", "Meeting", "Outreach", "Other"];

// Blank form values for creating a new BID record.
const BLANK_FORM: Omit<BID, "id" | "createdAt" | "updatedAt" | "timeline"> = {
  name: "", status: "Cold Outreach", contactName: "", contactEmail: "", phone: "",
  borough: "", nextAction: "", notes: "", priority: "Medium",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BIDTrackerPage() {
  const [bids, setBids]               = useState<BID[]>([]);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingBID, setEditingBID]   = useState<BID | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [sortCol, setSortCol]         = useState(1);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");

  // Timeline entry form state
  const [tlDate, setTlDate]   = useState(() => new Date().toISOString().split("T")[0]);
  const [tlType, setTlType]   = useState("Email");
  const [tlNote, setTlNote]   = useState("");
  const [tlSaving, setTlSaving] = useState(false);

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
      name:         bid.name,
      status:       bid.status,
      contactName:  bid.contactName,
      contactEmail: bid.contactEmail,
      phone:        bid.phone,
      borough:      bid.borough,
      nextAction:   bid.nextAction,
      notes:        bid.notes,
      priority:     bid.priority as BID["priority"],
    });
    setEditingBID(bid);
    setTlDate(new Date().toISOString().split("T")[0]);
    setTlType("Email");
    setTlNote("");
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingBID) {
      await updateBID(editingBID.id, form as Partial<BID>);
    } else {
      await createBID(form as Omit<BID, "id" | "createdAt" | "updatedAt" | "timeline">);
    }
    setModal(null);
  };

  const handleDelete = (id: string) => ask(async () => deleteBID(id));

  const handleAddTimeline = async () => {
    if (!editingBID || !tlNote.trim()) return;
    setTlSaving(true);
    await addBIDTimelineEntry(editingBID.id, {
      date: tlDate,
      type: tlType,
      note: tlNote.trim(),
      createdAt: new Date().toISOString(),
    });
    setTlNote("");
    setTlSaving(false);
  };

  const handleDeleteTimeline = (entryId: string) => {
    if (!editingBID) return;
    ask(async () => deleteBIDTimelineEntry(editingBID.id, entryId));
  };

  // Build timeline array from the nested Firebase object, newest first.
  const getTimeline = (bid: BID | null) => {
    if (!bid?.timeline) return [];
    return Object.entries(bid.timeline)
      .map(([id, entry]) => ({ ...entry, id }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  // The editingBID from state is stale — get the live version from bids array.
  const liveBID = editingBID ? bids.find(b => b.id === editingBID.id) ?? editingBID : null;

  // Filter by search text.
  const filtered = bids.filter((bid) => {
    const query = search.toLowerCase();
    return !search
      || bid.name.toLowerCase().includes(query)
      || bid.borough.toLowerCase().includes(query)
      || bid.contactName.toLowerCase().includes(query);
  });

  const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  const STATUS_ORDER: Record<string, number>   = { "Active Partner": 0, "In Conversation": 1, "Materials Sent": 2, "Cold Outreach": 3, "Paused": 4, "Dead": 5 };
  const handleSort = (i: number) => {
    if (sortCol === i) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(i); setSortDir("asc"); }
  };
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 0: cmp = a.name.localeCompare(b.name); break;
      case 1: cmp = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3); break;
      case 2: cmp = (a.borough || "").localeCompare(b.borough || ""); break;
      case 3: cmp = (a.contactName || "").localeCompare(b.contactName || ""); break;
      case 4: cmp = (a.nextAction || a.notes || "").localeCompare(b.nextAction || b.notes || ""); break;
      case 5: cmp = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1); break;
      default: return 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const stats = {
    total:    bids.length,
    active:   bids.filter(b => b.status === "Active Partner").length,
    pipeline: bids.filter(b => ["Materials Sent", "In Conversation"].includes(b.status)).length,
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
        <SearchBar value={search} onChange={setSearch} placeholder="Search BIDs, boroughs…" />
      </div>

      {/* BID list */}
      <Table
        cols={["BID Name", "Status", "Borough", "Contact", "Notes / Next Action", "Priority", "Actions"]}
        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} sortableCols={[0,1,2,3,4,5]}
        rows={sorted.map(bid => [
          <span key="name" className="text-white font-medium">{bid.name}</span>,
          <Badge key="status" label={bid.status} />,
          <span key="borough" className="text-white/50">{bid.borough || "—"}</span>,
          <span key="contact" className="text-white/50">{bid.contactName || "—"}</span>,
          <span key="notes" className="text-white/50 max-w-[200px] truncate block">{bid.nextAction || bid.notes || "—"}</span>,
          <Badge key="priority" label={bid.priority} />,
          <div key="actions" className="flex gap-2">
            {canEdit && <Btn size="sm" variant="secondary" onClick={() => openEdit(bid)}>Edit</Btn>}
            {canEdit && <Btn size="sm" variant="danger" onClick={() => handleDelete(bid.id)}>Delete</Btn>}
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
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">

          {/* Form fields */}
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
            <Field label="Borough">
              <Select options={["", ...BOROUGHS]} value={form.borough} onChange={e => setField("borough", e.target.value)} />
            </Field>
            <div />
            <div className="col-span-2">
              <Field label="Notes / Next Action">
                <TextArea rows={3} value={form.nextAction} onChange={e => setField("nextAction", e.target.value)} placeholder="Next steps, context, notes…" />
              </Field>
            </div>
          </div>

          {/* Timeline section — only shown when editing an existing BID */}
          {modal === "edit" && (
            <div className="border-t border-white/8 pt-4">
              <h3 className="font-display font-bold text-white text-sm mb-3">Activity Timeline</h3>

              {/* Existing timeline entries */}
              <div className="space-y-2 mb-4">
                {getTimeline(liveBID).length === 0 ? (
                  <p className="text-white/25 text-xs font-body">No activity logged yet.</p>
                ) : (
                  getTimeline(liveBID).map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 bg-[#0F1014] border border-white/5 rounded-lg px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider bg-white/8 px-1.5 py-0.5 rounded">{entry.type}</span>
                          <span className="text-[11px] text-white/30 font-body">{entry.date}</span>
                        </div>
                        <p className="text-white/70 text-sm font-body">{entry.note}</p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteTimeline(entry.id)}
                          className="text-white/15 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add new entry */}
              {canEdit && (
                <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-3 space-y-2">
                  <p className="text-white/40 text-xs font-body font-medium">Log activity</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tlType}
                      onChange={e => setTlType(e.target.value)}
                      className="bg-[#0F1014] border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none"
                    >
                      {TIMELINE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input
                      type="date"
                      value={tlDate}
                      onChange={e => setTlDate(e.target.value)}
                      className="bg-[#0F1014] border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <textarea
                    value={tlNote}
                    onChange={e => setTlNote(e.target.value)}
                    placeholder="What happened? (e.g. Sent intro email, Completed tour of district…)"
                    rows={2}
                    className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none resize-none font-body"
                  />
                  <Btn variant="primary" onClick={handleAddTimeline} disabled={tlSaving || !tlNote.trim()}>
                    {tlSaving ? "Saving…" : "+ Log Entry"}
                  </Btn>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingBID ? "Save Changes" : "Create BID"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
