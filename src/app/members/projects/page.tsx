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

const STATUSES  = ["Not Started", "Discovery", "Active", "On Hold", "Complete"];
const DIVISIONS = ["Tech", "Marketing", "Finance", "Operations"];
const SERVICES  = ["Website", "Social Media", "Grant Writing", "SEO", "Financial Analysis", "Digital Payments"];
const PRIORITIES = ["High", "Medium", "Low"];
const LANGUAGES  = ["English", "Spanish", "Chinese", "Korean", "Arabic", "French", "Other"];

const BLANK_FORM: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "", bidId: "", ownerName: "", ownerEmail: "", phone: "", address: "", website: "",
  businessType: "", activeServices: [], projectStatus: "Not Started", teamLead: "",
  slackChannel: "", languages: [], priority: "Medium", firstContactDate: "",
  grantEligible: false, notes: "",
  division: "Tech", teamMembers: [],
  startDate: "", targetEndDate: "", actualEndDate: "",
  nextStep: "", nextStepDeadline: "", githubUrl: "", driveFolderUrl: "", clientNotes: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BusinessesPage() {
  const [businesses, setBusinesses]           = useState<Business[]>([]);
  const [search, setSearch]                   = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [filterDiv, setFilterDiv]             = useState("");
  const [modal, setModal]                     = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]                       = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  useEffect(() => subscribeBusinesses(setBusinesses), []);

  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => { setForm(BLANK_FORM); setEditingBusiness(null); setModal("create"); };

  const openEdit = (b: Business) => {
    setForm({
      name: b.name, bidId: b.bidId, ownerName: b.ownerName, ownerEmail: b.ownerEmail,
      phone: b.phone, address: b.address, website: b.website, businessType: b.businessType,
      activeServices: b.activeServices  ?? [],
      projectStatus:  b.projectStatus,
      teamLead:       b.teamLead,
      slackChannel:   b.slackChannel,
      languages:      b.languages       ?? [],
      priority:       b.priority,
      firstContactDate: b.firstContactDate,
      grantEligible:  b.grantEligible,
      notes:          b.notes,
      division:       b.division        ?? "Tech",
      teamMembers:    b.teamMembers     ?? [],
      startDate:      b.startDate       ?? "",
      targetEndDate:  b.targetEndDate   ?? "",
      actualEndDate:  b.actualEndDate   ?? "",
      nextStep:         b.nextStep         ?? "",
      nextStepDeadline: b.nextStepDeadline ?? "",
      githubUrl:        b.githubUrl        ?? "",
      driveFolderUrl:   b.driveFolderUrl   ?? "",
      clientNotes:      b.clientNotes      ?? "",
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active"    value={businesses.filter(b => b.projectStatus === "Active").length}   color="text-green-400" />
        <StatCard label="Planning"  value={businesses.filter(b => ["Not Started","Discovery"].includes(b.projectStatus)).length} color="text-purple-400" />
        <StatCard label="Complete"  value={businesses.filter(b => b.projectStatus === "Complete").length} color="text-blue-400" />
        <StatCard label="Grant Eligible" value={businesses.filter(b => b.grantEligible).length}          color="text-yellow-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects, owners, leads…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-9 py-2.5 text-sm text-white/70 focus:outline-none appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff66' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-9 py-2.5 text-sm text-white/70 focus:outline-none appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff66' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Project cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filtered.map(b => (
          <div key={b.id} className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all flex flex-col gap-3">

            {/* Name + badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-tight">{b.name}</p>
                {b.businessType && <p className="text-white/40 text-xs mt-0.5">{b.businessType}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge label={b.projectStatus} />
                {b.division && <span className="text-[10px] text-white/40 bg-white/6 px-2 py-0.5 rounded-full">{b.division}</span>}
              </div>
            </div>

            {/* Contact info */}
            {(b.ownerName || b.ownerEmail || b.phone) && (
              <div className="bg-white/4 rounded-lg px-3 py-2 space-y-1">
                {b.ownerName && (
                  <p className="text-white/70 text-xs font-medium">{b.ownerName}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {b.ownerEmail && (
                    <a href={`mailto:${b.ownerEmail}`} className="text-[#85CC17]/70 hover:text-[#85CC17] text-xs font-mono transition-colors">{b.ownerEmail}</a>
                  )}
                  {b.phone && (
                    <span className="text-white/40 text-xs">{b.phone}</span>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            {(b.startDate || b.targetEndDate) && (
              <div className="flex gap-4 text-xs">
                {b.startDate && (
                  <div>
                    <span className="text-white/30 block">Start</span>
                    <span className="text-white/60">{b.startDate}</span>
                  </div>
                )}
                {b.targetEndDate && (
                  <div>
                    <span className="text-white/30 block">Target End</span>
                    <span className="text-white/60">{b.targetEndDate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Next step */}
            {(b.nextStep || b.nextStepDeadline) && (
              <div className="border-l-2 border-[#85CC17]/40 pl-3">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Next Step</p>
                {b.nextStep && <p className="text-white/70 text-xs">{b.nextStep}</p>}
                {b.nextStepDeadline && (
                  <p className="text-[#85CC17]/60 text-[10px] mt-0.5">Due {b.nextStepDeadline}</p>
                )}
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <div className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
                <Btn size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => openEdit(b)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteBusiness(b.id))}>Del</Btn>
              </div>
            )}
          </div>
        ))}
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

          {/* ── Business Info ── */}
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
          <Field label="First Contact Date">
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

          {/* ── Project Info ── */}
          <div className="col-span-2 mt-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Project Info</p>
          </div>
          <Field label="Status">
            <Select options={STATUSES} value={form.projectStatus} onChange={e => setField("projectStatus", e.target.value)} />
          </Field>
          <Field label="Division">
            <Select options={DIVISIONS} value={form.division ?? "Tech"} onChange={e => setField("division", e.target.value)} />
          </Field>
          <Field label="Priority">
            <Select options={PRIORITIES} value={form.priority} onChange={e => setField("priority", e.target.value)} />
          </Field>
          <Field label="Team Lead">
            <Input value={form.teamLead} onChange={e => setField("teamLead", e.target.value)} />
          </Field>
          <Field label="Start Date">
            <Input type="date" value={form.startDate ?? ""} onChange={e => setField("startDate", e.target.value)} />
          </Field>
          <Field label="Target End Date">
            <Input type="date" value={form.targetEndDate ?? ""} onChange={e => setField("targetEndDate", e.target.value)} />
          </Field>
          <Field label="Slack Channel">
            <Input value={form.slackChannel} onChange={e => setField("slackChannel", e.target.value)} placeholder="#channel" />
          </Field>
          <Field label="Actual End Date">
            <Input type="date" value={form.actualEndDate ?? ""} onChange={e => setField("actualEndDate", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Next Step">
              <Input value={form.nextStep ?? ""} onChange={e => setField("nextStep", e.target.value)} placeholder="What needs to happen next?" />
            </Field>
          </div>
          <Field label="Next Step Deadline">
            <Input type="date" value={form.nextStepDeadline ?? ""} onChange={e => setField("nextStepDeadline", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Team Members">
              <TagInput values={form.teamMembers ?? []} onChange={v => setField("teamMembers", v)} options={[]} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="GitHub Repo URL">
              <Input value={form.githubUrl ?? ""} onChange={e => setField("githubUrl", e.target.value)} placeholder="https://github.com/…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Drive Folder URL">
              <Input value={form.driveFolderUrl ?? ""} onChange={e => setField("driveFolderUrl", e.target.value)} placeholder="https://drive.google.com/…" />
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
