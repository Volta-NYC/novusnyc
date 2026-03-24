"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Field, TextArea, Btn, Empty,
} from "@/components/members/ui";
import { subscribeTeam, subscribeBusinesses, type TeamMember, type Business } from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];

type DeliveryMode = "to" | "cc" | "bcc";

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getMemberTrack(member: TeamMember): "Tech" | "Marketing" | "Finance" | "Other" | "—" {
  const divisions = member.divisions ?? [];
  if (divisions.includes("Tech")) return "Tech";
  if (divisions.includes("Marketing")) return "Marketing";
  if (divisions.includes("Finance")) return "Finance";
  if (divisions.includes("Other") || divisions.includes("Outreach")) return "Other";
  return "—";
}

function isInactiveMember(member: TeamMember): boolean {
  return normalizeToken(member.status ?? "") === "inactive";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function MemberEmailPage() {
  const { authRole, user } = useAuth();
  const canUseEmail = authRole === "admin";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [fromAddress, setFromAddress] = useState<string>("info@voltanyc.org");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deliveryModeById, setDeliveryModeById] = useState<Record<string, DeliveryMode>>({});
  const [defaultNewRecipientMode, setDefaultNewRecipientMode] = useState<DeliveryMode>("to");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contentMode, setContentMode] = useState<"plain" | "html">("plain");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

  const activeProjectAssignedNameKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const business of businesses) {
      const status = normalizeToken(business.projectStatus ?? "");
      const isActiveProject = status === "ongoing" || status === "active";
      if (!isActiveProject) continue;
      const assigned = [...(business.teamMembers ?? []), business.teamLead ?? ""];
      for (const raw of assigned) {
        const key = normalizeToken(String(raw ?? ""));
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [businesses]);

  const getMemberIndicator = (member: TeamMember): { colorClass: string; label: string } => {
    if (isInactiveMember(member)) return { colorClass: "bg-red-400", label: "Inactive" };
    if (activeProjectAssignedNameKeys.has(normalizeToken(member.name ?? ""))) {
      return { colorClass: "bg-emerald-400", label: "Assigned to active project" };
    }
    return { colorClass: "bg-yellow-400", label: "Not assigned to active project" };
  };

  const normalizedSearch = memberSearch.trim().toLowerCase();

  const filteredMembers = useMemo(
    () =>
      team.filter((member) => {
        const searchable = [
          member.name,
          member.email,
          member.alternateEmail,
          member.school,
          member.grade,
          member.status,
          ...(member.divisions ?? []),
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");
        const textMatch = normalizedSearch.length > 0 && searchable.includes(normalizedSearch);
        return textMatch;
      }).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [team, normalizedSearch],
  );

  const selectableFilteredMembers = useMemo(
    () => filteredMembers.filter((member) => !isInactiveMember(member)),
    [filteredMembers],
  );

  const selectedMembers = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return team
      .filter((member) => selectedSet.has(member.id) && !isInactiveMember(member))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [selectedIds, team]);

  const selectedRecipients = useMemo(() => {
    return selectedMembers
      .map((member) => {
        const email = normalizeEmail(member.email ?? "");
        const mode = deliveryModeById[member.id] ?? defaultNewRecipientMode;
        return { id: member.id, email, mode, name: member.name };
      })
      .filter((item) => !!item.email);
  }, [defaultNewRecipientMode, deliveryModeById, selectedMembers]);

  const toRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "to").map((recipient) => recipient.email))),
    [selectedRecipients],
  );
  const ccRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "cc").map((recipient) => recipient.email))),
    [selectedRecipients],
  );
  const bccRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "bcc").map((recipient) => recipient.email))),
    [selectedRecipients],
  );

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => {
        const member = team.find((entry) => entry.id === id);
        return !!member && !isInactiveMember(member);
      }),
    );
  }, [team]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (!deliveryModeById[id]) {
          setDeliveryModeById((current) => ({ ...current, [id]: defaultNewRecipientMode }));
        }
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const setRecipientMode = (id: string, mode: DeliveryMode) => {
    setDeliveryModeById((prev) => ({ ...prev, [id]: mode }));
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableFilteredMembers.forEach((member) => next.add(member.id));
      return Array.from(next);
    });
    setDeliveryModeById((prev) => {
      const next = { ...prev };
      selectableFilteredMembers.forEach((member) => {
        if (!next[member.id]) next[member.id] = defaultNewRecipientMode;
      });
      return next;
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
    const totalRecipients = toRecipients.length + ccRecipients.length + bccRecipients.length;
    if (totalRecipients === 0) {
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
          toRecipients,
          ccRecipients,
          bccRecipients,
        }),
      });
      if (!response.ok) {
        setStatus("Could not send email.");
        return;
      }
      const payload = await response.json() as {
        sent?: number;
        failed?: string[];
        from?: string;
        counts?: { to?: number; cc?: number; bcc?: number };
      };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      const counts = payload.counts ?? {};
      const breakdown = `To ${counts.to ?? toRecipients.length} · CC ${counts.cc ?? ccRecipients.length} · BCC ${counts.bcc ?? bccRecipients.length}`;
      setStatus(
        failedCount > 0
          ? `Sent from ${payload.from ?? fromAddress} to ${sentCount}. Failed: ${failedCount}. ${breakdown}`
          : `Sent from ${payload.from ?? fromAddress} to ${sentCount}. ${breakdown}`,
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
        <PageHeader title="Member Email" />
        <Empty message="You do not have permission to use bulk member email." />
      </MembersLayout>
    );
  }

  const totalSelected = toRecipients.length + ccRecipients.length + bccRecipients.length;

  return (
    <MembersLayout>
      <PageHeader title="Member Email" />

      <div className="space-y-4">
        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Recipients</h2>
              <span className="text-xs text-white/50">
                To {toRecipients.length} · CC {ccRecipients.length} · BCC {bccRecipients.length}
              </span>
            </div>

            <div className="members-table-shell max-h-[240px] overflow-x-auto overflow-y-auto bg-[#11151D]">
              <table className="members-grid-table w-full min-w-[1100px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#10131A] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[220px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[250px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[88px]">Track</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[220px]">School</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[90px]">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedMembers.map((member) => {
                    const track = getMemberTrack(member);
                    const indicator = getMemberIndicator(member);
                    const mode = deliveryModeById[member.id] ?? defaultNewRecipientMode;
                    return (
                      <tr key={`selected-${member.id}`} className="hover:bg-white/5 bg-[#85CC17]/6">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked
                            onChange={(e) => toggleSelected(member.id, e.target.checked)}
                            className="members-checkbox"
                          />
                        </td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="truncate">{member.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{track}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mode}
                            onChange={(e) => setRecipientMode(member.id, (e.target.value as DeliveryMode) || "to")}
                            className="h-8 w-full rounded-lg border border-white/10 bg-[#0F1014] px-2 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                          >
                            <option value="to">To</option>
                            <option value="cc">CC</option>
                            <option value="bcc">BCC</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/35">No recipients selected yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name, email, school, grade, or track…"
                className="w-full h-12 rounded-lg border border-white/10 bg-[#0F1014] pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#85CC17]/45"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-white/55">
                {totalSelected} selected · {filteredMembers.length} matching search
                {filteredMembers.length !== selectableFilteredMembers.length ? ` · ${filteredMembers.length - selectableFilteredMembers.length} inactive` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/40">Default mode:</span>
                <select
                  value={defaultNewRecipientMode}
                  onChange={(e) => setDefaultNewRecipientMode((e.target.value as DeliveryMode) || "to")}
                  className="h-8 rounded-lg border border-white/10 bg-[#0F1014] px-2.5 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                >
                  <option value="to">To</option>
                  <option value="cc">CC</option>
                  <option value="bcc">BCC</option>
                </select>
                <Btn size="sm" variant="secondary" onClick={selectAllFiltered} disabled={filteredMembers.length === 0}>
                  Select filtered
                </Btn>
                <Btn
                  size="sm"
                  variant="secondary"
                  disabled={filteredMembers.length === 0}
                  className="!text-red-300 !border-red-400/30 !bg-red-500/10 hover:!bg-red-500/20"
                  onClick={clearFiltered}
                >
                  Clear filtered
                </Btn>
              </div>
            </div>

            <div className="members-table-shell max-h-[420px] overflow-x-auto overflow-y-auto">
              <table className="members-grid-table w-full min-w-[1100px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#141821] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[220px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[250px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[88px]">Track</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[220px]">School</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((member) => {
                    const checked = selectedIds.includes(member.id);
                    const inactive = isInactiveMember(member);
                    const indicator = getMemberIndicator(member);
                    const track = getMemberTrack(member);
                    return (
                      <tr key={member.id} className={`hover:bg-white/5 ${checked ? "bg-[#85CC17]/6" : ""} ${inactive ? "opacity-50 bg-white/[0.02]" : ""}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked && !inactive}
                            onChange={(e) => toggleSelected(member.id, e.target.checked)}
                            disabled={inactive}
                            className="members-checkbox"
                          />
                        </td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="truncate">{member.name}</span>
                          </span>
                          {inactive && <span className="text-white/35 ml-2">(inactive)</span>}
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{track}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-white/35">
                        {normalizedSearch ? "No members match this search." : "Start typing to search members."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Field label="Subject" required>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
          />
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
            disabled={sending || totalSelected === 0}
          >
            {sending ? "Sending..." : `Send Emails (${totalSelected})`}
          </Btn>
        </div>
      </div>
    </MembersLayout>
  );
}
