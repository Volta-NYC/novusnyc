"use client";

import { useRef, useState, useEffect } from "react";
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

type ImportedMember = {
  name: string;
  email: string;
  school: string;
};

function normalizeText(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

function normalizeKey(v: string): string {
  return normalizeText(v).toLowerCase();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current);
  return cells.map((c) => c.trim());
}

function parseCsv(csvText: string): string[][] {
  return csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map(parseCsvLine);
}

function headerKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(headerKey);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

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
  const [importingCsv, setImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleImportCsv = async (file: File) => {
    setImportingCsv(true);
    setImportMessage(null);
    try {
      const csvText = await file.text();
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        setImportMessage("CSV must include a header row and at least one data row.");
        return;
      }

      const headers = rows[0];
      const nameIdx = findHeaderIndex(headers, ["name", "full name", "student name"]);
      const emailIdx = findHeaderIndex(headers, ["email", "email address", "student email"]);
      const schoolIdx = findHeaderIndex(headers, ["high school", "high school name", "school", "school name"]);

      if (nameIdx === -1 || emailIdx === -1 || schoolIdx === -1) {
        setImportMessage("CSV needs columns for Name, Email, and High School.");
        return;
      }

      const rawEntries: ImportedMember[] = [];
      let invalidRows = 0;

      for (const row of rows.slice(1)) {
        const name = normalizeText(row[nameIdx] ?? "");
        const email = normalizeText(row[emailIdx] ?? "");
        const school = normalizeText(row[schoolIdx] ?? "");
        if (!name) {
          invalidRows += 1;
          continue;
        }
        rawEntries.push({ name, email, school });
      }

      const deduped: ImportedMember[] = [];
      const seenEmail = new Map<string, ImportedMember>();
      const seenNameSchool = new Map<string, ImportedMember>();

      for (const entry of rawEntries) {
        const emailKey = normalizeKey(entry.email);
        const nameSchoolKey = `${normalizeKey(entry.name)}|${normalizeKey(entry.school)}`;

        if (emailKey) {
          const existing = seenEmail.get(emailKey);
          if (existing) {
            if (!existing.school && entry.school) existing.school = entry.school;
            if (!existing.name && entry.name) existing.name = entry.name;
            continue;
          }
          seenEmail.set(emailKey, { ...entry });
          deduped.push(seenEmail.get(emailKey)!);
          continue;
        }

        if (seenNameSchool.has(nameSchoolKey)) continue;
        seenNameSchool.set(nameSchoolKey, entry);
        deduped.push(entry);
      }

      const existingByEmail = new Map<string, TeamMember>();
      const existingByNameSchool = new Map<string, TeamMember>();
      const existingByName = new Map<string, TeamMember[]>();

      for (const member of team) {
        const memberEmailKey = normalizeKey(member.email ?? "");
        const memberNameKey = normalizeKey(member.name ?? "");
        const memberNameSchoolKey = `${memberNameKey}|${normalizeKey(member.school ?? "")}`;
        if (memberEmailKey) existingByEmail.set(memberEmailKey, member);
        if (memberNameKey) {
          const arr = existingByName.get(memberNameKey) ?? [];
          arr.push(member);
          existingByName.set(memberNameKey, arr);
        }
        existingByNameSchool.set(memberNameSchoolKey, member);
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;
      const today = new Date().toISOString().split("T")[0];

      for (const entry of deduped) {
        const emailKey = normalizeKey(entry.email);
        const nameKey = normalizeKey(entry.name);
        const nameSchoolKey = `${nameKey}|${normalizeKey(entry.school)}`;

        const existingByExactEmail = emailKey ? existingByEmail.get(emailKey) : undefined;
        if (existingByExactEmail) {
          const patch: Partial<TeamMember> = {};
          if (entry.name && entry.name !== existingByExactEmail.name) patch.name = entry.name;
          if (entry.school && entry.school !== existingByExactEmail.school) patch.school = entry.school;
          if (!existingByExactEmail.email && entry.email) patch.email = entry.email;
          if (Object.keys(patch).length > 0) {
            // eslint-disable-next-line no-await-in-loop
            await updateTeamMember(existingByExactEmail.id, patch);
            updated += 1;
          } else {
            skipped += 1;
          }
          continue;
        }

        if (!emailKey) {
          if (existingByNameSchool.has(nameSchoolKey)) {
            skipped += 1;
            continue;
          }
        } else {
          const sameName = existingByName.get(nameKey) ?? [];
          const namematchWithoutEmail = sameName.find((m) => !normalizeKey(m.email ?? ""));
          if (namematchWithoutEmail) {
            const patch: Partial<TeamMember> = { email: entry.email };
            if (entry.school) patch.school = entry.school;
            // eslint-disable-next-line no-await-in-loop
            await updateTeamMember(namematchWithoutEmail.id, patch);
            updated += 1;
            existingByEmail.set(emailKey, { ...namematchWithoutEmail, ...patch });
            continue;
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await createTeamMember({
          name: entry.name,
          email: entry.email,
          school: entry.school,
          divisions: [],
          pod: "",
          role: "Member",
          slackHandle: "",
          status: "Active",
          skills: [],
          joinDate: today,
          notes: "",
        });
        added += 1;
      }

      setImportMessage(
        `Imported ${rows.length - 1} rows: ${added} added, ${updated} updated, ${skipped} skipped${invalidRows ? `, ${invalidRows} invalid` : ""}.`
      );
    } catch {
      setImportMessage("Could not import CSV. Check formatting and try again.");
    } finally {
      setImportingCsv(false);
    }
  };

  const onCsvInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImportCsv(file);
    e.target.value = "";
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
      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onCsvInputChange}
        />
      )}

      <PageHeader
        title="Team Directory"
        subtitle={`${activeMembers.length} active · ${team.filter(m => m.role === "Team Lead").length} team leads`}
        action={canEdit ? (
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importingCsv}>
              {importingCsv ? "Importing..." : "Import CSV"}
            </Btn>
            <Btn variant="primary" onClick={openCreate}>+ Add Member</Btn>
          </div>
        ) : undefined}
      />
      {importMessage && (
        <p className="text-xs text-white/55 mb-4">{importMessage}</p>
      )}

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
              {canEdit && <Btn size="sm" variant="secondary" onClick={() => openEdit(member)}>Edit</Btn>}
              {canEdit && <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteTeamMember(member.id))}>Delete</Btn>}
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
