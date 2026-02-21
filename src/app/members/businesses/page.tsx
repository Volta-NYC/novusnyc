"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Table, Empty, StatCard, TagInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBusinesses, createBusiness, updateBusiness, deleteBusiness, type Business,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES   = ["Not Started", "Discovery", "Active", "On Hold", "Complete"];
const SERVICES   = ["Website", "Social Media", "Grant Writing", "SEO", "Financial Analysis", "Digital Payments"];
const PRIORITIES = ["High", "Medium", "Low"];
const LANGUAGES  = ["English", "Spanish", "Chinese", "Korean", "Arabic", "French", "Other"];

// Blank form values for creating a new business.
const BLANK_FORM: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "", bidId: "", ownerName: "", ownerEmail: "", phone: "", address: "", website: "",
  businessType: "", activeServices: [], projectStatus: "Not Started", teamLead: "",
  slackChannel: "", languages: [], priority: "Medium", firstContactDate: "", grantEligible: false, notes: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BusinessesPage() {
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  // Subscribe to real-time business updates; unsubscribe on unmount.
  useEffect(() => subscribeBusinesses(setBusinesses), []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingBusiness(null);
    setModal("create");
  };

  const openEdit = (business: Business) => {
    setForm({
      name:             business.name,
      bidId:            business.bidId,
      ownerName:        business.ownerName,
      ownerEmail:       business.ownerEmail,
      phone:            business.phone,
      address:          business.address,
      website:          business.website,
      businessType:     business.businessType,
      // Guard against undefined: Firebase omits empty arrays when storing.
      activeServices:   business.activeServices ?? [],
      projectStatus:    business.projectStatus,
      teamLead:         business.teamLead,
      slackChannel:     business.slackChannel,
      languages:        business.languages ?? [],
      priority:         business.priority as Business["priority"],
      firstContactDate: business.firstContactDate,
      grantEligible:    business.grantEligible,
      notes:            business.notes,
    });
    setEditingBusiness(business);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingBusiness) {
      await updateBusiness(editingBusiness.id, form as Partial<Business>);
    } else {
      await createBusiness(form as Omit<Business, "id" | "createdAt" | "updatedAt">);
    }
    setModal(null);
  };

  // Filter by search text and/or status dropdown.
  const filtered = businesses.filter((business) => {
    const query = search.toLowerCase();
    const matchesSearch = !search
      || business.name.toLowerCase().includes(query)
      || business.ownerName.toLowerCase().includes(query)
      || business.businessType.toLowerCase().includes(query);
    const matchesStatus = !filterStatus || business.projectStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Business Directory"
        subtitle={`${businesses.length} businesses · ${businesses.filter(b => b.projectStatus === "Active").length} active`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Business</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total" value={businesses.length} />
        <StatCard label="Active" value={businesses.filter(b => b.projectStatus === "Active").length} color="text-green-400" />
        <StatCard label="Grant Eligible" value={businesses.filter(b => b.grantEligible).length} color="text-yellow-400" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search businesses, owners…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Business list */}
      <Table
        cols={["Business", "Type", "Owner", "Status", "Services", "Team Lead", "Actions"]}
        rows={filtered.map(business => {
          // Guard: activeServices may be undefined if Firebase omitted the empty array.
          const services = business.activeServices ?? [];
          return [
            <div key="name">
              <p className="text-white font-medium">{business.name}</p>
              <p className="text-white/30 text-xs">{business.slackChannel && `#${business.slackChannel}`}</p>
            </div>,
            <span key="type" className="text-white/50">{business.businessType || "—"}</span>,
            <div key="owner">
              <p className="text-white/70 text-sm">{business.ownerName || "—"}</p>
              <p className="text-white/30 text-xs">{business.ownerEmail}</p>
            </div>,
            <Badge key="status" label={business.projectStatus} />,
            <div key="services" className="flex flex-wrap gap-1">
              {services.slice(0, 2).map(service => (
                <span key={service} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{service}</span>
              ))}
              {services.length > 2 && (
                <span className="text-xs text-white/30">+{services.length - 2}</span>
              )}
            </div>,
            <span key="lead" className="text-white/50">{business.teamLead || "—"}</span>,
            <div key="actions" className="flex gap-2">
              {canEdit && <Btn size="sm" variant="ghost" onClick={() => openEdit(business)}>Edit</Btn>}
              {canEdit && <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteBusiness(business.id))}>Del</Btn>}
            </div>,
          ];
        })}
      />
      {filtered.length === 0 && (
        <Empty
          message="No businesses."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first business</Btn> : undefined}
        />
      )}

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingBusiness ? "Edit Business" : "New Business"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Business Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="Business Type">
            <Input value={form.businessType} onChange={e => setField("businessType", e.target.value)} placeholder="e.g. Restaurant" />
          </Field>
          <Field label="Owner Name">
            <Input value={form.ownerName} onChange={e => setField("ownerName", e.target.value)} />
          </Field>
          <Field label="Owner Email">
            <Input type="email" value={form.ownerEmail} onChange={e => setField("ownerEmail", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={e => setField("phone", e.target.value)} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={e => setField("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Project Status">
            <Select options={STATUSES} value={form.projectStatus} onChange={e => setField("projectStatus", e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select options={PRIORITIES} value={form.priority} onChange={e => setField("priority", e.target.value)} />
          </Field>
          <Field label="Team Lead">
            <Input value={form.teamLead} onChange={e => setField("teamLead", e.target.value)} />
          </Field>
          <Field label="Slack Channel">
            <Input value={form.slackChannel} onChange={e => setField("slackChannel", e.target.value)} placeholder="#channel" />
          </Field>
          <Field label="First Contact">
            <Input type="date" value={form.firstContactDate} onChange={e => setField("firstContactDate", e.target.value)} />
          </Field>
          <Field label="Grant Eligible">
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.grantEligible}
                onChange={e => setField("grantEligible", e.target.checked)}
                className="accent-[#85CC17] w-4 h-4"
              />
              <span className="text-sm text-white/60">Yes</span>
            </div>
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Input value={form.address} onChange={e => setField("address", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Active Services">
              <TagInput values={form.activeServices} onChange={v => setField("activeServices", v)} options={SERVICES} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Languages Spoken">
              <TagInput values={form.languages} onChange={v => setField("languages", v)} options={LANGUAGES} />
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
          <Btn variant="primary" onClick={handleSave}>{editingBusiness ? "Save" : "Create"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
