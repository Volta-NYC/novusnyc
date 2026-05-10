"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useRef, useState, useEffect, useMemo } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { MEMBERS_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Btn, Modal, Field, Input, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeTeam, createTeamMember, updateTeamMember, deleteTeamMember,
  getBusinessesList, getFinanceAssignmentsList, getApplicationsList,
  getUserProfilesList, getCyclesList, getAssignmentsList, getAssignmentClaimsList,
  getMemberStrikesList, getMemberCreditAdjustmentsList, getEmailTemplatesList, getInfractionsList,
  type TeamMember, type UserProfile, type Business, type FinanceAssignment, type ApplicationRecord,
  type Cycle, type Assignment, type AssignmentClaim, type MemberStrike, type MemberCreditAdjustment,
  type EmailTemplate, type Infraction,
} from "@/lib/members/storage";
import { computeGlobalCodes } from "@/lib/members/assignmentCodes";
import { useAuth } from "@/lib/members/authContext";
import { CLASS_GRADE_OPTIONS, collegeClassToHighSchoolClass, gradeToClassOf, isLegacyGrade } from "@/lib/grades";
import MemberDrawer from "@/components/members/MemberDrawer";
import { classifyMember, computeCreditLedger, computeDot, lookupCreditTarget, pickPrimaryTrack } from "@/lib/members/cycleCompute";
import { runCycleSweep } from "@/lib/members/cycleAutomation";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

// Blank form values for creating a new team member.
const BLANK_FORM: Omit<TeamMember, "id" | "createdAt"> = {
  grade: "",
  acceptedDate: "",
  name: "", school: "", divisions: [], pod: "", role: "Analyst", slackHandle: "",
  email: "", alternateEmail: "", status: "Active", skills: [], joinDate: "", notes: "",
};

const GRADE_OPTIONS = CLASS_GRADE_OPTIONS;
const HIGH_SCHOOL_CLASS_MIGRATION_CUTOFF = Date.parse("2026-05-09T00:00:00.000Z");
type TrackKey = "Tech" | "Marketing" | "Finance" | "Other" | "—";
type AssignmentCodePrefix = "W" | "M" | "F" | "R" | "C";

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

const TRACK_SORT_ORDER: Record<TrackKey, number> = {
  Tech: 0,
  Marketing: 1,
  Finance: 2,
  Other: 3,
  "—": 4,
};

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
  teamNames: string[];
  codePrefix: AssignmentCodePrefix;
  code: string;
  status: string;
  deadline: string;
  href: string;
};

// col 0=Status(credit pace), 1=Track, 2=Name, 3=School, 4=Role
const DEFAULT_SORT_RULES: { col: number; dir: "asc" | "desc" }[] = [
  { col: 1, dir: "asc" },
  { col: 4, dir: "asc" },
  { col: 2, dir: "asc" },
];

const SORT_OPTIONS = [
  { value: 0, label: "Status" },
  { value: 1, label: "Track" },
  { value: 2, label: "Name" },
  { value: 3, label: "School" },
  { value: 4, label: "Role" },
];

const ADMIN_COLS = [
  { key: "name",           label: "Name",            width: 270, sortCol: 2  as number | null },
  { key: "email",          label: "Email",           width: 330, sortCol: null },
  { key: "school",         label: "School",          width: 280, sortCol: 3  as number | null },
  { key: "hsClass",        label: "HS Class",        width: 80,  sortCol: null },
  { key: "role",           label: "Role",            width: 120, sortCol: 4  as number | null },
  { key: "resume",         label: "Resume",          width: 80,  sortCol: null },
  { key: "acceptedDate",   label: "Date Accepted",   width: 116, sortCol: null },
  { key: "accountCreated", label: "Account Created", width: 116, sortCol: null },
  { key: "strikes",        label: "Strikes",         width: 72,  sortCol: null },
  { key: "actions",        label: "Actions",         width: 148, sortCol: null },
];

// Roles offered in the inline role-edit popover, ordered seniority-high to seniority-low
// so the dropdown reads top-down from most senior. Board is an internal designation for leadership.
const ROLE_OPTIONS = ["Board", "Senior Associate", "Associate", "Senior Analyst", "Analyst"] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

// Display the role exactly as stored, so legacy entries (e.g. "Project Lead",
// "Member") still show up faithfully even though they aren't selectable in the popover.
function displayRoleValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  return raw || "—";
}

function predatesHighSchoolClassMigration(value: string | undefined): boolean {
  const ms = Date.parse(String(value ?? ""));
  return Number.isFinite(ms) && ms < HIGH_SCHOOL_CLASS_MIGRATION_CUTOFF;
}

const ROLE_SORT_ORDER: Record<string, number> = {
  Board: 0,
  "Senior Associate": 1,
  Associate: 2,
  "Senior Analyst": 3,
  Analyst: 4,
};

function roleSortKey(value: unknown): number {
  const raw = String(value ?? "").trim();
  return raw in ROLE_SORT_ORDER ? ROLE_SORT_ORDER[raw] : 99;
}

// Members who should hold the Board role regardless of what they were originally
// accepted with. Compared loosely against name + email so casing/spacing in
// stored data doesn't cause a miss.
const BOARD_MEMBERS: Array<{ name: string; emails: string[] }> = [
  { name: "Ethan Zhang", emails: ["ethan@voltanyc.org"] },
  { name: "Andrew Chin", emails: [] },
  { name: "Tahmid Islam", emails: [] },
  { name: "Ellie Mak", emails: [] },
  { name: "Joseph Long", emails: [] },
];

function isBoardMember(member: TeamMember): boolean {
  const memberName = String(member.name ?? "").trim().toLowerCase();
  const memberEmails = [member.email, member.alternateEmail]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
  return BOARD_MEMBERS.some((entry) => {
    if (entry.name.toLowerCase() === memberName) return true;
    if (entry.emails.length === 0) return false;
    return entry.emails.some((emailMatch) => memberEmails.includes(emailMatch.toLowerCase()));
  });
}

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
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [showAlternateEmail, setShowAlternateEmail] = useState(false);
  const [sortRules, setSortRules]     = useState<{ col: number; dir: "asc" | "desc" }[]>(DEFAULT_SORT_RULES);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [hiddenAdminCols, setHiddenAdminCols] = useState<Set<string>>(new Set());
  const [adminColsMenuOpen, setAdminColsMenuOpen] = useState(false);
  const [openRolePopoverId, setOpenRolePopoverId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const boardMigrationRef = useRef(false);
  const gradeMigrationRef = useRef(false);
  // Credit-system inputs for the dot color computation + drawer.
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [creditAssignments, setCreditAssignments] = useState<Assignment[]>([]);
  const [creditClaims, setCreditClaims] = useState<AssignmentClaim[]>([]);
  const [creditStrikes, setCreditStrikes] = useState<MemberStrike[]>([]);
  const [creditAdjustments, setCreditAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [infractionCatalog, setInfractionCatalog] = useState<Infraction[]>([]);
  const [drawerMember, setDrawerMember] = useState<TeamMember | null>(null);
  const sweepRanRef = useRef(false);
  const [assignmentQuickView, setAssignmentQuickView] = useState<{ item: MemberAssignmentLink; memberName: string } | null>(null);
  const [creditSummaryMember, setCreditSummaryMember] = useState<TeamMember | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent" | "error">>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { ask, Dialog } = useConfirm();
  const { authRole, user } = useAuth();
  const canEdit = authRole === "admin";
  const isMemberRestricted = authRole === "member";

  // Subscribe to real-time team updates; unsubscribe on unmount.
  useEffect(() => subscribeTeam(setTeam), []);

  // One-shot batch fetch for all supporting data — no persistent listeners needed.
  useEffect(() => {
    void Promise.all([
      getBusinessesList().then(setBusinesses),
      getUserProfilesList().then(setUserProfiles),
      getCyclesList().then(setCycles),
      getAssignmentsList().then(setCreditAssignments),
      getAssignmentClaimsList().then(setCreditClaims),
      getMemberStrikesList().then(setCreditStrikes),
      getMemberCreditAdjustmentsList().then(setCreditAdjustments),
      getEmailTemplatesList().then(setEmailTemplates),
      getInfractionsList().then(setInfractionCatalog),
    ]);
  }, []);

  // One-shot automation sweep: when admin loads this page with full cycle data,
  // walk every active member and fire warnings/auto-strikes if their dot just
  // crossed the orange or red threshold. The sweep itself is idempotent per
  // cycle via the lastWarningCycleId / lastAutoStrikeCycleId flags.
  useEffect(() => {
    if (sweepRanRef.current) return;
    if (!canEdit || !user) return;
    if (team.length === 0) return;
    if (cycles.length === 0) return;
    sweepRanRef.current = true;
    void (async () => {
      try {
        const idToken = await getAuthToken();
        await runCycleSweep({
          team,
          cycles,
          assignments: creditAssignments,
          claims: creditClaims,
          strikes: creditStrikes,
          adjustments: creditAdjustments,
          templates: emailTemplates,
          infractions: infractionCatalog,
          idToken,
          reviewerLabel: "system (auto)",
        });
      } catch {
        // Non-fatal: never block the directory render.
      }
    })();
  }, [
    canEdit, user, team, cycles, creditAssignments, creditClaims, creditStrikes,
    creditAdjustments, emailTemplates, infractionCatalog,
  ]);
  useEffect(() => { void getApplicationsList().then(setApplications); }, []);

  // Close the inline role-edit popover on click outside, scroll, or resize.
  useEffect(() => {
    if (!openRolePopoverId) return;
    const close = () => { setOpenRolePopoverId(null); setPopoverPos(null); };
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openRolePopoverId]);

  const handleQuickRoleChange = async (member: TeamMember, nextRole: RoleOption) => {
    setOpenRolePopoverId(null);
    if (String(member.role ?? "").trim() === nextRole) return;
    await updateTeamMember(member.id, { role: nextRole });
  };

  // One-time backfill: replace legacy grade labels (Freshman/Junior/...) with the
  // matching class-of-YYYY value so the data stops drifting each fall.
  useEffect(() => {
    if (gradeMigrationRef.current) return;
    if (!canEdit || team.length === 0) return;
    gradeMigrationRef.current = true;
    void (async () => {
      for (const member of team) {
        if (!isLegacyGrade(member.grade)) continue;
        if (!predatesHighSchoolClassMigration(member.createdAt)) continue;
        const next = collegeClassToHighSchoolClass(member.grade);
        if (!next || next === member.grade) continue;
        // eslint-disable-next-line no-await-in-loop
        await updateTeamMember(member.id, { grade: next });
      }
    })();
  }, [team, canEdit]);

  // One-time backfill: stamp the Board role onto the named leadership members
  // whose stored role hasn't already been set to Board. Runs once per session
  // for admins so old "Member"/"Project Lead" entries get corrected.
  useEffect(() => {
    if (boardMigrationRef.current) return;
    if (!canEdit || team.length === 0) return;
    boardMigrationRef.current = true;
    void (async () => {
      for (const member of team) {
        if (!isBoardMember(member)) continue;
        if (String(member.role ?? "").trim() === "Board") continue;
        // eslint-disable-next-line no-await-in-loop
        await updateTeamMember(member.id, { role: "Board" });
      }
    })();
  }, [team, canEdit]);
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    if (!canEdit || !user) {
      void getFinanceAssignmentsList().then(setFinanceAssignments);
      return;
    }

    const loadAssignments = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch("/api/members/finance-assignments", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as { assignments?: FinanceAssignment[] };
        if (!mounted) return;
        setFinanceAssignments(Array.isArray(data.assignments) ? data.assignments : []);
      } catch {
        // Keep existing in-memory assignments.
      }
    };

    void loadAssignments();
    timer = window.setInterval(() => { void loadAssignments(); }, 30000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [canEdit, user]);

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
          role: "Analyst",
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
      // Coerce any legacy "Senior"/"Junior" value into the matching Class-of label
      // so the dropdown lands on the right option when editing older records.
      grade:       gradeToClassOf(member.grade ?? ""),
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

  const handleSendInvite = async (member: TeamMember) => {
    setInviteStatus(s => ({ ...s, [member.id]: "sending" }));
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/admin/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: member.id }),
      });
      setInviteStatus(s => ({ ...s, [member.id]: res.ok ? "sent" : "error" }));
      if (res.ok) setTimeout(() => setInviteStatus(s => { const n = { ...s }; delete n[member.id]; return n; }), 3000);
    } catch {
      setInviteStatus(s => ({ ...s, [member.id]: "error" }));
    }
  };

  const filtered = team.filter(member => {
    if (!search) return true;
    const q = search.toLowerCase();
    return member.name.toLowerCase().includes(q)
      || member.school.toLowerCase().includes(q)
      || (member.grade ?? "").toLowerCase().includes(q)
      || gradeToClassOf(member.grade ?? "").toLowerCase().includes(q)
      || getMemberTrack(member).toLowerCase().includes(q)
      || String(member.role ?? "").toLowerCase().includes(q)
      || (member.email ?? "").toLowerCase().includes(q)
      || (member.alternateEmail ?? "").toLowerCase().includes(q);
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

  const resumeUrlByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of applications) {
      if (!app.resumeUrl) continue;
      const email = normalizeKey(app.email ?? "");
      if (email) map.set(email, app.resumeUrl);
    }
    return map;
  }, [applications]);

  // Status dot rank: green=0 (on pace) through gray=4 (inactive/reserve).
  const DOT_RANK: Record<string, number> = {
    "bg-emerald-400": 0,
    "bg-yellow-400": 1,
    "bg-orange-400": 2,
    "bg-red-500": 3,
    "bg-gray-400": 4,
  };

  // col 0=Status, 1=Track, 2=Name, 3=School, 4=Role
  const compareMemberByCol = (a: TeamMember, b: TeamMember, col: number): number => {
    switch (col) {
      case 0: {
        const rankA = DOT_RANK[getMemberIndicator(a).colorClass] ?? 5;
        const rankB = DOT_RANK[getMemberIndicator(b).colorClass] ?? 5;
        return rankA - rankB;
      }
      case 1: return (TRACK_SORT_ORDER[getMemberTrack(a)] ?? 9) - (TRACK_SORT_ORDER[getMemberTrack(b)] ?? 9);
      case 2: return (a.name || "").localeCompare(b.name || "");
      case 3: return (a.school || "").localeCompare(b.school || "");
      case 4: {
        const roleCmp = roleSortKey(a.role) - roleSortKey(b.role);
        return roleCmp !== 0 ? roleCmp : (a.name || "").localeCompare(b.name || "");
      }
      default: return 0;
    }
  };

  const handleSort = (i: number) => {
    const current = sortRules[0];
    if (current && current.col === i) {
      setSortRules([{ col: i, dir: current.dir === "asc" ? "desc" : "asc" }]);
    } else {
      setSortRules([{ col: i, dir: "asc" }]);
    }
  };

  const addSortRule = () => {
    const usedCols = new Set(sortRules.map((r) => r.col));
    const next = SORT_OPTIONS.find((opt) => !usedCols.has(opt.value));
    if (!next) return;
    setSortRules((prev) => [...prev, { col: next.value, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0
        ? DEFAULT_SORT_RULES
        : next;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) => {
    setSortRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "col") return { ...r, col: value as number };
      return { ...r, dir: value as "asc" | "desc" };
    }));
  };

  const setTrack = (track: TrackKey) => {
    if (track === "—") {
      setField("divisions", []);
      return;
    }
    setField("divisions", [track]);
  };

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

  const globalCodeMaps = useMemo(
    () => computeGlobalCodes(businesses, financeAssignments),
    [businesses, financeAssignments]
  );

  const assignmentsByMemberName = useMemo(() => {
    const map = new Map<string, MemberAssignmentLink[]>();
    const teamNameById = new Map(team.map((member) => [member.id, String(member.name ?? "").trim()]));
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
          kind: "Business Project",
          title: business.name || "Untitled Project",
          topic: "Website project",
          teamNames: legacyAssignedNames,
          codePrefix: "W",
          status,
          deadline: "—",
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
        const codePrefix: AssignmentCodePrefix = track === "Marketing" ? "M" : track === "Finance" ? "F" : "W";
        const topic =
          track === "Marketing"
            ? "Marketing project"
            : track === "Finance"
              ? "Finance project"
              : "Website project";
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: `${business.id}-${track.toLowerCase()}`,
          kind: "Business Project",
          title: business.name || "Untitled Project",
          topic,
          teamNames: assignedNames,
          codePrefix,
          status,
          deadline: "—",
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
          : "Report";
      const region = String(assignment.region ?? "").trim();
      const assignmentDisplayTitle = region ? `${region} ${assignmentTypeLabel}` : assignmentTypeLabel;
      const firstDeadlineDate = Array.isArray(assignment.deadlines)
        ? assignment.deadlines
          .map((entry) => (entry && typeof entry === "object" ? String((entry as { date?: string }).date ?? "").trim() : ""))
          .find(Boolean)
        : "";
      const deadline = firstDeadlineDate || assignment.deadline || assignment.finalDueDate || assignment.firstDraftDueDate || assignment.interviewDueDate || "—";
      const assignmentTeamNames = Array.from(new Set([
        ...readAssignmentIds(assignment).map((memberId) => teamNameById.get(memberId) ?? "").filter(Boolean),
        ...readAssignmentNames(assignment),
      ]));
      const entry: Omit<MemberAssignmentLink, "code"> = {
        id: assignment.id,
        kind: "Finance Assignment",
        title: assignmentDisplayTitle,
        topic: "",
        teamNames: assignmentTeamNames,
        codePrefix,
        status: assignment.status || "—",
        deadline,
        href: `/members/finance-assignments?assignmentId=${encodeURIComponent(assignment.id)}#finance-assignment-${assignment.id}`,
      };
      for (const memberKey of resolvedFinanceMemberKeysByAssignment.get(assignment.id) ?? []) {
        pushForMemberKey(memberKey, entry);
      }
    }

    // Assign global codes using globalCodeMaps
    for (const [key, items] of Array.from(map.entries())) {
      map.set(
        key,
        items
          .slice()
          .map((item) => {
            // Try to look up from globalCodeMaps
            // Finance assignment: id is assignmentId
            const fromAssignment = globalCodeMaps.assignmentCode.get(item.id);
            if (fromAssignment) return { ...item, code: fromAssignment };
            // Business with no track: id is businessId
            const fromBusiness = globalCodeMaps.businessTrackCode.get(item.id);
            if (fromBusiness) return { ...item, code: fromBusiness };
            // Business with track: id is "businessId-trackname" (lowercase), global key is "businessId-Track" (Title case)
            // Reconstruct the capitalized key
            const dashIdx = item.id.lastIndexOf("-");
            if (dashIdx >= 0) {
              const bizId = item.id.slice(0, dashIdx);
              const trackLower = item.id.slice(dashIdx + 1);
              const track = trackLower.charAt(0).toUpperCase() + trackLower.slice(1);
              const fromTrack = globalCodeMaps.businessTrackCode.get(`${bizId}-${track}`);
              if (fromTrack) return { ...item, code: fromTrack };
            }
            // Fallback: use prefix-based relative code
            return { ...item, code: `${item.codePrefix}?` };
          })
          .sort((a, b) => {
            const prefixOrder: Record<string, number> = { W: 0, M: 1, F: 2, R: 3, C: 4, G: 5 };
            const pa = prefixOrder[a.codePrefix] ?? 9;
            const pb = prefixOrder[b.codePrefix] ?? 9;
            if (pa !== pb) return pa - pb;
            const na = parseInt(a.code.slice(1)) || 0;
            const nb = parseInt(b.code.slice(1)) || 0;
            return na - nb;
          }),
      );
    }
    return map;
  }, [businesses, financeAssignments, resolvedFinanceMemberKeysByAssignment, team, globalCodeMaps]);


  const sorted = [...filtered].sort((a, b) => {
    for (const rule of sortRules) {
      const cmp = compareMemberByCol(a, b, rule.col);
      if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const strikesByMemberId = useMemo(() => {
    const map = new Map<string, MemberStrike[]>();
    for (const s of creditStrikes) {
      const list = map.get(s.memberId) ?? [];
      list.push(s);
      map.set(s.memberId, list);
    }
    return map;
  }, [creditStrikes]);

  // Dot color is driven by the credit-system pace computation. Falls back to a
  // gray "no cycle" state when there's no active cycle to anchor the math.
  const getMemberIndicator = (member: TeamMember): { colorClass: string; label: string } => {
    const memberClaims = creditClaims.filter(
      (c) => c.memberId === member.id && (!activeCycle || c.cycleId === activeCycle.id),
    );
    const memberAdjustments = creditAdjustments.filter(
      (a) => a.memberId === member.id && (!activeCycle || a.cycleId === activeCycle.id),
    );
    const credits = new Map<string, number>();
    for (const a of creditAssignments) credits.set(a.id, a.credits);
    const ledger = computeCreditLedger({
      claims: memberClaims,
      adjustments: memberAdjustments,
      assignmentCredits: credits,
    });
    const classification = classifyMember(member);
    const primaryTrack = pickPrimaryTrack(member);
    const target = activeCycle && classification.cycleRole
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;
    const dot = computeDot({
      cycle: activeCycle,
      member,
      earnedCredits: ledger.total,
      targetCredits: target,
      hasAnyClaims: memberClaims.length > 0,
    });
    const colorClass =
      dot.color === "green" ? "bg-emerald-400"
        : dot.color === "yellow" ? "bg-yellow-400"
        : dot.color === "orange" ? "bg-orange-400"
        : dot.color === "red" ? "bg-red-500"
        : "bg-gray-400";
    return { colorClass, label: dot.label };
  };

  const assignmentQuickViewRestTeam = useMemo(() => {
    if (!assignmentQuickView) return [];
    const currentMemberKey = normalizeKey(assignmentQuickView.memberName);
    return assignmentQuickView.item.teamNames
      .map((name) => String(name ?? "").trim())
      .filter(Boolean)
      .filter((name) => normalizeKey(name) !== currentMemberKey);
  }, [assignmentQuickView]);

  const totalMembersCount = team.length;
  const inactiveMembersCount = team.filter((member) => normalizeKey(member.status ?? "") === "inactive").length;
  const assignedMembersCount = team.filter((member) => {
    if (normalizeKey(member.status ?? "") === "inactive") return false;
    const memberAssignments = assignmentsByMemberName.get(normalizeKey(member.name ?? "")) ?? [];
    return memberAssignments.length > 0;
  }).length;


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
      <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-white/55">
        <span>Total Members: <span className="text-white/85 font-semibold">{totalMembersCount}</span></span>
        <span>Assigned: <span className="text-emerald-300 font-semibold">{assignedMembersCount}</span></span>
        <span>Inactive: <span className="text-red-300 font-semibold">{inactiveMembersCount}</span></span>
      </div>
      <SectionTabs tabs={MEMBERS_GROUP_TABS} />
      {importMessage && (
        <p className="text-xs text-white/55 mb-4">{importMessage}</p>
      )}

      {/* Search controls */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, school, or grade…" />
        <div className="flex items-center gap-3 text-[10px] text-white/55">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> On pace</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /> 1 check-in behind</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> 2–3 behind</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> 4+ behind / no activity</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" /> Inactive / reserve</span>
        </div>
        {!isMemberRestricted && (
          <div className="flex items-center gap-2">
          <div className="relative">
            <Btn size="sm" variant="ghost" onClick={() => { setAdminColsMenuOpen((v) => !v); setShowSortPanel(false); }}>
              Columns{hiddenAdminCols.size > 0 ? ` (${hiddenAdminCols.size} hidden)` : ""}
            </Btn>
            {adminColsMenuOpen && (
              <div className="members-col-panel" onClick={(e) => e.stopPropagation()}>
                <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-white/40">Show / Hide Columns</p>
                {ADMIN_COLS.filter((c) => c.key !== "actions").map((col) => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer text-xs text-white/70">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={!hiddenAdminCols.has(col.key)}
                      onChange={(e) => setHiddenAdminCols((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(col.key); else next.add(col.key);
                        return next;
                      })}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Btn size="sm" variant="ghost" onClick={() => { setShowSortPanel((v) => !v); setAdminColsMenuOpen(false); }}>
              Sort{sortRules.length > 1 ? ` (${sortRules.length})` : ""}
            </Btn>
            {showSortPanel && (
              <div className="absolute top-full right-0 mt-1 bg-[#1C1F26] border border-white/10 rounded-lg shadow-xl z-50 p-3 w-[360px] max-w-[min(92vw,360px)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/45 uppercase tracking-wide">Sort Rules</p>
                  <button
                    type="button"
                    className="text-[10px] text-white/55 hover:text-white transition-colors"
                    onClick={() => setShowSortPanel(false)}
                  >
                    Close
                  </button>
                </div>
                {sortRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-white/45 w-[54px]">{idx === 0 ? "Sort by" : "Then by"}</span>
                    <select
                      value={rule.col}
                      onChange={(e) => updateSortRule(idx, "col", Number(e.target.value))}
                      className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select
                      value={rule.dir}
                      onChange={(e) => updateSortRule(idx, "dir", e.target.value)}
                      className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45 w-[72px]"
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
                <div className="mt-2 flex items-center justify-between">
                  {sortRules.length < SORT_OPTIONS.length ? (
                    <button onClick={addSortRule} className="text-[10px] text-[#85CC17]/75 hover:text-[#85CC17] transition-colors">
                      + Add sort level
                    </button>
                  ) : <span />}
                  <button
                    type="button"
                    className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
                    onClick={() => setSortRules(DEFAULT_SORT_RULES)}
                  >
                    Reset default
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
      {/* Team member list */}
      {isMemberRestricted ? (
        <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto relative select-text">
          <table className="table-fixed text-left text-[10px] leading-4" style={{ width: "100%", minWidth: 780 }}>
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[280px]">Name</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap">School</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[80px]">HS Class</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[110px]">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((member) => {
                const track = getMemberTrack(member);
                const avatar = getTrackAvatarStyles(track);
                const indicator = getMemberIndicator(member);
                return (
                  <tr key={member.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-2 py-0 h-9 align-middle overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                          title={`${indicator.label} · Click for progress summary`}
                          onClick={() => setCreditSummaryMember(member)}
                          aria-label={`View credit progress for ${member.name}`}
                        />
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                          <TrackAvatarIcon track={track} color={avatar.text} />
                        </div>
                        <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 44)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-0 h-9 align-middle overflow-hidden whitespace-nowrap">
                      <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 64) : "—"}</span>
                    </td>
                    <td className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                      <span className="text-white/50">{gradeToClassOf(member.grade) || "—"}</span>
                    </td>
                    <td className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                      <span className="text-white/60">{displayRoleValue(member.role)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (() => {
        const visCols = ADMIN_COLS.filter((c) => !hiddenAdminCols.has(c.key));
        const tableWidth = visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto relative select-text">
            <table className="table-fixed text-left text-[10px] leading-4" style={{ width: "100%", minWidth: tableWidth }}>
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  {visCols.map((col) => {
                    const sortable = typeof col.sortCol === "number";
                    const primaryRule = sortRules[0];
                    const isActive = sortable && primaryRule?.col === col.sortCol;
                    const dir = isActive ? primaryRule.dir : "asc";
                    return (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        className={`px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap ${sortable ? "cursor-pointer select-none" : ""}`}
                        onClick={() => sortable && handleSort(col.sortCol as number)}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {col.label}
                          {sortable && (
                            <span className="inline-flex flex-col ml-0.5 leading-none align-middle">
                              <span className={`text-[8px] ${isActive && dir === "asc" ? "text-white/80" : "text-white/20"}`}>▲</span>
                              <span className={`text-[8px] ${isActive && dir === "desc" ? "text-white/80" : "text-white/20"}`}>▼</span>
                            </span>
                          )}
                          {col.key !== "actions" && (
                            <button className="members-col-hide-btn" onClick={(e) => { e.stopPropagation(); setHiddenAdminCols((p) => new Set([...p, col.key])); }} title={`Hide ${col.label}`}>✕</button>
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
                  const memberStrikes = strikesByMemberId.get(member.id) ?? [];
                  const strikeCount = memberStrikes.length;
                  return (
                    <tr key={member.id} className="hover:bg-white/3 transition-colors align-middle">
                      {visCols.map((col) => {
                        switch (col.key) {
                          case "name": return (
                            <td key="name" className="px-2 py-0 h-9 align-middle overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                                  title={`${indicator.label} · Click for progress summary`}
                                  onClick={() => setCreditSummaryMember(member)}
                                  aria-label={`View credit progress for ${member.name}`}
                                />
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                                  <TrackAvatarIcon track={track} color={avatar.text} />
                                </div>
                                <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 56)}</span>
                              </div>
                            </td>
                          );
                          case "email": return (
                            <td key="email" className="px-2 py-0 h-9 align-middle overflow-hidden whitespace-nowrap">
                              <div className="font-mono inline-flex items-center gap-1.5 max-w-full">
                                <span className="text-white/55 block truncate" title={[member.email, member.alternateEmail].filter(Boolean).join(" · ") || "—"}>
                                  {truncateCell([member.email, member.alternateEmail].filter(Boolean).join(" · ") || "—", 92)}
                                </span>
                                {(member.email || member.alternateEmail) && (
                                  <button type="button" className="members-copy-btn" onClick={() => void copyText(member.email || member.alternateEmail || "")} title="Copy email" aria-label="Copy email">
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                      <rect x="9" y="9" width="11" height="11" rx="2" />
                                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                          case "school": return (
                            <td key="school" className="px-2 py-0 h-9 align-middle overflow-hidden whitespace-nowrap">
                              <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 72) : "—"}</span>
                            </td>
                          );
                          case "hsClass": return (
                            <td key="hsClass" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              <span className="text-white/50">{gradeToClassOf(member.grade) || "—"}</span>
                            </td>
                          );
                          case "role": return (
                            <td key="role" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openRolePopoverId === member.id) {
                                      setOpenRolePopoverId(null);
                                      setPopoverPos(null);
                                    } else {
                                      const r = e.currentTarget.getBoundingClientRect();
                                      setPopoverPos({ top: r.bottom + 4, left: r.left });
                                      setOpenRolePopoverId(member.id);
                                    }
                                  }}
                                  className="inline-flex items-center rounded-full border border-white/15 bg-[#11141A] hover:border-[#85CC17]/45 hover:bg-[#85CC17]/10 px-2 py-0.5 text-[10px] font-semibold text-white/80 transition-colors"
                                  title="Click to change role"
                                >
                                  {displayRoleValue(member.role)}
                                </button>
                              ) : (
                                <span className="text-white/50">{displayRoleValue(member.role)}</span>
                              )}
                            </td>
                          );
                          case "resume": return (
                            <td key="resume" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              {(() => {
                                const emailKey = normalizeKey(member.email ?? "");
                                const altEmailKey = normalizeKey(member.alternateEmail ?? "");
                                const resumeUrl = resumeUrlByEmail.get(emailKey) ?? resumeUrlByEmail.get(altEmailKey);
                                return resumeUrl ? (
                                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-[#85CC17]/80 hover:text-[#85CC17] underline whitespace-nowrap">Resume</a>
                                ) : (
                                  <span className="text-white/30">—</span>
                                );
                              })()}
                            </td>
                          );
                          case "acceptedDate": return (
                            <td key="acceptedDate" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              <span className="text-white/50">{member.acceptedDate || "—"}</span>
                            </td>
                          );
                          case "accountCreated": return (
                            <td key="accountCreated" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              <span className="text-white/50">{accountCreated}</span>
                            </td>
                          );
                          case "strikes": return (
                            <td key="strikes" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              {strikeCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setDrawerMember(member)}
                                  title={`${strikeCount} strike${strikeCount === 1 ? "" : "s"} — click to view in member drawer`}
                                  className="members-chip border-red-400/35 bg-red-400/10 text-red-300 hover:bg-red-400/20 transition-colors cursor-pointer"
                                >
                                  {strikeCount} strike{strikeCount === 1 ? "" : "s"}
                                </button>
                              ) : (
                                <span className="text-white/25">—</span>
                              )}
                            </td>
                          );
                          case "actions": return (
                            <td key="actions" className="px-2 py-0 h-9 align-middle whitespace-nowrap">
                              <div className="members-row-actions">
                                {canEdit && <Btn size="sm" variant="secondary" className="members-pill-btn whitespace-nowrap" onClick={() => setDrawerMember(member)}>Manage</Btn>}
                                {canEdit && <Btn size="sm" variant="ghost" className="members-pill-btn whitespace-nowrap" onClick={() => openEdit(member)}>Edit</Btn>}
                                {canEdit && !member.authUid && (() => {
                                  const st = inviteStatus[member.id];
                                  return (
                                    <Btn
                                      size="sm"
                                      variant="ghost"
                                      className="members-pill-btn whitespace-nowrap"
                                      disabled={st === "sending" || st === "sent"}
                                      onClick={() => handleSendInvite(member)}
                                    >
                                      {st === "sending" ? "Sending…" : st === "sent" ? "✓ Sent" : st === "error" ? "Retry" : "Invite"}
                                    </Btn>
                                  );
                                })()}
                              </div>
                            </td>
                          );
                          default: return null;
                        }
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
      {filtered.length === 0 && (
        <Empty
          message="No team members."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first member</Btn> : undefined}
        />
      )}

      <Modal
        open={!!assignmentQuickView}
        onClose={() => setAssignmentQuickView(null)}
        title={assignmentQuickView ? `${assignmentQuickView.item.code} · ${assignmentQuickView.item.title}` : "Assignment"}
      >
        {assignmentQuickView && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2">
              <p className="text-[11px] text-white/55">
                {assignmentQuickView.item.kind}{assignmentQuickView.item.topic ? ` · ${assignmentQuickView.item.topic}` : ""}
              </p>
              <p className="text-[11px] text-white/50 mt-1">
                Status: {assignmentQuickView.item.status || "—"}
                {assignmentQuickView.item.deadline && assignmentQuickView.item.deadline !== "—" ? ` · Due ${assignmentQuickView.item.deadline}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Rest of team</p>
              {assignmentQuickViewRestTeam.length === 0 ? (
                <p className="text-xs text-white/45 mt-1">No other members listed.</p>
              ) : (
                <p className="text-xs text-white/60 mt-1">{assignmentQuickViewRestTeam.join(", ")}</p>
              )}
            </div>
            <p className="text-[11px] text-white/45">
              Click {assignmentQuickView.item.code} again to open the full project popup.
            </p>
          </div>
        )}
        <div className="flex justify-end mt-4 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setAssignmentQuickView(null)}>Close</Btn>
        </div>
      </Modal>

      <Modal
        open={!!creditSummaryMember}
        onClose={() => setCreditSummaryMember(null)}
        title={`Credit Progress · ${creditSummaryMember?.name ?? ""}`}
      >
        {creditSummaryMember && (() => {
          const m = creditSummaryMember;
          const memberClaims = creditClaims.filter(
            (c) => c.memberId === m.id && (!activeCycle || c.cycleId === activeCycle.id),
          );
          const memberAdjustments = creditAdjustments.filter(
            (a) => a.memberId === m.id && (!activeCycle || a.cycleId === activeCycle.id),
          );
          const credits = new Map<string, number>();
          for (const a of creditAssignments) credits.set(a.id, a.credits);
          const ledger = computeCreditLedger({ claims: memberClaims, adjustments: memberAdjustments, assignmentCredits: credits });
          const classification = classifyMember(m);
          const primaryTrack = pickPrimaryTrack(m);
          const target = activeCycle && classification.cycleRole
            ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
            : 0;
          const dot = computeDot({ cycle: activeCycle, member: m, earnedCredits: ledger.total, targetCredits: target, hasAnyClaims: memberClaims.length > 0 });
          const dotColorClass = dot.color === "green" ? "bg-emerald-400" : dot.color === "yellow" ? "bg-yellow-400" : dot.color === "orange" ? "bg-orange-400" : dot.color === "red" ? "bg-red-500" : "bg-gray-400";
          const pendingClaims = memberClaims.filter((c) => c.status === "claimed" || c.status === "in_progress" || c.status === "submitted");
          const approvedClaims = memberClaims.filter((c) => c.status === "approved");
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={`h-3 w-3 rounded-full flex-shrink-0 ${dotColorClass}`} />
                <span className="text-sm text-white/80">{dot.label}</span>
              </div>
              {activeCycle ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white">{ledger.total}</p>
                    <p className="text-[10px] text-white/45 mt-0.5">Credits earned</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white">{target}</p>
                    <p className="text-[10px] text-white/45 mt-0.5">Target</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-center">
                    <p className={`text-lg font-bold ${dot.checkInsBehind > 0 ? "text-red-400" : "text-emerald-400"}`}>{dot.checkInsBehind > 0 ? `-${dot.checkInsBehind}` : "On track"}</p>
                    <p className="text-[10px] text-white/45 mt-0.5">Check-ins behind</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/45">No active cycle — credit tracking is paused.</p>
              )}
              {memberClaims.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-white/70 mb-1.5">Claims this cycle ({memberClaims.length})</p>
                  <div className="max-h-[180px] overflow-y-auto space-y-1 pr-1">
                    {memberClaims.map((claim) => {
                      const assignment = creditAssignments.find((a) => a.id === claim.assignmentId);
                      return (
                        <div key={claim.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-[#0F1014] px-3 py-2">
                          <span className="text-xs text-white/70 truncate">{assignment?.title ?? claim.assignmentId}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-white/50">{credits.get(claim.assignmentId) ?? "?"} cr</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${claim.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : claim.status === "rejected" ? "bg-red-500/15 text-red-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                              {claim.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5">{approvedClaims.length} approved · {pendingClaims.length} pending</p>
                </div>
              )}
              {memberClaims.length === 0 && activeCycle && (
                <p className="text-xs text-white/45">No claims submitted this cycle.</p>
              )}
            </div>
          );
        })()}
        <div className="flex justify-end mt-4 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setCreditSummaryMember(null)}>Close</Btn>
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
          <Field label="High School Class Year">
            <select
              value={form.grade ?? ""}
              onChange={e => setField("grade", e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="">Select class year</option>
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

      {drawerMember && (
        <MemberDrawer
          member={drawerMember}
          reviewerLabel={user?.email || user?.id || "admin"}
          onClose={() => setDrawerMember(null)}
        />
      )}

      {/* Role popover rendered at page root with position: fixed so it escapes
          all ancestor overflow clipping (table cells, overflow-x-auto wraps). */}
      {openRolePopoverId && popoverPos && (() => {
        const member = team.find((m) => m.id === openRolePopoverId);
        if (!member) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 1000 }}
            className="bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
          >
            {ROLE_OPTIONS.map((roleOption) => {
              const isActive = String(member.role ?? "").trim() === roleOption;
              return (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => void handleQuickRoleChange(member, roleOption)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors flex items-center gap-2 ${isActive ? "text-[#85CC17]" : "text-white/70"}`}
                >
                  <span className="w-3 flex-shrink-0 text-[#85CC17]">{isActive ? "✓" : ""}</span>
                  {roleOption}
                </button>
              );
            })}
          </div>
        );
      })()}
    </MembersLayout>
  );
}
