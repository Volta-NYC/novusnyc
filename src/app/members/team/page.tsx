"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Table, Empty, StatCard, TagInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeTeam, createTeamMember, updateTeamMember, deleteTeamMember, type TeamMember,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const MEMBER_ROLES = ["Team Lead", "Member", "Associate", "Advisor"];
const STATUSES     = ["Active", "On Leave", "Alumni", "Inactive"];
const DIVISIONS    = ["Tech", "Marketing", "Finance", "Outreach", "Operations"];
const SKILL_OPTIONS = [
  "React", "TypeScript", "Python", "Figma", "Canva", "Excel",
  "Grant Writing", "SEO", "Video Editing", "Social Media", "Financial Analysis", "Project Management",
];

// Blank form values for creating a new team member.
const BLANK_FORM: Omit<TeamMember, "id" | "createdAt"> = {
  name: "", school: "", divisions: [], pod: "", role: "Member", slackHandle: "",
  email: "", status: "Active", skills: [], joinDate: "", notes: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [team, setTeam]               = useState<TeamMember[]>([]);
  const [search, setSearch]           = useState("");
  const [filterDiv, setFilterDiv]     = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [sortCol, setSortCol]         = useState(-1);
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("asc");

  const { ask, Dialog } = useConfirm();
  const { authRole }    = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  // Subscribe to real-time team updates; unsubscribe on unmount.
  useEffect(() => subscribeTeam(setTeam), []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingMember(null);
    setModal("create");
  };

  const openEdit = (member: TeamMember) => {
    setForm({
      name:        member.name,
      school:      member.school,
      // Guard against undefined: Firebase omits empty arrays when storing.
      divisions:   member.divisions ?? [],
      pod:         member.pod,
      role:        member.role,
      slackHandle: member.slackHandle,
      email:       member.email,
      status:      member.status,
      skills:      member.skills ?? [],
      joinDate:    member.joinDate,
      notes:       member.notes,
    });
    setEditingMember(member);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingMember) {
      await updateTeamMember(editingMember.id, form as Partial<TeamMember>);
    } else {
      await createTeamMember(form as Omit<TeamMember, "id" | "createdAt">);
    }
    setModal(null);
  };

  // Filter by search text and/or division dropdown.
  const filtered = team.filter(member => {
    const matchesSearch = !search
      || member.name.toLowerCase().includes(search.toLowerCase())
      || member.school.toLowerCase().includes(search.toLowerCase())
      || member.slackHandle.toLowerCase().includes(search.toLowerCase());
    // Guard: divisions may be undefined if Firebase omitted the empty array.
    const matchesDivision = !filterDiv || (member.divisions ?? []).includes(filterDiv);
    return matchesSearch && matchesDivision;
  });

  const handleSort = (i: number) => {
    if (sortCol === i) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(i); setSortDir("asc"); }
  };
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 0: cmp = a.name.localeCompare(b.name); break;
      case 1: cmp = (a.school || "").localeCompare(b.school || ""); break;
      case 2: cmp = a.role.localeCompare(b.role); break;
      case 3: cmp = ((a.divisions ?? [])[0] || "").localeCompare((b.divisions ?? [])[0] || ""); break;
      case 4: cmp = a.status.localeCompare(b.status); break;
      case 5: cmp = (a.slackHandle || "").localeCompare(b.slackHandle || ""); break;
      default: return 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const activeMembers = team.filter(m => m.status === "Active");

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Team Directory"
        subtitle={`${activeMembers.length} active · ${team.filter(m => m.role === "Team Lead").length} team leads`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ Add Member</Btn> : undefined}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total" value={team.length} />
        <StatCard label="Active" value={activeMembers.length} color="text-green-400" />
        <StatCard label="Team Leads" value={team.filter(m => m.role === "Team Lead").length} color="text-blue-400" />
        <StatCard label="Alumni" value={team.filter(m => m.status === "Alumni").length} color="text-white/40" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search members, schools…" />
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Team member list */}
      <Table
        cols={["Name", "School", "Role", "Division(s)", "Status", "Slack", "Actions"]}
        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} sortableCols={[0,1,2,3,4,5]}
        rows={sorted.map(member => {
          // Guard: divisions may be undefined if Firebase omitted the empty array.
          const divisions = member.divisions ?? [];
          return [
            <div key="name" className="flex items-center gap-2.5">
              {/* Avatar with first initial */}
              <div className="w-8 h-8 rounded-full bg-[#85CC17]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#85CC17] text-sm font-bold">{member.name[0]?.toUpperCase()}</span>
              </div>
              <span className="text-white font-medium">{member.name}</span>
            </div>,
            <span key="school" className="text-white/50">{member.school || "—"}</span>,
            <Badge key="role" label={member.role} />,
            <div key="divisions" className="flex flex-wrap gap-1">
              {divisions.slice(0, 2).map(div => (
                <span key={div} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full">{div}</span>
              ))}
            </div>,
            <Badge key="status" label={member.status} />,
            <span key="slack" className="text-white/40 font-mono text-xs">
              {member.slackHandle ? `@${member.slackHandle}` : "—"}
            </span>,
            <div key="actions" className="flex gap-2">
              {canEdit && <Btn size="sm" variant="ghost" onClick={() => openEdit(member)}>Edit</Btn>}
              {canEdit && <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteTeamMember(member.id))}>Del</Btn>}
            </div>,
          ];
        })}
      />
      {filtered.length === 0 && (
        <Empty
          message="No team members."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first member</Btn> : undefined}
        />
      )}

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingMember ? "Edit Member" : "New Member"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Full Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="School">
            <Input value={form.school} onChange={e => setField("school", e.target.value)} />
          </Field>
          <Field label="Role">
            <Select options={MEMBER_ROLES} value={form.role} onChange={e => setField("role", e.target.value)} />
          </Field>
          <Field label="Status">
            <Select options={STATUSES} value={form.status} onChange={e => setField("status", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
          </Field>
          <Field label="Slack Handle">
            <Input value={form.slackHandle} onChange={e => setField("slackHandle", e.target.value)} placeholder="no @ needed" />
          </Field>
          <Field label="Pod / Team">
            <Input value={form.pod} onChange={e => setField("pod", e.target.value)} />
          </Field>
          <Field label="Join Date">
            <Input type="date" value={form.joinDate} onChange={e => setField("joinDate", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Divisions">
              <TagInput values={form.divisions} onChange={v => setField("divisions", v)} options={DIVISIONS} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Skills">
              <TagInput values={form.skills} onChange={v => setField("skills", v)} options={SKILL_OPTIONS} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes">
              <TextArea rows={2} value={form.notes} onChange={e => setField("notes", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingMember ? "Save" : "Add Member"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
