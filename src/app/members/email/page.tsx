"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Field, TextArea, Btn, Empty,
} from "@/components/members/ui";
import {
  subscribeTeam,
  subscribeBusinesses,
  subscribeFinanceAssignments,
  type TeamMember,
  type Business,
  type FinanceAssignment,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];

type DeliveryMode = "to" | "cc" | "bcc";
type AssignmentCodePrefix = "W" | "M" | "R" | "C";
type TrackKey = "Tech" | "Marketing" | "Finance" | "Other" | "—";

type MemberAssignmentLink = {
  id: string;
  title: string;
  codePrefix: AssignmentCodePrefix;
  code: string;
  href: string;
};

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getMemberTrack(member: TeamMember): TrackKey {
  const divisions = member.divisions ?? [];
  if (divisions.includes("Tech")) return "Tech";
  if (divisions.includes("Marketing")) return "Marketing";
  if (divisions.includes("Finance")) return "Finance";
  if (divisions.includes("Other") || divisions.includes("Outreach")) return "Other";
  return "—";
}

function getTrackAvatarStyles(track: TrackKey): { bg: string; text: string } {
  switch (track) {
    case "Tech":
      return { bg: "#DBEAFE", text: "#1E3A8A" };
    case "Marketing":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "Finance":
      return { bg: "#DCFCE7", text: "#166534" };
    case "Other":
      return { bg: "#F3F4F6", text: "#374151" };
    default:
      return { bg: "rgba(133,204,23,0.15)", text: "#85CC17" };
  }
}

function TrackAvatarIcon({ track, color }: { track: TrackKey; color: string }) {
  if (track === "Tech") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 8L3 12L8 16" />
        <path d="M16 8L21 12L16 16" />
      </svg>
    );
  }
  if (track === "Marketing") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20l4.5-1.2L19 8.3a1.6 1.6 0 0 0 0-2.2l-1.1-1.1a1.6 1.6 0 0 0-2.2 0L5.2 15.5L4 20z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    );
  }
  if (track === "Finance") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M7 16v-4" />
        <path d="M12 16V9" />
        <path d="M17 16v-10" />
      </svg>
    );
  }
  return (
    <span className="text-[11px] font-semibold leading-none" style={{ color }} aria-hidden="true">
      –
    </span>
  );
}

function isInactiveMember(member: TeamMember): boolean {
  return normalizeToken(member.status ?? "") === "inactive";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAssignmentNames(assignment: FinanceAssignment): string[] {
  const raw = (assignment as { assignedMemberNames?: unknown }).assignedMemberNames;
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function readAssignmentIds(assignment: FinanceAssignment): string[] {
  const raw = (assignment as { assignedMemberIds?: unknown }).assignedMemberIds;
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export default function MemberEmailPage() {
  const { authRole, user } = useAuth();
  const canUseEmail = authRole === "admin";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
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
  const [prefillIds, setPrefillIds] = useState<string[]>([]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("prefill");
    if (!raw) return;
    const ids = raw.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setPrefillIds(ids);
  }, []);

  const resolvedFinanceMemberKeysByAssignment = useMemo(() => {
    const map = new Map<string, string[]>();
    const teamRows = team.map((member) => {
      const full = normalizeToken(member.name ?? "");
      const first = normalizeToken((member.name ?? "").split(/\s+/)[0] ?? "");
      return { id: member.id, full, first };
    }).filter((row) => row.full);
    const fullById = new Map(teamRows.map((row) => [row.id, row.full]));

    const resolveName = (rawName: string): string[] => {
      const rawKey = normalizeToken(rawName ?? "");
      if (!rawKey) return [];
      const exactFull = teamRows.filter((row) => row.full === rawKey);
      if (exactFull.length === 1) return [exactFull[0].full];
      if (exactFull.length > 1) return exactFull.map((row) => row.full);
      const firstMatches = teamRows.filter((row) => row.first && row.first === rawKey);
      if (firstMatches.length === 1) return [firstMatches[0].full];
      const containsMatches = teamRows.filter((row) => row.full.includes(rawKey) || rawKey.includes(row.full));
      if (containsMatches.length === 1) return [containsMatches[0].full];
      return [rawKey];
    };

    for (const assignment of financeAssignments) {
      const keySet = new Set<string>();
      for (const memberId of readAssignmentIds(assignment)) {
        const memberKey = fullById.get(memberId);
        if (memberKey) keySet.add(memberKey);
      }
      for (const memberName of readAssignmentNames(assignment)) {
        for (const resolved of resolveName(memberName)) keySet.add(resolved);
      }
      map.set(assignment.id, Array.from(keySet));
    }
    return map;
  }, [financeAssignments, team]);

  const assignmentsByMemberName = useMemo(() => {
    const map = new Map<string, MemberAssignmentLink[]>();
    const pushForMemberName = (memberName: string, item: Omit<MemberAssignmentLink, "code">) => {
      const key = normalizeToken(memberName);
      if (!key) return;
      const current = map.get(key) ?? [];
      current.push({ ...item, code: "" });
      map.set(key, current);
    };

    for (const business of businesses) {
      const legacyAssignedNames = [...(business.teamMembers ?? []), business.teamLead ?? ""]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean)
        .filter((name, index, arr) => arr.indexOf(name) === index);
      const trackProjects = business.trackProjects ?? {};
      const requestedTracks = Array.isArray(business.projectTracks)
        ? business.projectTracks.map((track) => String(track ?? "").trim()).filter(Boolean)
        : [];
      const explicitTracks = Object.keys(trackProjects).map((track) => String(track ?? "").trim()).filter(Boolean);
      const allTracks = Array.from(new Set([...requestedTracks, ...explicitTracks]));
      const trackOrder: Array<"Tech" | "Marketing" | "Finance"> = ["Tech", "Marketing", "Finance"];
      const hasTrackSpecificAssignments = allTracks.length > 0;
      const hasAnyExplicitTrackTeamMembers = trackOrder.some((track) => {
        if (!allTracks.includes(track)) return false;
        const info = (trackProjects as Record<string, unknown>)[track];
        if (!info || typeof info !== "object") return false;
        const raw = (info as { teamMembers?: unknown }).teamMembers;
        return Array.isArray(raw);
      });

      if (!hasTrackSpecificAssignments) {
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: business.id,
          title: business.name || "Untitled Project",
          codePrefix: "W",
          href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
        };
        for (const memberName of legacyAssignedNames) pushForMemberName(memberName, entry);
        continue;
      }

      for (const track of trackOrder) {
        if (!allTracks.includes(track)) continue;
        const trackInfo = (trackProjects as Record<string, unknown>)[track];
        const rawMembers = trackInfo && typeof trackInfo === "object"
          ? (trackInfo as { teamMembers?: unknown }).teamMembers
          : [];
        const trackMembers = Array.isArray(rawMembers)
          ? rawMembers.map((name) => String(name ?? "").trim()).filter(Boolean)
          : [];
        const fallbackMembers = hasAnyExplicitTrackTeamMembers ? [] : legacyAssignedNames;
        const assignedNames = Array.from(new Set(trackMembers.length > 0 ? trackMembers : fallbackMembers));
        if (assignedNames.length === 0) continue;
        const codePrefix: AssignmentCodePrefix = track === "Marketing" ? "M" : "W";
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: `${business.id}-${track.toLowerCase()}`,
          title: business.name || "Untitled Project",
          codePrefix,
          href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
        };
        for (const memberName of assignedNames) pushForMemberName(memberName, entry);
      }
    }

    for (const assignment of financeAssignments) {
      const assignmentType = String(assignment.type ?? "").trim().toLowerCase();
      const codePrefix: AssignmentCodePrefix = assignmentType === "case study" ? "C" : "R";
      const assignmentTypeLabel =
        assignmentType === "case study" ? "Case Study"
          : assignmentType === "grant" ? "Grant"
            : "Report";
      const region = String(assignment.region ?? "").trim();
      const assignmentDisplayTitle = region ? `${region} ${assignmentTypeLabel}` : assignmentTypeLabel;
      const entry: Omit<MemberAssignmentLink, "code"> = {
        id: assignment.id,
        title: assignmentDisplayTitle,
        codePrefix,
        href: `/members/assignments?assignmentId=${encodeURIComponent(assignment.id)}#finance-assignment-${assignment.id}`,
      };
      for (const memberKey of resolvedFinanceMemberKeysByAssignment.get(assignment.id) ?? []) {
        pushForMemberName(memberKey, entry);
      }
    }

    const prefixOrder: Record<AssignmentCodePrefix, number> = { W: 0, M: 1, R: 2, C: 3 };
    for (const [key, items] of Array.from(map.entries())) {
      map.set(
        key,
        items
          .slice()
          .sort((a, b) => {
            const prefixCmp = prefixOrder[a.codePrefix] - prefixOrder[b.codePrefix];
            if (prefixCmp !== 0) return prefixCmp;
            return a.title.localeCompare(b.title);
          })
          .map((item, index, arr) => {
            const seen = arr.slice(0, index).filter((entry) => entry.codePrefix === item.codePrefix).length;
            return {
              ...item,
              code: `${item.codePrefix}${seen + 1}`,
            };
          }),
      );
    }
    return map;
  }, [businesses, financeAssignments, resolvedFinanceMemberKeysByAssignment]);

  const memberAssignmentsById = useMemo(() => {
    const map = new Map<string, MemberAssignmentLink[]>();
    for (const member of team) {
      map.set(member.id, assignmentsByMemberName.get(normalizeToken(member.name ?? "")) ?? []);
    }
    return map;
  }, [assignmentsByMemberName, team]);

  const getMemberIndicator = (member: TeamMember): { colorClass: string; label: string } => {
    if (isInactiveMember(member)) return { colorClass: "bg-red-400", label: "Inactive" };
    const memberAssignments = memberAssignmentsById.get(member.id) ?? [];
    if (memberAssignments.length > 0) {
      return { colorClass: "bg-emerald-400", label: "Assigned to at least one project or assignment" };
    }
    return { colorClass: "bg-yellow-400", label: "No project or assignment linked" };
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
        const textMatch = normalizedSearch.length === 0 || searchable.includes(normalizedSearch);
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

  const prefillKey = prefillIds.join(",");
  const [appliedPrefillKey, setAppliedPrefillKey] = useState("");

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

  useEffect(() => {
    if (!prefillKey || prefillKey === appliedPrefillKey || team.length === 0) return;
    const validSet = new Set(
      team
        .filter((member) => prefillIds.includes(member.id))
        .filter((member) => !isInactiveMember(member) && !!normalizeEmail(member.email ?? ""))
        .map((member) => member.id),
    );
    if (validSet.size === 0) {
      setAppliedPrefillKey(prefillKey);
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...Array.from(validSet)])));
    setDeliveryModeById((prev) => {
      const next = { ...prev };
      for (const id of Array.from(validSet)) {
        if (!next[id]) next[id] = defaultNewRecipientMode;
      }
      return next;
    });
    setAppliedPrefillKey(prefillKey);
  }, [appliedPrefillKey, defaultNewRecipientMode, prefillIds, prefillKey, team]);

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

  const renderProjectCodes = (member: TeamMember, keyPrefix: string) => {
    const assignments = memberAssignmentsById.get(member.id) ?? [];
    if (assignments.length === 0) {
      return <span className="text-white/35">—</span>;
    }
    return (
      <div className="members-assignments-scroll w-[148px] max-w-[148px] overflow-x-auto overflow-y-hidden pb-0.5">
        <div className="inline-flex min-w-max items-center gap-1 pr-1">
          {assignments.map((item) => (
            <a
              key={`${keyPrefix}-${item.id}-${item.code}`}
              href={item.href}
              className="inline-flex h-5 w-10 items-center justify-center rounded-full border border-white/15 bg-[#11141A] px-1 text-[10px] font-semibold text-white/80 hover:border-[#85CC17]/55 hover:text-[#C4F135] transition-colors"
              title={`${item.code} · ${item.title}`}
            >
              {item.code}
            </a>
          ))}
        </div>
      </div>
    );
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

            <div className="members-table-shell members-scroll-hidden max-h-[240px] overflow-x-auto overflow-y-auto bg-[#11151D]">
              <table className="members-grid-table members-email-grid w-full min-w-[1480px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#10131A] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[200px]">Projects</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[260px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[340px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[300px]">School</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[120px]">Grade</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[120px]">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedMembers.map((member) => {
                    const track = getMemberTrack(member);
                    const avatar = getTrackAvatarStyles(track);
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
                        <td className="px-3 py-2 whitespace-nowrap">{renderProjectCodes(member, `selected-${member.id}`)}</td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="members-no-cell-scroll inline-flex items-center gap-2 min-w-0 max-w-full">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                              <TrackAvatarIcon track={track} color={avatar.text} />
                            </span>
                            <span className="truncate block max-w-[190px]" title={member.name || "—"}>{member.name || "—"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{member.grade || "—"}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mode}
                            onChange={(e) => setRecipientMode(member.id, (e.target.value as DeliveryMode) || "to")}
                            className="members-no-cell-scroll h-8 w-full rounded-lg border border-white/10 bg-[#0F1014] px-2 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
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
                      <td colSpan={7} className="px-3 py-6 text-center text-white/35">No recipients selected yet.</td>
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

            <div className="members-table-shell members-scroll-hidden max-h-[420px] overflow-x-auto overflow-y-auto">
              <table className="members-grid-table members-email-grid w-full min-w-[1460px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#141821] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[200px]">Projects</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[260px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[340px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[320px]">School</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[120px]">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((member) => {
                    const checked = selectedIds.includes(member.id);
                    const inactive = isInactiveMember(member);
                    const indicator = getMemberIndicator(member);
                    const track = getMemberTrack(member);
                    const avatar = getTrackAvatarStyles(track);
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
                        <td className="px-3 py-2 whitespace-nowrap">{renderProjectCodes(member, `search-${member.id}`)}</td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="members-no-cell-scroll inline-flex items-center gap-2 min-w-0 max-w-full">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                              <TrackAvatarIcon track={track} color={avatar.text} />
                            </span>
                            <span className="truncate block max-w-[190px]" title={member.name || "—"}>{member.name || "—"}</span>
                          </span>
                          {inactive && <span className="text-white/35 ml-2">(inactive)</span>}
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{member.grade || "—"}</td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/35">
                        {normalizedSearch ? "No members match this search." : "No members found."}
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
