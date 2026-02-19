"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, StatCard, TagInput, useConfirm } from "@/components/members/ui";
import { getProjects, createProject, updateProject, deleteProject, type Project, getBusinesses } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const STATUSES = ["Planning", "Active", "On Hold", "Delivered", "Complete"];
const DIVISIONS = ["Tech", "Marketing", "Finance", "Operations"];
const PROGRESS = ["0%", "25%", "50%", "75%", "100%"];

const BLANK: Omit<Project, "id" | "createdAt" | "updatedAt"> = {
  name: "", businessId: "", division: "Tech", status: "Planning", teamLead: "",
  teamMembers: [], startDate: "", targetEndDate: "", actualEndDate: "",
  week1Deliverable: "", finalDeliverable: "", slackChannel: "", driveFolderUrl: "",
  clientNotes: "", progress: "0%",
};

const PROGRESS_BAR: Record<string, number> = { "0%": 0, "25%": 25, "50%": 50, "75%": 75, "100%": 100 };

export default function ProjectsPage() {
  const session = getSession();
  const editable = session ? canEdit(session.role) : false;
  const deletable = session ? canDelete(session.role) : false;

  const [projects, setProjects] = useState<Project[]>([]);
  const [businesses, setBusinesses] = useState<ReturnType<typeof getBusinesses>>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDiv, setFilterDiv] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setProjects(getProjects()); setBusinesses(getBusinesses()); }, []);
  const refresh = () => setProjects(getProjects());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const bizName = (id: string) => businesses.find(b => b.id === id)?.name ?? id;

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (p: Project) => {
    setForm({ name: p.name, businessId: p.businessId, division: p.division, status: p.status,
      teamLead: p.teamLead, teamMembers: p.teamMembers, startDate: p.startDate,
      targetEndDate: p.targetEndDate, actualEndDate: p.actualEndDate,
      week1Deliverable: p.week1Deliverable, finalDeliverable: p.finalDeliverable,
      slackChannel: p.slackChannel, driveFolderUrl: p.driveFolderUrl, clientNotes: p.clientNotes, progress: p.progress });
    setEditing(p);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateProject(editing.id, form as Partial<Project>);
    else createProject(form as Omit<Project, "id" | "createdAt" | "updatedAt">);
    refresh();
    setModal(null);
  };

  const filtered = projects.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.teamLead.toLowerCase().includes(search.toLowerCase()))
    && (!filterStatus || p.status === filterStatus)
    && (!filterDiv || p.division === filterDiv)
  );

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total · ${projects.filter(p => p.status === "Active").length} active`}
        action={editable ? <Btn variant="primary" onClick={openCreate}>+ New Project</Btn> : undefined}
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active" value={projects.filter(p => p.status === "Active").length} color="text-green-400" />
        <StatCard label="Planning" value={projects.filter(p => p.status === "Planning").length} color="text-purple-400" />
        <StatCard label="Delivered" value={projects.filter(p => ["Delivered", "Complete"].includes(p.status)).length} color="text-blue-400" />
        <StatCard label="On Hold" value={projects.filter(p => p.status === "On Hold").length} color="text-orange-400" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects, leads…" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Project cards view */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filtered.map(p => (
          <div key={p.id} className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-bold text-base leading-tight">{p.name}</p>
                <p className="text-white/40 text-xs mt-1">{bizName(p.businessId) || "No client"} · {p.division}</p>
              </div>
              <Badge label={p.status} />
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/30 mb-1">
                <span>Progress</span><span>{p.progress}</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full bg-[#85CC17] rounded-full transition-all" style={{ width: `${PROGRESS_BAR[p.progress]}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/30">
              <span>Lead: {p.teamLead || "—"}</span>
              <span>{p.targetEndDate ? `Due ${p.targetEndDate}` : ""}</span>
            </div>

            {editable && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                <Btn size="sm" variant="ghost" className="flex-1 justify-center" onClick={() => openEdit(p)}>Edit</Btn>
                {deletable && <Btn size="sm" variant="danger" onClick={() => ask(() => { deleteProject(p.id); refresh(); })}>Del</Btn>}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3">
            <Empty message="No projects found." action={editable ? <Btn variant="primary" onClick={openCreate}>Create first project</Btn> : undefined} />
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Project" : "New Project"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="col-span-2"><Field label="Project Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Souk Al Shater Website Redesign" /></Field></div>
          <Field label="Client Business">
            <select value={form.businessId} onChange={e => set("businessId", e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50">
              <option value="">— Select business —</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Division"><Select options={DIVISIONS} value={form.division} onChange={e => set("division", e.target.value)} /></Field>
          <Field label="Status"><Select options={STATUSES} value={form.status} onChange={e => set("status", e.target.value)} /></Field>
          <Field label="Progress"><Select options={PROGRESS} value={form.progress} onChange={e => set("progress", e.target.value)} /></Field>
          <Field label="Team Lead"><Input value={form.teamLead} onChange={e => set("teamLead", e.target.value)} /></Field>
          <Field label="Slack Channel"><Input value={form.slackChannel} onChange={e => set("slackChannel", e.target.value)} placeholder="#project-channel" /></Field>
          <Field label="Start Date"><Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></Field>
          <Field label="Target End Date"><Input type="date" value={form.targetEndDate} onChange={e => set("targetEndDate", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Drive Folder URL"><Input value={form.driveFolderUrl} onChange={e => set("driveFolderUrl", e.target.value)} placeholder="https://drive.google.com/…" /></Field></div>
          <div className="col-span-2">
            <Field label="Team Members">
              <TagInput values={form.teamMembers} onChange={v => set("teamMembers", v)} options={[]} />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Week 1 Deliverable"><Input value={form.week1Deliverable} onChange={e => set("week1Deliverable", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Final Deliverable"><TextArea rows={2} value={form.finalDeliverable} onChange={e => set("finalDeliverable", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Client Notes"><TextArea rows={2} value={form.clientNotes} onChange={e => set("clientNotes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save" : "Create Project"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
