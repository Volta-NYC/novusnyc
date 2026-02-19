"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, StatCard, TagInput, useConfirm } from "@/components/members/ui";
import { getTeam, createTeamMember, updateTeamMember, deleteTeamMember, type TeamMember } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const MEMBER_ROLES = ["Team Lead", "Member", "Associate", "Advisor"];
const STATUSES = ["Active", "On Leave", "Alumni", "Inactive"];
const DIVISIONS = ["Tech", "Marketing", "Finance", "Outreach", "Operations"];
const SKILL_OPTIONS = ["React", "TypeScript", "Python", "Figma", "Canva", "Excel", "Grant Writing", "SEO", "Video Editing", "Social Media", "Financial Analysis", "Project Management"];

const BLANK: Omit<TeamMember, "id" | "createdAt"> = {
  name: "", school: "", divisions: [], pod: "", role: "Member", slackHandle: "",
  email: "", status: "Active", skills: [], joinDate: "", notes: "",
};

export default function TeamPage() {
  const session = getSession()!;
  const editable = canEdit(session.role);
  const deletable = canDelete(session.role);

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [filterDiv, setFilterDiv] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setTeam(getTeam()); }, []);
  const refresh = () => setTeam(getTeam());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (m: TeamMember) => {
    setForm({ name: m.name, school: m.school, divisions: m.divisions, pod: m.pod, role: m.role,
      slackHandle: m.slackHandle, email: m.email, status: m.status, skills: m.skills, joinDate: m.joinDate, notes: m.notes });
    setEditing(m);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateTeamMember(editing.id, form as Partial<TeamMember>);
    else createTeamMember(form as Omit<TeamMember, "id" | "createdAt">);
    refresh();
    setModal(null);
  };

  const filtered = team.filter(m =>
    (!search || m.name.toLowerCase().includes(search.toLowerCase()) || m.school.toLowerCase().includes(search.toLowerCase()) || m.slackHandle.toLowerCase().includes(search.toLowerCase()))
    && (!filterDiv || m.divisions.includes(filterDiv))
  );

  const active = team.filter(m => m.status === "Active");

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Team Directory"
        subtitle={`${active.length} active members · ${team.filter(m => m.role === "Team Lead").length} team leads`}
        action={editable ? <Btn variant="primary" onClick={openCreate}>+ Add Member</Btn> : undefined}
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Members" value={team.length} />
        <StatCard label="Active" value={active.length} color="text-green-400" />
        <StatCard label="Team Leads" value={team.filter(m => m.role === "Team Lead").length} color="text-blue-400" />
        <StatCard label="Alumni" value={team.filter(m => m.status === "Alumni").length} color="text-white/40" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search members, schools…" />
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <Table
        cols={["Name", "School", "Role", "Division(s)", "Status", "Slack", "Actions"]}
        rows={filtered.map(m => [
          <div key="n" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#85CC17]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[#85CC17] text-sm font-bold">{m.name[0]?.toUpperCase()}</span>
            </div>
            <span className="text-white font-medium">{m.name}</span>
          </div>,
          <span key="sc" className="text-white/50">{m.school || "—"}</span>,
          <Badge key="r" label={m.role} />,
          <div key="d" className="flex flex-wrap gap-1">{m.divisions.slice(0,2).map(d => <span key={d} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{d}</span>)}</div>,
          <Badge key="s" label={m.status} />,
          <span key="sl" className="text-white/40 font-mono text-xs">{m.slackHandle ? `@${m.slackHandle}` : "—"}</span>,
          <div key="ac" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {editable && <Btn size="sm" variant="ghost" onClick={() => openEdit(m)}>Edit</Btn>}
            {deletable && <Btn size="sm" variant="danger" onClick={() => ask(() => { deleteTeamMember(m.id); refresh(); })}>Del</Btn>}
          </div>,
        ])}
      />
      {filtered.length === 0 && <Empty message="No team members found." action={editable ? <Btn variant="primary" onClick={openCreate}>Add first member</Btn> : undefined} />}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Member" : "New Team Member"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Full Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} /></Field>
          <Field label="School / University"><Input value={form.school} onChange={e => set("school", e.target.value)} /></Field>
          <Field label="Role"><Select options={MEMBER_ROLES} value={form.role} onChange={e => set("role", e.target.value)} /></Field>
          <Field label="Status"><Select options={STATUSES} value={form.status} onChange={e => set("status", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></Field>
          <Field label="Slack Handle"><Input value={form.slackHandle} onChange={e => set("slackHandle", e.target.value)} placeholder="no @ needed" /></Field>
          <Field label="Pod / Team"><Input value={form.pod} onChange={e => set("pod", e.target.value)} placeholder="e.g. Park Slope Pod" /></Field>
          <Field label="Join Date"><Input type="date" value={form.joinDate} onChange={e => set("joinDate", e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Divisions">
              <TagInput values={form.divisions} onChange={v => set("divisions", v)} options={DIVISIONS} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Skills">
              <TagInput values={form.skills} onChange={v => set("skills", v)} options={SKILL_OPTIONS} />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Notes"><TextArea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save" : "Add Member"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
