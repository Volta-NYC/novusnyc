"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PEOPLE_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Btn, Modal, Field, Input, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeTeam, createTeamMember, updateTeamMember, deleteTeamMember, subscribeUserProfiles, subscribeBusinesses, subscribeFinanceAssignments, subscribeApplications, type TeamMember, type UserProfile, type Business, type FinanceAssignment, type ApplicationRecord,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

// Blank form values for creating a new team member.
const BLANK_FORM: Omit<TeamMember, "id" | "createdAt"> = {
  grade: "",
  acceptedDate: "",
  name: "", school: "", divisions: [], pod: "", role: "Member", slackHandle: "",
  email: "", alternateEmail: "", status: "Active", skills: [], joinDate: "", notes: "",
};

const GRADE_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "College"];
type TrackKey = "Tech" | "Marketing" | "Finance" | "Other" | "—";
type AssignmentCodePrefix = "W" | "M" | "R" | "C";

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
      return { bg: "#ECFCCB", text: "#365314" };
    case "Finance":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "Other":
      return { bg: "#F3F4F6", text: "#374151" };
    default:
      return { bg: "rgba(133,204,23,0.15)", text: "#85CC17" };
  }
}

const TRACK_SORT_ORDER: Record<TrackKey, number> = {
  Tech: 0,
  Marketing: 1,
  Finance: 2,
  Other: 3,
  "—": 4,
};

type ImportedMember = {
  name: string;
  email: string;
  school: string;
  grade: string;
  track: TrackKey;
};

type MemberAssignmentLink = {
  id: string;
  kind: "Business Project" | "Finance Assignment";
  title: string;
  topic?: string;
  codePrefix: AssignmentCodePrefix;
  code: string;
  status: string;
  deadline: string;
  href: string;
};

function normalizeText(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

function normalizeKey(v: string): string {
  return normalizeText(v).toLowerCase();
}

function truncateCell(value: string, max = 64): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
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

function parseDelimitedLine(line: string, delimiter: string): string[] {
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
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current);
  return cells.map((c) => c.trim());
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let inQuotes = false;
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(headerLine: string): string {
  const delimiters = [",", "\t", ";"];
  let best = ",";
  let bestCount = -1;
  for (const d of delimiters) {
    const count = countDelimiterOutsideQuotes(headerLine, d);
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function parseCsv(csvText: string): string[][] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseDelimitedLine(line, delimiter));
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

function parseTrack(raw: string): TrackKey {
  const key = normalizeKey(raw);
  if (!key) return "—";
  if (key.includes("tech") || key.includes("digital")) return "Tech";
  if (key.includes("market")) return "Marketing";
  if (key.includes("finance") || key.includes("operation")) return "Finance";
  if (key.includes("outreach") || key.includes("other")) return "Other";
  return "—";
}

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [team, setTeam]               = useState<TeamMember[]>([]);
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [showAlternateEmail, setShowAlternateEmail] = useState(false);
  const [sortRules, setSortRules]     = useState<{ col: number; dir: "asc" | "desc" }[]>([{ col: 0, dir: "asc" }]);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [expandAssignments, setExpandAssignments] = useState(false);
  const [assignmentDetailMember, setAssignmentDetailMember] = useState<TeamMember | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { ask, Dialog } = useConfirm();
  const { authRole } = useAuth();
  const canEdit = authRole === "admin";
  const isMemberRestricted = authRole === "member";

  // Subscribe to real-time team updates; unsubscribe on unmount.
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);
  useEffect(() => subscribeApplications(setApplications), []);
  useEffect(() => subscribeUserProfiles(setUserProfiles), []);

  const copyText = async (value: string) => {
    const safe = value.trim();
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
    } catch {
      // no-op
    }
  };

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingMember(null);
    setShowAlternateEmail(false);
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
      const schoolIdx = findHeaderIndex(headers, ["school", "school name", "high school", "high school name"]);
      const gradeIdx = findHeaderIndex(headers, ["grade", "year", "class year"]);
      const trackIdx = findHeaderIndex(headers, ["track", "division"]);
      const hasAnySupportedHeader = [nameIdx, emailIdx, schoolIdx, gradeIdx, trackIdx].some((idx) => idx !== -1);

      if (!hasAnySupportedHeader) {
        setImportMessage("CSV must include at least one supported header: Name, Email, School, Grade, or Track.");
        return;
      }

      if (nameIdx === -1 && emailIdx === -1) {
        setImportMessage("CSV must include Name or Email so rows can be matched to members.");
        return;
      }

      const rawEntries: ImportedMember[] = [];
      let invalidRows = 0;

      for (const row of rows.slice(1)) {
        const name = nameIdx === -1 ? "" : normalizeText(row[nameIdx] ?? "");
        const email = emailIdx === -1 ? "" : normalizeText(row[emailIdx] ?? "");
        const school = schoolIdx === -1 ? "" : normalizeText(row[schoolIdx] ?? "");
        const grade = gradeIdx === -1 ? "" : normalizeText(row[gradeIdx] ?? "");
        const track = trackIdx === -1 ? "—" : parseTrack(row[trackIdx] ?? "");
        if (!name && !email) {
          invalidRows += 1;
          continue;
        }
        rawEntries.push({ name, email, school, grade, track });
      }

      const deduped: ImportedMember[] = [];
      const seenEmail = new Map<string, ImportedMember>();
      const seenName = new Map<string, ImportedMember>();

      for (const entry of rawEntries) {
        const emailKey = normalizeKey(entry.email);
        const nameKey = normalizeKey(entry.name);

        if (emailKey) {
          const existing = seenEmail.get(emailKey);
          if (existing) {
            if (!existing.school && entry.school) existing.school = entry.school;
            if (!existing.name && entry.name) existing.name = entry.name;
            if (!existing.grade && entry.grade) existing.grade = entry.grade;
            if (existing.track === "—" && entry.track !== "—") existing.track = entry.track;
            continue;
          }
          seenEmail.set(emailKey, { ...entry });
          deduped.push(seenEmail.get(emailKey)!);
          if (nameKey && !seenName.has(nameKey)) seenName.set(nameKey, seenEmail.get(emailKey)!);
          continue;
        }

        if (nameKey && seenName.has(nameKey)) continue;
        if (nameKey) seenName.set(nameKey, entry);
        deduped.push(entry);
      }

      const existingByEmail = new Map<string, TeamMember>();
      const existingByName = new Map<string, TeamMember[]>();

      for (const member of team) {
        const memberEmailKey = normalizeKey(member.email ?? "");
        const memberAltEmailKey = normalizeKey(member.alternateEmail ?? "");
        const memberNameKey = normalizeKey(member.name ?? "");
        if (memberEmailKey) existingByEmail.set(memberEmailKey, member);
        if (memberAltEmailKey) existingByEmail.set(memberAltEmailKey, member);
        if (memberNameKey) {
          const arr = existingByName.get(memberNameKey) ?? [];
          arr.push(member);
          existingByName.set(memberNameKey, arr);
        }
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;
      let ambiguous = 0;
      const today = new Date().toISOString().split("T")[0];

      for (const entry of deduped) {
        const emailKey = normalizeKey(entry.email);
        const nameKey = normalizeKey(entry.name);
        const nameMatches = nameKey ? (existingByName.get(nameKey) ?? []) : [];
        const emailMatch = emailKey ? existingByEmail.get(emailKey) : undefined;
        const candidateMap = new Map<string, TeamMember>();
        if (emailMatch) candidateMap.set(emailMatch.id, emailMatch);
        nameMatches.forEach((m) => candidateMap.set(m.id, m));
        const candidates = Array.from(candidateMap.values());
        let target: TeamMember | undefined;

        if (candidates.length === 1) {
          [target] = candidates;
        } else if (candidates.length > 1) {
          const exact = candidates.filter((m) => {
            const mName = normalizeKey(m.name ?? "");
            const mPrimaryEmail = normalizeKey(m.email ?? "");
            const mAltEmail = normalizeKey(m.alternateEmail ?? "");
            const nameHit = !!nameKey && mName === nameKey;
            const emailHit = !!emailKey && (mPrimaryEmail === emailKey || mAltEmail === emailKey);
            return nameHit && emailHit;
          });
          if (exact.length === 1) {
            [target] = exact;
          } else {
            ambiguous += 1;
            continue;
          }
        }

        if (target) {
          const patch: Partial<TeamMember> = {};
          if (!normalizeText(target.name ?? "") && entry.name) patch.name = entry.name;
          if (entry.email) {
            const entryEmailKey = normalizeKey(entry.email);
            const primaryEmailKey = normalizeKey(target.email ?? "");
            const altEmailKey = normalizeKey(target.alternateEmail ?? "");
            if (entryEmailKey !== primaryEmailKey && entryEmailKey !== altEmailKey) {
              if (!normalizeText(target.email ?? "")) patch.email = entry.email;
              else if (!normalizeText(target.alternateEmail ?? "")) patch.alternateEmail = entry.email;
            }
          }
          if (!normalizeText(target.school ?? "") && entry.school) patch.school = entry.school;
          if (!normalizeText(target.grade ?? "") && entry.grade) patch.grade = entry.grade;
          if ((target.divisions ?? []).length === 0 && entry.track !== "—") {
            patch.divisions = [entry.track];
          }
          if (Object.keys(patch).length > 0) {
            // eslint-disable-next-line no-await-in-loop
            await updateTeamMember(target.id, patch);
            if (patch.email) {
              existingByEmail.set(normalizeKey(patch.email), { ...target, ...patch } as TeamMember);
            }
            if (patch.alternateEmail) {
              existingByEmail.set(normalizeKey(patch.alternateEmail), { ...target, ...patch } as TeamMember);
            }
            updated += 1;
          } else {
            skipped += 1;
          }
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        await createTeamMember({
          name: entry.name || (entry.email ? entry.email.split("@")[0] : "New Member"),
          email: entry.email,
          alternateEmail: "",
          school: entry.school,
          grade: entry.grade,
          acceptedDate: "",
          divisions: entry.track === "—" ? [] : [entry.track],
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
        `Imported ${rows.length - 1} rows: ${added} added, ${updated} updated, ${skipped} skipped${ambiguous ? `, ${ambiguous} ambiguous name matches` : ""}${invalidRows ? `, ${invalidRows} invalid` : ""}.`
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
      grade:       member.grade ?? "",
      // Guard against undefined: Firebase omits empty arrays when storing.
      divisions:   member.divisions ?? [],
      pod:         "",
      role:        member.role,
      slackHandle: member.slackHandle,
      email:       member.email,
      alternateEmail: member.alternateEmail ?? "",
      status:      member.status,
      skills:      member.skills ?? [],
      joinDate:    member.joinDate,
      acceptedDate: member.acceptedDate ?? "",
      notes:       member.notes,
    });
    setEditingMember(member);
    setShowAlternateEmail(!!(member.alternateEmail ?? "").trim());
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingMember) {
      await updateTeamMember(editingMember.id, { ...(form as Partial<TeamMember>), pod: "" });
    } else {
      await createTeamMember({ ...(form as Omit<TeamMember, "id" | "createdAt">), pod: "" });
    }
    setModal(null);
  };

  const handleDeleteFromEdit = async () => {
    if (!editingMember) return;
    await ask(
      async () => {
        await deleteTeamMember(editingMember.id);
        setModal(null);
      },
      `Delete ${editingMember.name}? This permanently removes them from the member directory.`
    );
  };

  // Filter by search text.
  const filtered = team.filter(member => {
    const matchesSearch = !search
      || member.name.toLowerCase().includes(search.toLowerCase())
      || member.email.toLowerCase().includes(search.toLowerCase())
      || (member.alternateEmail ?? "").toLowerCase().includes(search.toLowerCase())
      || member.school.toLowerCase().includes(search.toLowerCase())
      || (member.grade ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const profileByEmail = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const profile of userProfiles) {
      const key = normalizeKey(profile.email ?? "");
      if (!key) continue;
      map.set(key, profile);
    }
    return map;
  }, [userProfiles]);

  const SORT_COLUMNS = ["Track", "Projects", "Name", "Email", "School", "Grade", "Date Accepted", "Account Created"];

  const compareMemberByCol = (a: TeamMember, b: TeamMember, col: number): number => {
    switch (col) {
      case 0: {
        const trackCmp = TRACK_SORT_ORDER[getMemberTrack(a)] - TRACK_SORT_ORDER[getMemberTrack(b)];
        return trackCmp !== 0 ? trackCmp : a.name.localeCompare(b.name);
      }
      case 1: return 0;
      case 2: return a.name.localeCompare(b.name);
      case 3: return (a.email || "").localeCompare(b.email || "");
      case 4: return (a.school || "").localeCompare(b.school || "");
      case 5: return (a.grade || "").localeCompare(b.grade || "");
      case 6: return (a.acceptedDate || "").localeCompare(b.acceptedDate || "");
      case 7: {
        const aProfile = profileByEmail.get(normalizeKey(a.email ?? "")) ?? profileByEmail.get(normalizeKey(a.alternateEmail ?? ""));
        const bProfile = profileByEmail.get(normalizeKey(b.email ?? "")) ?? profileByEmail.get(normalizeKey(b.alternateEmail ?? ""));
        return (aProfile?.createdAt || "").localeCompare(bProfile?.createdAt || "");
      }
      default: return 0;
    }
  };

  const handleSort = (i: number) => {
    // Click on column header = reset to single-column sort
    const current = sortRules[0];
    if (current && current.col === i) {
      setSortRules([{ col: i, dir: current.dir === "asc" ? "desc" : "asc" }]);
    } else {
      setSortRules([{ col: i, dir: "asc" }]);
    }
  };

  const addSortRule = () => {
    const usedCols = new Set(sortRules.map((r) => r.col));
    const nextCol = SORT_COLUMNS.findIndex((_, i) => !usedCols.has(i));
    if (nextCol === -1) return;
    setSortRules((prev) => [...prev, { col: nextCol, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [{ col: 0, dir: "asc" }] : next;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) => {
    setSortRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "col") return { ...r, col: value as number };
      return { ...r, dir: value as "asc" | "desc" };
    }));
  };

  const sorted = [...filtered].sort((a, b) => {
    for (const rule of sortRules) {
      const cmp = compareMemberByCol(a, b, rule.col);
      if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const setTrack = (track: TrackKey) => {
    if (track === "—") {
      setField("divisions", []);
      return;
    }
    setField("divisions", [track]);
  };

  const activeProjectAssignedNameKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const business of businesses) {
      const status = normalizeKey(business.projectStatus ?? "");
      const isActiveProject = status === "ongoing" || status === "active";
      if (!isActiveProject) continue;
      const assigned = [...(business.teamMembers ?? []), business.teamLead ?? ""];
      for (const raw of assigned) {
        const key = normalizeKey(String(raw ?? ""));
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [businesses]);

  const resolvedFinanceMemberKeysByAssignment = useMemo(() => {
    const map = new Map<string, string[]>();
    const teamRows = team.map((member) => {
      const full = normalizeKey(member.name ?? "");
      const first = normalizeKey((member.name ?? "").split(/\s+/)[0] ?? "");
      return {
        id: member.id,
        full,
        first,
      };
    }).filter((row) => row.full);
    const fullById = new Map(teamRows.map((row) => [row.id, row.full]));

    const resolveName = (rawName: string): string[] => {
      const rawKey = normalizeKey(rawName ?? "");
      if (!rawKey) return [];

      // Exact full-name match takes priority.
      const exactFull = teamRows.filter((row) => row.full === rawKey);
      if (exactFull.length === 1) return [exactFull[0].full];
      if (exactFull.length > 1) return exactFull.map((row) => row.full);

      // If first-name match is unique, use it.
      const firstMatches = teamRows.filter((row) => row.first && row.first === rawKey);
      if (firstMatches.length === 1) return [firstMatches[0].full];

      // Fallback: closest contains relation when unique.
      const containsMatches = teamRows.filter((row) => row.full.includes(rawKey) || rawKey.includes(row.full));
      if (containsMatches.length === 1) return [containsMatches[0].full];

      // Unknown/ambiguous raw names still get recorded as their own key.
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

  const activeFinanceAssignedNameKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const assignment of financeAssignments) {
      const status = normalizeKey(assignment.status ?? "");
      const isActiveFinanceAssignment = status !== "completed";
      if (!isActiveFinanceAssignment) continue;
      for (const memberKey of resolvedFinanceMemberKeysByAssignment.get(assignment.id) ?? []) {
        if (memberKey) keys.add(memberKey);
      }
    }
    return keys;
  }, [financeAssignments, resolvedFinanceMemberKeysByAssignment]);

  const assignmentsByMemberName = useMemo(() => {
    const map = new Map<string, MemberAssignmentLink[]>();
    const pushForMemberKey = (memberKey: string, item: Omit<MemberAssignmentLink, "code">) => {
      const key = normalizeKey(memberKey);
      if (!key) return;
      const current = map.get(key) ?? [];
      current.push({ ...item, code: "" });
      map.set(key, current);
    };
    const pushForMemberName = (memberName: string, item: Omit<MemberAssignmentLink, "code">) => {
      pushForMemberKey(memberName, item);
    };

    for (const business of businesses) {
      const status = String(business.projectStatus ?? "").trim() || "—";
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

      if (!hasTrackSpecificAssignments) {
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: business.id,
          kind: "Business Project",
          title: business.name || "Untitled Project",
          topic: "Website project",
          codePrefix: "W",
          status,
          deadline: "—",
          href: `/members/projects#project-${business.id}`,
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
        const assignedNames = Array.from(new Set(trackMembers.length > 0 ? trackMembers : legacyAssignedNames));
        if (assignedNames.length === 0) continue;
        const codePrefix: AssignmentCodePrefix = track === "Marketing" ? "M" : "W";
        const topic =
          track === "Marketing"
            ? "Marketing project"
            : track === "Finance"
              ? "Operations project"
              : "Website project";
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: `${business.id}-${track.toLowerCase()}`,
          kind: "Business Project",
          title: business.name || "Untitled Project",
          topic,
          codePrefix,
          status,
          deadline: "—",
          href: `/members/projects#project-${business.id}`,
        };
        for (const memberName of assignedNames) pushForMemberName(memberName, entry);
      }
    }

    for (const assignment of financeAssignments) {
      const assignmentType = String(assignment.type ?? "").trim().toLowerCase();
      const codePrefix: AssignmentCodePrefix = assignmentType === "case study" ? "C" : "R";
      const firstDeadlineDate = Array.isArray(assignment.deadlines)
        ? assignment.deadlines
          .map((entry) => (entry && typeof entry === "object" ? String((entry as { date?: string }).date ?? "").trim() : ""))
          .find(Boolean)
        : "";
      const deadline = firstDeadlineDate || assignment.deadline || assignment.finalDueDate || assignment.firstDraftDueDate || assignment.interviewDueDate || "—";
      const entry: Omit<MemberAssignmentLink, "code"> = {
        id: assignment.id,
        kind: "Finance Assignment",
        title: assignment.title || assignment.topic || "Untitled Assignment",
        topic: assignment.topic || "",
        codePrefix,
        status: assignment.status || "—",
        deadline,
        href: `/members/assignments#finance-assignment-${assignment.id}`,
      };
      for (const memberKey of resolvedFinanceMemberKeysByAssignment.get(assignment.id) ?? []) {
        pushForMemberKey(memberKey, entry);
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

  const getMemberIndicator = (member: TeamMember): { colorClass: string; label: string } => {
    if (normalizeKey(member.status ?? "") === "inactive") {
      return { colorClass: "bg-red-400", label: "Inactive" };
    }
    const memberKey = normalizeKey(member.name ?? "");
    if (activeProjectAssignedNameKeys.has(memberKey) || activeFinanceAssignedNameKeys.has(memberKey)) {
      return { colorClass: "bg-emerald-400", label: "Assigned to active project or finance assignment" };
    }
    return { colorClass: "bg-yellow-400", label: "Not assigned to active project or finance assignment" };
  };

  const selectedMemberAssignments = useMemo(() => {
    if (!assignmentDetailMember) return [];
    return assignmentsByMemberName.get(normalizeKey(assignmentDetailMember.name ?? "")) ?? [];
  }, [assignmentDetailMember, assignmentsByMemberName]);

  const totalMembersCount = team.length;
  const inactiveMembersCount = team.filter((member) => normalizeKey(member.status ?? "") === "inactive").length;
  const assignedMembersCount = team.filter((member) => {
    if (normalizeKey(member.status ?? "") === "inactive") return false;
    const memberKey = normalizeKey(member.name ?? "");
    return activeProjectAssignedNameKeys.has(memberKey) || activeFinanceAssignedNameKeys.has(memberKey);
  }).length;
  const totalApplicantsCount = applications.length;

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
        action={canEdit ? (
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importingCsv}>
              {importingCsv ? "Importing..." : "Import CSV"}
            </Btn>
            <Btn variant="primary" onClick={openCreate}>+ Add Member</Btn>
          </div>
        ) : undefined}
      />
      <SectionTabs tabs={PEOPLE_GROUP_TABS} />
      {importMessage && (
        <p className="text-xs text-white/55 mb-4">{importMessage}</p>
      )}

      {/* Search controls */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, school, or grade…" />
        <div className="flex items-center gap-3 text-[10px] text-white/55">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Active assignment</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Not assigned</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Inactive</span>
        </div>
        <Btn size="sm" variant="ghost" onClick={() => setExpandAssignments((prev) => !prev)}>
          {expandAssignments ? "Collapse Assignments" : "Expand Assignments"}
        </Btn>
        {!isMemberRestricted && (
          <div className="relative">
            <Btn size="sm" variant="ghost" onClick={() => setShowSortPanel((v) => !v)}>
              Sort{sortRules.length > 1 ? ` (${sortRules.length})` : ""}
            </Btn>
            {showSortPanel && (
              <div className="absolute top-full left-0 mt-1 bg-[#1C1F26] border border-white/10 rounded-lg shadow-xl z-50 p-3 min-w-[320px]">
                <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Sort Rules</p>
                {sortRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-white/40 w-[48px]">{idx === 0 ? "Sort by" : "Then by"}</span>
                    <select
                      value={rule.col}
                      onChange={(e) => updateSortRule(idx, "col", Number(e.target.value))}
                      className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                    >
                      {SORT_COLUMNS.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={rule.dir}
                      onChange={(e) => updateSortRule(idx, "dir", e.target.value)}
                      className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45 w-[60px]"
                    >
                      <option value="asc">A→Z</option>
                      <option value="desc">Z→A</option>
                    </select>
                    {sortRules.length > 1 && (
                      <button
                        onClick={() => removeSortRule(idx)}
                        className="members-icon-btn members-icon-btn-danger h-6 w-6 text-xs"
                        aria-label="Remove sort rule"
                        title="Remove sort rule"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {sortRules.length < SORT_COLUMNS.length && (
                  <button onClick={addSortRule} className="text-[10px] text-[#85CC17]/70 hover:text-[#85CC17] transition-colors">
                    + Add sort level
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-white/55">
        <span>Total Members: <span className="text-white/85 font-semibold">{totalMembersCount}</span></span>
        <span>Assigned: <span className="text-emerald-300 font-semibold">{assignedMembersCount}</span></span>
        <span>Inactive: <span className="text-red-300 font-semibold">{inactiveMembersCount}</span></span>
        {canEdit && (
          <span>Total Applicants: <span className="text-white/85 font-semibold">{totalApplicantsCount}</span></span>
        )}
      </div>

      {/* Team member list */}
      {isMemberRestricted ? (
        <div className="members-table-shell relative select-text">
          <table className="members-grid-table w-full min-w-[1020px] text-[10px] leading-4 table-fixed [&_td]:overflow-hidden">
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                {["Track", "Projects", "Name", "School", "Grade"].map((col) => (
                  <th
                    key={col}
                    className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap ${
                      col === "Track" ? "w-[64px]" :
                      col === "Projects" ? "w-[220px]" :
                      col === "Name" ? "w-[250px]" :
                      col === "School" ? "w-[360px]" :
                      "w-[90px]"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((member) => {
                const track = getMemberTrack(member);
                const avatar = getTrackAvatarStyles(track);
                const indicator = getMemberIndicator(member);
                const memberAssignments = assignmentsByMemberName.get(normalizeKey(member.name ?? "")) ?? [];
                return (
                  <tr key={member.id} className="hover:bg-white/3 transition-colors align-middle">
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/65 text-[10px] font-semibold">{track}</span>
                    </td>
                    <td className="px-2 py-1">
                      {memberAssignments.length === 0 ? (
                        <span className="text-white/35">—</span>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1">
                            {memberAssignments.map((item) => (
                              <a
                                key={`code-${member.id}-${item.id}-${item.code}`}
                                href={item.href}
                                className="inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-1.5 py-0.5 text-[10px] font-semibold text-white/80 hover:border-[#85CC17]/55 hover:text-[#C4F135] transition-colors"
                                title={`${item.code} · ${item.title}${item.topic ? ` · ${item.topic}` : ""}`}
                              >
                                {item.code}
                              </a>
                            ))}
                          </div>
                          {expandAssignments && (
                            <div className="mt-1 space-y-0.5">
                              {memberAssignments.map((item) => (
                                <a
                                  key={`preview-${member.id}-${item.id}-${item.code}`}
                                  href={item.href}
                                  className="block truncate text-[10px] text-white/55 hover:text-[#C4F135] transition-colors"
                                  title={`${item.code} · ${item.title}${item.topic ? ` · ${item.topic}` : ""} · ${item.status}`}
                                >
                                  <span className="text-white/80">{item.code}</span> {item.title}{item.topic ? ` · ${item.topic}` : ""}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                          title={`${indicator.label} · Click for assignments`}
                          onClick={() => setAssignmentDetailMember(member)}
                          aria-label={`View assignments for ${member.name}`}
                        />
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                          <span className="text-[9px] font-bold" style={{ color: avatar.text }}>{member.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 44)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 64) : "—"}</span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50">{member.grade || "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="members-table-shell relative select-text">
          <table className="members-grid-table w-full min-w-[1600px] text-[10px] leading-4 table-fixed [&_td]:overflow-hidden">
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                {["Track", "Projects", "Name", "Email", "School", "Grade", "Date Accepted", "Account Created", "Actions"].map((col, idx) => {
                  const sortable = [0, 1, 2, 3, 4, 5, 6, 7].includes(idx);
                  const primaryRule = sortRules[0];
                  const isActive = primaryRule?.col === idx;
                  const dir = isActive ? primaryRule.dir : "asc";
                  return (
                    <th
                      key={col}
                      className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap ${sortable ? "cursor-pointer select-none" : ""} ${
                        col === "Track" ? "w-[64px]" :
                        col === "Projects" ? "w-[280px]" :
                        col === "Name" ? "w-[250px]" :
                        col === "Email" ? "w-[330px]" :
                        col === "School" ? "w-[260px]" :
                        col === "Grade" ? "w-[92px]" :
                        col === "Date Accepted" ? "w-[116px]" :
                        col === "Account Created" ? "w-[116px]" :
                        "w-[124px]"
                      }`}
                      onClick={() => sortable && handleSort(idx)}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {col}
                        {sortable && (
                          <span className="inline-flex flex-col ml-0.5 leading-none align-middle">
                            <span className={`text-[8px] ${isActive && dir === "asc" ? "text-white/80" : "text-white/20"}`}>▲</span>
                            <span className={`text-[8px] ${isActive && dir === "desc" ? "text-white/80" : "text-white/20"}`}>▼</span>
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((member) => {
                const track = getMemberTrack(member);
                const avatar = getTrackAvatarStyles(track);
                const indicator = getMemberIndicator(member);
                const accountProfile = profileByEmail.get(normalizeKey(member.email ?? "")) ?? profileByEmail.get(normalizeKey(member.alternateEmail ?? ""));
                const accountCreated = accountProfile?.createdAt ? accountProfile.createdAt.slice(0, 10) : "—";
                const directEmail = (member.email ?? member.alternateEmail ?? "").trim();
                const inactive = normalizeKey(member.status ?? "") === "inactive";
                const memberAssignments = assignmentsByMemberName.get(normalizeKey(member.name ?? "")) ?? [];
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-white/3 transition-colors align-middle"
                  >
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/65 text-[10px] font-semibold">{track}</span>
                    </td>
                    <td className="px-2 py-1">
                      {memberAssignments.length === 0 ? (
                        <span className="text-white/35">—</span>
                      ) : (
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1">
                            {memberAssignments.map((item) => (
                              <a
                                key={`admin-code-${member.id}-${item.id}-${item.code}`}
                                href={item.href}
                                className="inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-1.5 py-0.5 text-[10px] font-semibold text-white/80 hover:border-[#85CC17]/55 hover:text-[#C4F135] transition-colors"
                                title={`${item.code} · ${item.title}${item.topic ? ` · ${item.topic}` : ""}`}
                              >
                                {item.code}
                              </a>
                            ))}
                          </div>
                          {expandAssignments && (
                            <div className="mt-1 space-y-0.5">
                              {memberAssignments.map((item) => (
                                <a
                                  key={`admin-preview-${member.id}-${item.id}-${item.code}`}
                                  href={item.href}
                                  className="block truncate text-[10px] text-white/55 hover:text-[#C4F135] transition-colors"
                                  title={`${item.code} · ${item.title}${item.topic ? ` · ${item.topic}` : ""} · ${item.status}`}
                                >
                                  <span className="text-white/80">{item.code}</span> {item.title}{item.topic ? ` · ${item.topic}` : ""}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                          title={`${indicator.label} · Click for assignments`}
                          onClick={() => setAssignmentDetailMember(member)}
                          aria-label={`View assignments for ${member.name}`}
                        />
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                          <span className="text-[9px] font-bold" style={{ color: avatar.text }}>{member.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 56)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="font-mono inline-flex items-center gap-1.5 max-w-full">
                        <span
                          className="text-white/55 block truncate"
                          title={[member.email, member.alternateEmail].filter(Boolean).join(" · ") || "—"}
                        >
                          {truncateCell([member.email, member.alternateEmail].filter(Boolean).join(" · ") || "—", 92)}
                        </span>
                        {(member.email || member.alternateEmail) && (
                          <button
                            type="button"
                            className="members-copy-btn"
                            onClick={() => void copyText(member.email || member.alternateEmail || "")}
                            title="Copy email"
                            aria-label="Copy email"
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <rect x="9" y="9" width="11" height="11" rx="2" />
                              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 72) : "—"}</span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50">{member.grade || "—"}</span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50">{member.acceptedDate || "—"}</span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="text-white/50">{accountCreated}</span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex gap-1 flex-nowrap">
                        {directEmail && (
                          <Btn
                            size="sm"
                            variant="secondary"
                            className="members-pill-btn whitespace-nowrap"
                            onClick={() => { window.location.href = `mailto:${directEmail}`; }}
                            disabled={inactive}
                          >
                            Email
                          </Btn>
                        )}
                        {canEdit && <Btn size="sm" variant="secondary" className="members-pill-btn whitespace-nowrap" onClick={() => openEdit(member)}>Edit</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length === 0 && (
        <Empty
          message="No team members."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first member</Btn> : undefined}
        />
      )}

      <Modal
        open={!!assignmentDetailMember}
        onClose={() => setAssignmentDetailMember(null)}
        title={`Assignments · ${assignmentDetailMember?.name ?? ""}`}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
          {selectedMemberAssignments.length === 0 ? (
            <p className="text-sm text-white/45">No project assignments found for this member.</p>
          ) : (
            selectedMemberAssignments.map((item) => (
              <a
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className="block rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 hover:border-[#85CC17]/45 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/90 font-medium">{item.title}</p>
                    <p className="text-[11px] text-white/45 mt-0.5">
                      {item.code} · {item.kind}{item.topic ? ` · ${item.topic}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/50 whitespace-nowrap">{item.deadline !== "—" ? `Due ${item.deadline}` : "No deadline"}</span>
                </div>
                <p className="text-[11px] text-white/55 mt-1">Status: {item.status || "—"}</p>
              </a>
            ))
          )}
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setAssignmentDetailMember(null)}>Close</Btn>
        </div>
      </Modal>

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingMember ? "Edit Member" : "New Member"}>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Full Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="Email">
            <div className="flex items-center gap-2">
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
              {!showAlternateEmail ? (
                <button
                  type="button"
                  className="members-icon-btn h-8 w-8 text-base leading-none"
                  aria-label="Add alternate email"
                  title="Add alternate email"
                  onClick={() => setShowAlternateEmail(true)}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="members-icon-btn members-icon-btn-danger h-8 w-8 text-base leading-none"
                  aria-label="Remove alternate email"
                  title="Remove alternate email"
                  onClick={() => {
                    setField("alternateEmail", "");
                    setShowAlternateEmail(false);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </Field>
          {showAlternateEmail && (
            <Field label="Alternate Email">
              <Input type="email" value={form.alternateEmail ?? ""} onChange={e => setField("alternateEmail", e.target.value)} />
            </Field>
          )}
          <Field label="School">
            <Input value={form.school} onChange={e => setField("school", e.target.value)} />
          </Field>
          <Field label="Grade">
            <select
              value={form.grade ?? ""}
              onChange={e => setField("grade", e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="">Select grade</option>
              {GRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Track">
            <select
              value={getMemberTrack({ ...(form as TeamMember), id: "", createdAt: "" })}
              onChange={(e) => setTrack(e.target.value as TrackKey)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="—">—</option>
              <option value="Tech">Tech</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">Finance</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="Date Accepted">
            <Input
              type="date"
              value={form.acceptedDate ?? ""}
              onChange={e => setField("acceptedDate", e.target.value)}
            />
          </Field>
          {editingMember && (
            <div className="pt-2 mt-2 border-t border-white/8">
              <label className="inline-flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  className="members-checkbox"
                  checked={normalizeKey(form.status ?? "") === "inactive"}
                  onChange={(e) => setField("status", e.target.checked ? "Inactive" : "Active")}
                />
                Mark member as inactive
              </label>
              <p className="text-[11px] text-white/45 mt-1">
                Inactive members appear with a red status dot and are disabled in mass email selection.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          {editingMember ? (
            <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
              Delete Member
            </Btn>
          ) : <span />}
          <div className="flex items-center gap-3">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave}>{editingMember ? "Save" : "Add Member"}</Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
