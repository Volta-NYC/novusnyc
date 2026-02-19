"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, StatCard, TagInput, useConfirm } from "@/components/members/ui";
import { getBusinesses, createBusiness, updateBusiness, deleteBusiness, type Business } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const STATUSES = ["Not Started", "Discovery", "Active", "On Hold", "Complete"];
const SERVICES = ["Website", "Social Media", "Grant Writing", "SEO", "Financial Analysis", "Digital Payments"];
const PRIORITIES = ["High", "Medium", "Low"];
const LANGS = ["English", "Spanish", "Chinese", "Korean", "Arabic", "French", "Other"];

const BLANK: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "", bidId: "", ownerName: "", ownerEmail: "", phone: "", address: "", website: "",
  businessType: "", activeServices: [], projectStatus: "Not Started", teamLead: "",
  slackChannel: "", languages: [], priority: "Medium", firstContactDate: "", grantEligible: false, notes: "",
};

export default function BusinessesPage() {
  const session = getSession()!;
  const editable = canEdit(session.role);
  const deletable = canDelete(session.role);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Business | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setBusinesses(getBusinesses()); }, []);
  const refresh = () => setBusinesses(getBusinesses());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (b: Business) => {
    setForm({ name: b.name, bidId: b.bidId, ownerName: b.ownerName, ownerEmail: b.ownerEmail, phone: b.phone,
      address: b.address, website: b.website, businessType: b.businessType, activeServices: b.activeServices,
      projectStatus: b.projectStatus, teamLead: b.teamLead, slackChannel: b.slackChannel, languages: b.languages,
      priority: b.priority as Business["priority"], firstContactDate: b.firstContactDate,
      grantEligible: b.grantEligible, notes: b.notes });
    setEditing(b);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateBusiness(editing.id, form as Partial<Business>);
    else createBusiness(form as Omit<Business, "id" | "createdAt" | "updatedAt">);
    refresh();
    setModal(null);
  };

  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    return (!search || b.name.toLowerCase().includes(q) || b.ownerName.toLowerCase().includes(q) || b.businessType.toLowerCase().includes(q))
      && (!filterStatus || b.projectStatus === filterStatus);
  });

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Business Directory"
        subtitle={`${businesses.length} businesses · ${businesses.filter(b => b.projectStatus === "Active").length} active projects`}
        action={editable ? <Btn variant="primary" onClick={openCreate}>+ New Business</Btn> : undefined}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total" value={businesses.length} />
        <StatCard label="Active" value={businesses.filter(b => b.projectStatus === "Active").length} color="text-green-400" />
        <StatCard label="Grant Eligible" value={businesses.filter(b => b.grantEligible).length} color="text-yellow-400" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search businesses, owners…" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Table
        cols={["Business", "Type", "Owner", "Status", "Services", "Team Lead", "Actions"]}
        rows={filtered.map(b => [
          <div key="n"><p className="text-white font-medium">{b.name}</p><p className="text-white/30 text-xs">{b.slackChannel && `#${b.slackChannel}`}</p></div>,
          <span key="t" className="text-white/50">{b.businessType || "—"}</span>,
          <div key="o"><p className="text-white/70 text-sm">{b.ownerName || "—"}</p><p className="text-white/30 text-xs">{b.ownerEmail}</p></div>,
          <Badge key="s" label={b.projectStatus} />,
          <div key="sv" className="flex flex-wrap gap-1">{b.activeServices.slice(0, 2).map(s => <span key={s} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{s}</span>)}{b.activeServices.length > 2 && <span className="text-xs text-white/30">+{b.activeServices.length - 2}</span>}</div>,
          <span key="tl" className="text-white/50">{b.teamLead || "—"}</span>,
          <div key="a" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {editable && <Btn size="sm" variant="ghost" onClick={() => openEdit(b)}>Edit</Btn>}
            {deletable && <Btn size="sm" variant="danger" onClick={() => ask(() => { deleteBusiness(b.id); refresh(); })}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && <Empty message="No businesses match your filters." action={editable ? <Btn variant="primary" onClick={openCreate}>Add first business</Btn> : undefined} />}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Business" : "New Business"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Business Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} /></Field>
          <Field label="Business Type"><Input value={form.businessType} onChange={e => set("businessType", e.target.value)} placeholder="e.g. Restaurant, Florist" /></Field>
          <Field label="Owner Name"><Input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} /></Field>
          <Field label="Owner Email"><Input type="email" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" /></Field>
          <Field label="Project Status"><Select options={STATUSES} value={form.projectStatus} onChange={e => set("projectStatus", e.target.value)} /></Field>
          <Field label="Priority"><Select options={PRIORITIES} value={form.priority} onChange={e => set("priority", e.target.value)} /></Field>
          <Field label="Team Lead"><Input value={form.teamLead} onChange={e => set("teamLead", e.target.value)} /></Field>
          <Field label="Slack Channel"><Input value={form.slackChannel} onChange={e => set("slackChannel", e.target.value)} placeholder="#channel-name" /></Field>
          <Field label="First Contact Date"><Input type="date" value={form.firstContactDate} onChange={e => set("firstContactDate", e.target.value)} /></Field>
          <Field label="Grant Eligible">
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.grantEligible} onChange={e => set("grantEligible", e.target.checked)} className="accent-[#85CC17] w-4 h-4" />
              <span className="text-sm text-white/60">Yes</span>
            </div>
          </Field>
          <div className="col-span-2"><Field label="Address"><Input value={form.address} onChange={e => set("address", e.target.value)} /></Field></div>
          <div className="col-span-2">
            <Field label="Active Services">
              <TagInput values={form.activeServices} onChange={v => set("activeServices", v)} options={SERVICES} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Languages Spoken">
              <TagInput values={form.languages} onChange={v => set("languages", v)} options={LANGS} />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Notes"><TextArea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save" : "Create"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
