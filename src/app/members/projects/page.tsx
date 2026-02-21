"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, TagInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeProjects, createProject, updateProject, deleteProject, type Project,
  subscribeBusinesses, type Business,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES  = ["Planning", "Active", "On Hold", "Delivered", "Complete"];
const DIVISIONS = ["Tech", "Marketing", "Finance", "Operations"];
const PROGRESS_OPTIONS = ["0%", "25%", "50%", "75%", "100%"];

// Maps progress string to a numeric percentage for the progress bar width.
const PROGRESS_TO_PERCENT: Record<string, number> = {
  "0%": 0, "25%": 25, "50%": 50, "75%": 75, "100%": 100,
};

// Blank form values for creating a new project.
const BLANK_FORM: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
  name: "", businessId: "", division: "Tech", status: "Planning", teamLead: "",
  teamMembers: [], startDate: "", targetEndDate: "", actualEndDate: "",
  week1Deliverable: "", finalDeliverable: "", slackChannel: "", driveFolderUrl: "",
  clientNotes: "", progress: "0%",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects]     = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDiv, setFilterDiv]   = useState("");
  const [modal, setModal]           = useState<"create" | "edit" | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm]             = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  // Subscribe to real-time updates for projects and businesses; unsubscribe on unmount.
  useEffect(() => {
    const unsubscribeProjects   = subscribeProjects(setProjects);
    const unsubscribeBusinesses = subscribeBusinesses(setBusinesses);
    return () => { unsubscribeProjects(); unsubscribeBusinesses(); };
  }, []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Look up a business name by ID for display in project cards.
  const getBusinessName = (id: string) =>
    businesses.find(b => b.id === id)?.name ?? id;

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingProject(null);
    setModal("create");
  };

  const openEdit = (project: Project) => {
    setForm({
      name:              project.name,
      businessId:        project.businessId,
      division:          project.division,
      status:            project.status,
      teamLead:          project.teamLead,
      // Guard against undefined: Firebase omits empty arrays when storing.
      teamMembers:       project.teamMembers ?? [],
      startDate:         project.startDate,
      targetEndDate:     project.targetEndDate,
      actualEndDate:     project.actualEndDate,
      week1Deliverable:  project.week1Deliverable,
      finalDeliverable:  project.finalDeliverable,
      slackChannel:      project.slackChannel,
      driveFolderUrl:    project.driveFolderUrl,
      clientNotes:       project.clientNotes,
      progress:          project.progress,
    });
    setEditingProject(project);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingProject) {
      await updateProject(editingProject.id, form as Partial<Project>);
    } else {
      await createProject(form as Omit<Project, "id" | "createdAt" | "updatedAt">);
    }
    setModal(null);
  };

  // Filter by search text, status, and division dropdowns.
  const filtered = projects.filter(project =>
    (!search
      || project.name.toLowerCase().includes(search.toLowerCase())
      || project.teamLead.toLowerCase().includes(search.toLowerCase()))
    && (!filterStatus || project.status === filterStatus)
    && (!filterDiv || project.division === filterDiv)
  );

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total · ${projects.filter(p => p.status === "Active").length} active`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Project</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active"    value={projects.filter(p => p.status === "Active").length} color="text-green-400" />
        <StatCard label="Planning"  value={projects.filter(p => p.status === "Planning").length} color="text-purple-400" />
        <StatCard label="Delivered" value={projects.filter(p => ["Delivered", "Complete"].includes(p.status)).length} color="text-blue-400" />
        <StatCard label="On Hold"   value={projects.filter(p => p.status === "On Hold").length} color="text-orange-400" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects, leads…" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Project cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filtered.map(project => (
          <div key={project.id} className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-bold text-base leading-tight">{project.name}</p>
                <p className="text-white/40 text-xs mt-1">
                  {getBusinessName(project.businessId) || "No client"} · {project.division}
                </p>
              </div>
              <Badge label={project.status} />
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/30 mb-1">
                <span>Progress</span>
                <span>{project.progress}</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#85CC17] rounded-full"
                  style={{ width: `${PROGRESS_TO_PERCENT[project.progress]}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/30">
              <span>Lead: {project.teamLead || "—"}</span>
              <span>{project.targetEndDate ? `Due ${project.targetEndDate}` : ""}</span>
            </div>

            {canEdit && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <Btn size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => openEdit(project)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteProject(project.id))}>Del</Btn>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3">
            <Empty
              message="No projects found."
              action={canEdit ? <Btn variant="primary" onClick={openCreate}>Create first project</Btn> : undefined}
            />
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingProject ? "Edit Project" : "New Project"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="col-span-2">
            <Field label="Project Name" required>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} />
            </Field>
          </div>
          <Field label="Client Business">
            <select
              value={form.businessId}
              onChange={e => setField("businessId", e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50"
            >
              <option value="">— Select business —</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Division">
            <Select options={DIVISIONS} value={form.division} onChange={e => setField("division", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select options={STATUSES} value={form.status} onChange={e => setField("status", e.target.value)} />
          </Field>
          <Field label="Progress">
            <Select options={PROGRESS_OPTIONS} value={form.progress} onChange={e => setField("progress", e.target.value)} />
          </Field>
          <Field label="Team Lead">
            <Input value={form.teamLead} onChange={e => setField("teamLead", e.target.value)} />
          </Field>
          <Field label="Slack Channel">
            <Input value={form.slackChannel} onChange={e => setField("slackChannel", e.target.value)} placeholder="#channel" />
          </Field>
          <Field label="Start Date">
            <Input type="date" value={form.startDate} onChange={e => setField("startDate", e.target.value)} />
          </Field>
          <Field label="Target End Date">
            <Input type="date" value={form.targetEndDate} onChange={e => setField("targetEndDate", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Drive Folder URL">
              <Input value={form.driveFolderUrl} onChange={e => setField("driveFolderUrl", e.target.value)} placeholder="https://drive.google.com/…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Team Members">
              <TagInput values={form.teamMembers} onChange={v => setField("teamMembers", v)} options={[]} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Week 1 Deliverable">
              <Input value={form.week1Deliverable} onChange={e => setField("week1Deliverable", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Final Deliverable">
              <TextArea rows={2} value={form.finalDeliverable} onChange={e => setField("finalDeliverable", e.target.value)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Client Notes">
              <TextArea rows={2} value={form.clientNotes} onChange={e => setField("clientNotes", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingProject ? "Save" : "Create Project"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
