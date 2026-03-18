"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Field, Input, TextArea, Btn, AutocompleteTagInput, Empty,
} from "@/components/members/ui";
import { subscribeTeam, type TeamMember } from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function MemberEmailPage() {
  const { authRole, user } = useAuth();
  const canUseEmail = authRole === "admin" || authRole === "project_lead";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [fromAddress, setFromAddress] = useState<string>("info@voltanyc.org");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contentMode, setContentMode] = useState<"plain" | "html">("plain");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => subscribeTeam(setTeam), []);

  const divisionOptions = ["Tech", "Marketing", "Finance", "Other"];
  const schoolOptions = useMemo(
    () => Array.from(new Set(team.map((m) => (m.school ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [team],
  );
  const roleOptions = useMemo(
    () => Array.from(new Set(team.map((m) => (m.role ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [team],
  );
  const teamOptions = useMemo(
    () => Array.from(new Set(team.map((m) => (m.pod ?? "").trim()).filter((v) => v && v !== "—"))).sort((a, b) => a.localeCompare(b)),
    [team],
  );

  const normalizedSearch = memberSearch.trim().toLowerCase();

  const filteredMembers = useMemo(
    () =>
      team.filter((member) => {
        const memberDivisions = (member.divisions ?? []).map((d) => normalizeToken(d));
        const selectedDivisions = divisions.map((d) => normalizeToken(d));
        const selectedSchools = schools.map((s) => normalizeToken(s));
        const selectedRoles = roles.map((r) => normalizeToken(r));
        const selectedTeams = teams.map((t) => normalizeToken(t));
        const divisionMatch = selectedDivisions.length === 0 || memberDivisions.some((d) => selectedDivisions.includes(d));
        const schoolMatch = selectedSchools.length === 0 || selectedSchools.includes(normalizeToken(member.school ?? ""));
        const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(normalizeToken(member.role ?? ""));
        const teamMatch = selectedTeams.length === 0 || selectedTeams.includes(normalizeToken(member.pod ?? ""));
        const searchable = [
          member.name,
          member.email,
          member.alternateEmail,
          member.school,
          member.grade,
          member.role,
          member.pod,
          member.status,
          ...(member.divisions ?? []),
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");
        const textMatch = !normalizedSearch || searchable.includes(normalizedSearch);
        return divisionMatch && schoolMatch && roleMatch && teamMatch && textMatch;
      }),
    [team, divisions, schools, roles, teams, normalizedSearch],
  );

  const selectedEmails = useMemo(
    () =>
      Array.from(
        new Set(
          filteredMembers
            .filter((member) => selectedIds.includes(member.id))
            .map((member) => (member.email ?? "").trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    [filteredMembers, selectedIds],
  );

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((value) => value !== id);
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      filteredMembers.forEach((member) => set.add(member.id));
      return Array.from(set);
    });
  };

  const clearFiltered = () => {
    const removeSet = new Set(filteredMembers.map((member) => member.id));
    setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
  };

  const sendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      setStatus("Please add a subject and message.");
      return;
    }
    if (selectedEmails.length === 0) {
      setStatus("No recipients selected.");
      return;
    }
    if (!user) {
      setStatus("Not authenticated.");
      return;
    }
    setSending(true);
    setStatus("Sending…");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/members/team-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAddress,
          subject: subject.trim(),
          message: message.trim(),
          contentMode,
          recipients: selectedEmails,
        }),
      });
      if (!response.ok) {
        setStatus("Could not send email.");
        return;
      }
      const payload = await response.json() as { sent?: number; failed?: string[]; from?: string };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      setStatus(
        failedCount > 0
          ? `Sent from ${payload.from ?? fromAddress} to ${sentCount}. Failed: ${failedCount}.`
          : `Sent from ${payload.from ?? fromAddress} to ${sentCount} members.`,
      );
    } catch {
      setStatus("Could not send email.");
    } finally {
      setSending(false);
    }
  };

  if (!canUseEmail) {
    return (
      <MembersLayout>
        <PageHeader title="Member Email" subtitle="Project lead or admin access required" />
        <Empty message="You do not have permission to use bulk member email." />
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <PageHeader title="Member Email" subtitle="Filter recipients, then send one message to all selected members." />

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Division">
            <AutocompleteTagInput
              values={divisions}
              onChange={setDivisions}
              options={divisionOptions}
              placeholder="Type division…"
            />
          </Field>
          <Field label="School">
            <AutocompleteTagInput
              values={schools}
              onChange={setSchools}
              options={schoolOptions}
              placeholder="Type school…"
            />
          </Field>
          <Field label="Role">
            <AutocompleteTagInput
              values={roles}
              onChange={setRoles}
              options={roleOptions}
              placeholder="Type role…"
            />
          </Field>
          <Field label="Team">
            <AutocompleteTagInput
              values={teams}
              onChange={setTeams}
              options={teamOptions}
              placeholder="Type team…"
            />
          </Field>
        </div>

        <Field label="Search Members">
          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search name, email, school, team, role, track, grade..."
          />
        </Field>

        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs text-white/55">
              {selectedEmails.length} selected · {filteredMembers.length} in current filter
            </p>
            <div className="flex gap-2">
              <Btn size="sm" variant="secondary" onClick={selectAllFiltered}>Select filtered</Btn>
              <Btn size="sm" variant="ghost" onClick={clearFiltered}>Clear filtered</Btn>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto border border-white/8 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-[#141821] sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-white/45 w-10">#</th>
                  <th className="text-left px-3 py-2 text-white/45">Name</th>
                  <th className="text-left px-3 py-2 text-white/45">Primary Email</th>
                  <th className="text-left px-3 py-2 text-white/45">School</th>
                  <th className="text-left px-3 py-2 text-white/45">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredMembers.map((member) => {
                  const checked = selectedIds.includes(member.id);
                  return (
                    <tr key={member.id} className={`hover:bg-white/5 ${checked ? "bg-[#85CC17]/6" : ""}`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleSelected(member.id, e.target.checked)}
                          className="appearance-none w-4 h-4 border border-white/20 rounded-sm bg-black/20 checked:bg-[#85CC17] checked:border-[#85CC17] focus:outline-none transition-colors cursor-pointer relative after:content-[''] after:absolute after:hidden checked:after:block after:left-1.5 after:top-0.5 after:w-[3px] after:h-2 after:border-r-2 after:border-b-2 after:border-black after:rotate-45"
                        />
                      </td>
                      <td className="px-3 py-2 text-white/75">{member.name}</td>
                      <td className="px-3 py-2 text-white/65 font-mono">{member.email || "—"}</td>
                      <td className="px-3 py-2 text-white/45">{member.school || "—"}</td>
                      <td className="px-3 py-2 text-white/45">{member.pod || "—"}</td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-white/35">No members in this filter/search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Send from" required>
          <select
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
          >
            {TEAM_EMAIL_FROM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Message Format" required>
          <select
            value={contentMode}
            onChange={(e) => setContentMode(e.target.value === "html" ? "html" : "plain")}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
          >
            <option value="plain">Plain Text</option>
            <option value="html">HTML (links/images supported)</option>
          </select>
        </Field>
        <Field label="Message" required>
          <TextArea
            rows={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              contentMode === "html"
                ? "<p>Hi team,</p><p>Update with <a href=\"https://...\">link</a>.</p><img src=\"https://...\" alt=\"\" />"
                : "Write your email..."
            }
          />
        </Field>

        {status && <p className="text-xs text-white/60">{status}</p>}

        <div className="flex justify-end gap-2">
          <Btn
            variant="primary"
            onClick={sendEmail}
            disabled={sending || selectedEmails.length === 0}
          >
            {sending ? "Sending..." : `Send Emails (${selectedEmails.length})`}
          </Btn>
        </div>
      </div>
    </MembersLayout>
  );
}
