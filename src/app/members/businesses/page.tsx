"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, TagInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBusinesses, createBusiness, updateBusiness, deleteBusiness, type Business,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES         = ["Not Started", "Discovery", "Active", "On Hold", "Complete"];
const DIVISIONS        = ["Tech", "Marketing", "Finance", "Operations"];
const PROGRESS_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];
const SERVICES         = ["Website", "Social Media", "Grant Writing", "SEO", "Financial Analysis", "Digital Payments"];
const PRIORITIES       = ["High", "Medium", "Low"];
const LANGUAGES        = ["English", "Spanish", "Chinese", "Korean", "Arabic", "French", "Other"];

const PROGRESS_TO_PERCENT: Record<string, number> = {
  "0%": 0, "25%": 25, "50%": 50, "75%": 75, "100%": 100,
};

// Blank form for creating a new project/business entry.
const BLANK_FORM: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "", bidId: "", ownerName: "", ownerEmail: "", phone: "", address: "", website: "",
  businessType: "", activeServices: [], projectStatus: "Not Started", teamLead: "",
  slackChannel: "", languages: [], priority: "Medium", firstContactDate: "",
  grantEligible: false, notes: "",
  // Project fields
  division: "Tech", progress: "0%", teamMembers: [],
  startDate: "", targetEndDate: "", actualEndDate: "",
  week1Deliverable: "", finalDeliverable: "", driveFolderUrl: "", clientNotes: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BusinessesPage() {
  const [businesses, setBusinesses]         = useState<Business[]>([]);
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterDiv, setFilterDiv]           = useState("");
  const [modal, setModal]                   = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]                     = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  useEffect(() => subscribeBusinesses(setBusinesses), []);

  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingBusiness(null);
    setModal("create");
  };

  const openEdit = (b: Business) => {
    setForm({
      name:             b.name,
      bidId:            b.bidId,
      ownerName:        b.ownerName,
      ownerEmail:       b.ownerEmail,
      phone:            b.phone,
      address:          b.address,
      website:          b.website,
      businessType:     b.businessType,
      activeServices:   b.activeServices  ?? [],
      projectStatus:    b.projectStatus,
      teamLead:         b.teamLead,
      slackChannel:     b.slackChannel,
      languages:        b.languages       ?? [],
      priority:         b.priority,
      firstContactDate: b.firstContactDate,
      grantEligible:    b.grantEligible,
      notes:            b.notes,
      division:         b.division        ?? "Tech",
      progress:         b.progress        ?? "0%",
      teamMembers:      b.teamMembers     ?? [],
      startDate:        b.startDate       ?? "",
      targetEndDate:    b.targetEndDate   ?? "",
      actualEndDate:    b.actualEndDate   ?? "",
      week1Deliverable: b.week1Deliverable ?? "",
      finalDeliverable: b.finalDeliverable ?? "",
      driveFolderUrl:   b.driveFolderUrl  ?? "",
      clientNotes:      b.clientNotes     ?? "",
    });
    setEditingBusiness(b);
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

  const filtered = businesses.filter(b => {
    const q = search.toLowerCase();
    const matchesSearch = !search
      || b.name.toLowerCase().includes(q)
      || b.ownerName.toLowerCase().includes(q)
      || b.businessType.toLowerCase().includes(q)
      || (b.teamLead ?? "").toLowerCase().includes(q);
    const matchesStatus = !filterStatus || b.projectStatus === filterStatus;
    const matchesDiv    = !filterDiv    || b.division === filterDiv;
    return matchesSearch && matchesStatus && matchesDiv;
  });

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Projects"
        subtitle={`${businesses.length} projects · ${businesses.filter(b => b.projectStatus === "Active").length} active`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Project</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active"    value={businesses.filter(b => b.projectStatus === "Active").length} color="text-green-400" />
        <StatCard label="Planning"  value={businesses.filter(b => b.projectStatus === "Not Started" || b.projectStatus === "Discovery").length} color="text-purple-400" />
        <StatCard label="Complete"  value={businesses.filter(b => b.projectStatus === "Complete").length} color="text-blue-400" />
        <StatCard label="Grant Eligible" value={businesses.filter(b => b.grantEligible).length} color="text-yellow-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects, owners, leads…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-8 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Project cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filtered.map(b => {
          const progress = b.progress ?? "0%";
          const pct      = PROGRESS_TO_PERCENT[progress] ?? 0;
          return (
            <div key={b.id} className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-white font-bold text-base leading-tight">{b.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {b.businessType || "—"}{b.division ? ` · ${b.division}` : ""}
                  </p>
                </div>
                <Badge label={b.projectStatus} />
              </div>

              {/* Owner */}
              {b.ownerName && (
                <p className="text-white/50 text-xs mb-2">{b.ownerName}</p>
              )}

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-white/30 mb-1">
                  <span>Progress</span>
                  <span>{progress}</span>
                </div>
                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-[#85CC17] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-white/30 mb-3">
                <span>Lead: {b.teamLead || "—"}</span>
                {b.targetEndDate && <span>Due {b.targetEndDate}</span>}
              </div>

              {canEdit && (
                <div className="flex gap-2 mt-auto pt-3 border-t border-white/5">
                  <Btn size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => openEdit(b)}>Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteBusiness(b.id))}>Del</Btn>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3">
            <Empty
              message="No projects found."
              action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first project</Btn> : undefined}
            />
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingBusiness ? "Edit Project" : "New Project"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">

          {/* ── Business info ── */}
          <div className="col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Business Info</p>
          </div>
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
          <Field label="First Contact">
            <Input type="date" value={form.firstContactDate} onChange={e => setField("firstContactDate", e.target.value)} />
          </Field>
          <Field label="Grant Eligible">
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.grantEligible} onChange={e => setField("grantEligible", e.target.checked)} className="accent-[#85CC17] w-4 h-4" />
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

          {/* ── Project info ── */}
          <div className="col-span-2 mt-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Project Info</p>
          </div>
          <Field label="Status">
            <Select options={STATUSES} value={form.projectStatus} onChange={e => setField("projectStatus", e.target.value)} />
          </Field>
          <Field label="Division">
            <Select options={DIVISIONS} value={form.division ?? "Tech"} onChange={e => setField("division", e.target.value)} />
          </Field>
          <Field label="Progress">
            <Select options={PROGRESS_OPTIONS} value={form.progress ?? "0%"} onChange={e => setField("progress", e.target.value)} />
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
          <Field label="Start Date">
            <Input type="date" value={form.startDate ?? ""} onChange={e => setField("startDate", e.target.value)} />
          </Field>
          <Field label="Target End Date">
            <Input type="date" value={form.targetEndDate ?? ""} onChange={e => setField("targetEndDate", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Drive Folder URL">
              <Input value={form.driveFolderUrl ?? ""} onChange={e => setField("driveFolderUrl", e.target.value)} placeholder="https://drive.google.com/…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Team Members">
              <TagInput values={form.teamMembers ?? []} onChange={v => setField("teamMembers", v)} options={[]} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Week 1 Deliverable">
              <Input value={form.week1Deliverable ?? ""} onChange={e => setField("week1Deliverable", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Final Deliverable">
              <TextArea rows={2} value={form.finalDeliverable ?? ""} onChange={e => setField("finalDeliverable", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes / Client Notes">
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
