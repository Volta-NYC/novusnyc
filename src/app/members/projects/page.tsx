"use client";

import { useState, useEffect, useRef } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, AutocompleteInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBusinesses, subscribeTeam, createBusiness, updateBusiness, deleteBusiness, type Business, type TeamMember,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES  = ["Not Started", "Discovery", "Active", "On Hold", "Complete"];
const DIVISIONS = ["Tech", "Marketing", "Finance"];
const DIVISION_PUBLIC_LABEL: Record<string, string> = {
  Tech: "Digital & Tech",
  Marketing: "Marketing & Strategy",
  Finance: "Finance & Operations",
};
type ShowcaseColorValue =
  | "blue-soft"
  | "blue-mid"
  | "blue-deep"
  | "lime-soft"
  | "lime-mid"
  | "lime-deep"
  | "amber-soft"
  | "amber-mid"
  | "amber-deep"
  | "pink-soft"
  | "pink-mid"
  | "pink-deep"
  | "red-soft"
  | "red-mid"
  | "red-deep";
const SHOWCASE_STATUSES = ["In Progress", "Active", "Upcoming"];
const SHOWCASE_COLOR_OPTIONS: Array<{ value: ShowcaseColorValue; label: string; swatch: string }> = [
  { value: "blue-soft", label: "Blue · Soft", swatch: "#93C5FD" },
  { value: "blue-mid", label: "Blue · Mid", swatch: "#3B82F6" },
  { value: "blue-deep", label: "Blue · Deep", swatch: "#1D4ED8" },
  { value: "lime-soft", label: "Lime · Soft", swatch: "#BEF264" },
  { value: "lime-mid", label: "Lime · Mid", swatch: "#84CC16" },
  { value: "lime-deep", label: "Lime · Deep", swatch: "#3F6212" },
  { value: "amber-soft", label: "Amber · Soft", swatch: "#FCD34D" },
  { value: "amber-mid", label: "Amber · Mid", swatch: "#F59E0B" },
  { value: "amber-deep", label: "Amber · Deep", swatch: "#B45309" },
  { value: "pink-soft", label: "Pink · Soft", swatch: "#F9A8D4" },
  { value: "pink-mid", label: "Pink · Mid", swatch: "#EC4899" },
  { value: "pink-deep", label: "Pink · Deep", swatch: "#9D174D" },
  { value: "red-soft", label: "Red · Soft", swatch: "#FCA5A5" },
  { value: "red-mid", label: "Red · Mid", swatch: "#EF4444" },
  { value: "red-deep", label: "Red · Deep", swatch: "#991B1B" },
];
const SHOWCASE_SERVICE_OPTIONS = [
  { label: "Website", track: "tech" },
  { label: "SEO", track: "tech" },
  { label: "Social", track: "marketing" },
  { label: "Content", track: "marketing" },
  { label: "Grants", track: "finance" },
  { label: "Finance", track: "finance" },
] as const;
const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];
const SORT_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
] as const;
type ProjectSortMode = (typeof SORT_OPTIONS)[number]["value"];
type ProjectViewMode = "cards" | "compact";

const PROJECT_STATUS_SORT_ORDER: Record<Business["projectStatus"], number> = {
  Active: 0,
  "Not Started": 1,
  Discovery: 2,
  "On Hold": 3,
  Complete: 4,
};

function normalizeColorToken(raw: string): ShowcaseColorValue {
  const key = raw.trim().toLowerCase();
  switch (key) {
    case "blue-soft":
    case "blue-mid":
    case "blue-deep":
    case "lime-soft":
    case "lime-mid":
    case "lime-deep":
    case "amber-soft":
    case "amber-mid":
    case "amber-deep":
    case "pink-soft":
    case "pink-mid":
    case "pink-deep":
    case "red-soft":
    case "red-mid":
    case "red-deep":
      return key;
    // Legacy values mapped to closest new palette value.
    case "green":
    case "green-mid":
    case "green-soft":
      return "lime-mid";
    case "green-deep":
      return "lime-deep";
    case "blue":
      return "blue-mid";
    case "amber":
      return "amber-mid";
    case "orange":
      return "red-mid";
    case "pink":
      return "pink-mid";
    case "purple":
      return "pink-deep";
    default:
      return "blue-mid";
  }
}

function nextSortIndex(items: Business[]): number {
  const max = items.reduce((best, item) => {
    const value = item.sortIndex ?? 0;
    return value > best ? value : best;
  }, 0);
  return max + 1000;
}

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeaderIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseEmailFromDecoratedName(value: string): string {
  const match = value.match(/\(([^()]*@[^()]+)\)\s*$/);
  return match ? match[1].trim().toLowerCase() : "";
}

function stripDecoratedName(value: string): string {
  return value.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const out: string[] = [];
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
          out.push(current.trim());
          current = "";
          continue;
        }
        current += ch;
      }
      out.push(current.trim());
      return out;
    });
}

const BLANK_FORM: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  ownerName: "",
  ownerEmail: "",
  ownerAlternateEmail: "",
  phone: "",
  alternatePhone: "",
  address: "",
  website: "",
  projectStatus: "Not Started",
  teamLead: "",
  firstContactDate: "",
  notes: "",
  division: "Tech",
  teamMembers: [],
  showcaseEnabled: false,
  showcaseFeaturedOnHome: true,
  showcaseName: "",
  showcaseType: "",
  showcaseNeighborhood: "",
  showcaseServices: [],
  showcaseStatus: "In Progress",
  showcaseDescription: "",
  showcaseUrl: "",
  showcaseImageUrl: "",
  showcaseColor: "blue-mid",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BusinessesPage() {
  const [businesses, setBusinesses]           = useState<Business[]>([]);
  const [team, setTeam]                       = useState<TeamMember[]>([]);
  const [search, setSearch]                   = useState("");
  const [filterDiv, setFilterDiv]             = useState("");
  const [sortMode, setSortMode]               = useState<ProjectSortMode>("status");
  const [statusPage, setStatusPage]           = useState<"active_planning" | "completed">("active_planning");
  const [viewMode, setViewMode]               = useState<ProjectViewMode>("cards");
  const [modal, setModal]                     = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]                       = useState(BLANK_FORM);
  const [showOwnerAltEmail, setShowOwnerAltEmail] = useState(false);
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [memberInput, setMemberInput] = useState("");
  const [importingBusinessCsv, setImportingBusinessCsv] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [emailModalProject, setEmailModalProject] = useState<Business | null>(null);
  const [projectEmailSubject, setProjectEmailSubject] = useState("");
  const [projectEmailMessage, setProjectEmailMessage] = useState("");
  const [projectEmailFrom, setProjectEmailFrom] = useState("info@voltanyc.org");
  const [projectEmailMode, setProjectEmailMode] = useState<"plain" | "html">("plain");
  const [projectEmailSending, setProjectEmailSending] = useState(false);
  const [projectEmailStatus, setProjectEmailStatus] = useState<string | null>(null);
  const businessCsvInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedLegacyColorsRef = useRef(false);

  const { ask, Dialog } = useConfirm();
  const { authRole, user, userProfile } = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    if (normalizedLegacyColorsRef.current) return;
    if (!canEdit || businesses.length === 0) return;
    normalizedLegacyColorsRef.current = true;
    void (async () => {
      for (const business of businesses) {
        const raw = String(business.showcaseColor ?? "").trim();
        if (!raw) continue;
        const normalized = normalizeColorToken(raw);
        if (normalized !== raw) {
          // Normalize legacy color values once so all cards/map dots use the same palette.
          // eslint-disable-next-line no-await-in-loop
          await updateBusiness(business.id, { showcaseColor: normalized });
        }
      }
    })();
  }, [businesses, canEdit]);

  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingBusiness(null);
    setShowOwnerAltEmail(false);
    setShowAlternatePhone(false);
    setMemberInput("");
    setModal("create");
  };

  const openEdit = (b: Business) => {
    setForm({
      name: b.name,
      ownerName: b.ownerName,
      ownerEmail: b.ownerEmail,
      ownerAlternateEmail: b.ownerAlternateEmail ?? "",
      phone: b.phone, alternatePhone: b.alternatePhone ?? "", address: b.address, website: b.website,
      projectStatus:  b.projectStatus,
      teamLead:       b.teamLead,
      firstContactDate: b.firstContactDate,
      notes:          b.notes,
      division:       b.division        ?? "Tech",
      teamMembers:    b.teamMembers     ?? [],
      showcaseEnabled: !!b.showcaseEnabled,
      showcaseFeaturedOnHome: b.showcaseFeaturedOnHome ?? true,
      showcaseName: b.showcaseName ?? "",
      showcaseType: b.showcaseType ?? "",
      showcaseNeighborhood: b.showcaseNeighborhood ?? "",
      showcaseServices: b.showcaseServices ?? [],
      showcaseStatus: b.showcaseStatus ?? "In Progress",
      showcaseDescription: b.showcaseDescription ?? "",
      showcaseUrl: b.showcaseUrl ?? "",
      showcaseImageUrl: b.showcaseImageUrl ?? "",
      showcaseColor: normalizeColorToken((b.showcaseColor as string) ?? ""),
    });
    setEditingBusiness(b);
    setShowOwnerAltEmail(!!(b.ownerAlternateEmail ?? "").trim());
    setShowAlternatePhone(!!(b.alternatePhone ?? "").trim());
    setMemberInput("");
    setModal("edit");
  };

  const addTeamMember = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const current = form.teamMembers ?? [];
    if (current.includes(value)) {
      setMemberInput("");
      return;
    }
    setField("teamMembers", [...current, value]);
    setMemberInput("");
  };

  const removeTeamMember = (name: string) => {
    const current = form.teamMembers ?? [];
    setField("teamMembers", current.filter((member) => member !== name));
  };

  const toggleShowcaseService = (label: string) => {
    const current = form.showcaseServices ?? [];
    if (current.includes(label)) {
      setField("showcaseServices", current.filter((item) => item !== label));
      return;
    }
    setField("showcaseServices", [...current, label]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (!form.projectStatus) return;
    const showcaseEnabled = !!form.showcaseEnabled;
    const showcaseColor = normalizeColorToken((form.showcaseColor as string) ?? "");
    const showcaseServices = (form.showcaseServices ?? []).map((service) => service.trim()).filter(Boolean);
    const payload: Partial<Business> = {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
      ownerAlternateEmail: (form.ownerAlternateEmail ?? "").trim(),
      phone: form.phone.trim(),
      alternatePhone: (form.alternatePhone ?? "").trim(),
      address: form.address.trim(),
      website: form.website.trim(),
      projectStatus: form.projectStatus,
      teamLead: form.teamLead.trim(),
      teamMembers: (form.teamMembers ?? []).map((member) => member.trim()).filter(Boolean),
      firstContactDate: form.firstContactDate,
      division: form.division ?? "Tech",
      notes: form.notes,
      showcaseEnabled,
      showcaseColor,
    };

    if (showcaseEnabled) {
      payload.showcaseFeaturedOnHome = !!form.showcaseFeaturedOnHome;
      payload.showcaseName = (form.showcaseName ?? "").trim();
      payload.showcaseType = DIVISION_PUBLIC_LABEL[form.division ?? "Tech"] ?? "Digital & Tech";
      payload.showcaseNeighborhood = (form.showcaseNeighborhood ?? "").trim();
      payload.showcaseServices = showcaseServices;
      payload.showcaseStatus = (form.showcaseStatus as Business["showcaseStatus"]) ?? "In Progress";
      payload.showcaseDescription = (form.showcaseDescription ?? "").trim();
      payload.showcaseUrl = (form.showcaseUrl ?? "").trim();
      payload.showcaseImageUrl = (form.showcaseImageUrl ?? "").trim();
    } else {
      payload.showcaseFeaturedOnHome = false;
    }

    if (editingBusiness) {
      await updateBusiness(editingBusiness.id, {
        ...payload,
        // Remove deprecated keys from legacy entries.
        activeServices: null as unknown as string[],
        languages: null as unknown as string[],
        githubUrl: null as unknown as string,
        driveFolderUrl: null as unknown as string,
        clientNotes: null as unknown as string,
        showcaseName: showcaseEnabled ? payload.showcaseName : (null as unknown as string),
        showcaseType: showcaseEnabled ? payload.showcaseType : (null as unknown as string),
        showcaseNeighborhood: showcaseEnabled ? payload.showcaseNeighborhood : (null as unknown as string),
        showcaseServices: showcaseEnabled ? payload.showcaseServices : (null as unknown as string[]),
        showcaseStatus: showcaseEnabled ? payload.showcaseStatus : (null as unknown as Business["showcaseStatus"]),
        showcaseDescription: showcaseEnabled ? payload.showcaseDescription : (null as unknown as string),
        showcaseUrl: showcaseEnabled ? payload.showcaseUrl : (null as unknown as string),
        showcaseImageUrl: showcaseEnabled ? payload.showcaseImageUrl : (null as unknown as string),
      });
    } else {
      await createBusiness({
        ...payload,
        sortIndex: nextSortIndex(businesses),
      } as Omit<Business, "id" | "createdAt" | "updatedAt">);
    }
    setModal(null);
  };

  const handleDeleteFromEdit = async () => {
    if (!editingBusiness) return;
    const name = editingBusiness.name || "this project";
    await ask(
      async () => {
        await deleteBusiness(editingBusiness.id);
        setModal(null);
      },
      `Delete "${name}"? This permanently removes the project from the tracker.`,
    );
  };

  const importBusinessInquiriesCsv = async (file: File) => {
    setImportingBusinessCsv(true);
    setImportMessage("Importing business inquiries...");
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) {
        setImportMessage("CSV must include headers and at least one row.");
        return;
      }
      const headers = rows[0];
      const timestampIdx = findHeaderIndex(headers, ["timestamp", "created at", "date"]);
      const businessNameIdx = findHeaderIndex(headers, ["business name", "name"]);
      const ownerNameIdx = findHeaderIndex(headers, ["owner name", "your name", "contact name"]);
      const ownerEmailIdx = findHeaderIndex(headers, ["email", "owner email"]);
      const neighborhoodIdx = findHeaderIndex(headers, ["neighborhood", "borough", "city"]);
      const servicesIdx = findHeaderIndex(headers, ["services requested", "services"]);
      const messageIdx = findHeaderIndex(headers, ["message", "notes"]);
      const languageIdx = findHeaderIndex(headers, ["language"]);

      if (businessNameIdx === -1 || ownerNameIdx === -1 || ownerEmailIdx === -1) {
        setImportMessage("CSV must include Business Name, Owner Name, and Email headers.");
        return;
      }

      const existing = new Set(
        businesses.map((b) => `${b.name.trim().toLowerCase()}|${b.ownerName.trim().toLowerCase()}|${b.ownerEmail.trim().toLowerCase()}`)
      );
      let sortCursor = nextSortIndex(businesses);

      let added = 0;
      let skipped = 0;
      for (const row of rows.slice(1)) {
        const businessName = (row[businessNameIdx] ?? "").trim();
        const ownerName = (row[ownerNameIdx] ?? "").trim();
        const ownerEmail = (row[ownerEmailIdx] ?? "").trim().toLowerCase();
        if (!businessName || !ownerName || !ownerEmail) {
          skipped += 1;
          continue;
        }
        const key = `${businessName.toLowerCase()}|${ownerName.toLowerCase()}|${ownerEmail}`;
        if (existing.has(key)) {
          skipped += 1;
          continue;
        }
        const neighborhood = neighborhoodIdx === -1 ? "" : (row[neighborhoodIdx] ?? "").trim();
        const services = servicesIdx === -1 ? "" : (row[servicesIdx] ?? "").trim();
        const message = messageIdx === -1 ? "" : (row[messageIdx] ?? "").trim();
        const language = languageIdx === -1 ? "" : (row[languageIdx] ?? "").trim();
        const rawTimestamp = timestampIdx === -1 ? "" : String(row[timestampIdx] ?? "").trim();
        const parsed = rawTimestamp ? Date.parse(rawTimestamp) : NaN;
        const iso = Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
        await createBusiness({
          name: businessName,
          bidId: "",
          ownerName,
          ownerEmail,
          ownerAlternateEmail: "",
          phone: "",
          alternatePhone: "",
          address: neighborhood,
          website: "",
          projectStatus: "Discovery",
          teamLead: "",
          firstContactDate: iso.slice(0, 10),
          notes: [
            "Imported from Business Inquiries CSV",
            neighborhood ? `Neighborhood: ${neighborhood}` : "",
            services ? `Services Requested: ${services}` : "",
            language ? `Language: ${language}` : "",
            message ? `Message: ${message}` : "",
          ].filter(Boolean).join("\n"),
          division: "Marketing",
          teamMembers: [],
          sortIndex: sortCursor,
          intakeSource: "website_form",
          showcaseEnabled: false,
          showcaseFeaturedOnHome: false,
          showcaseName: "",
          showcaseType: "",
          showcaseNeighborhood: "",
          showcaseServices: [],
          showcaseStatus: "In Progress",
          showcaseDescription: "",
          showcaseUrl: "",
          showcaseImageUrl: "",
          showcaseColor: "blue-mid",
        });
        sortCursor += 1000;
        existing.add(key);
        added += 1;
      }
      setImportMessage(`Business import complete: ${added} added, ${skipped} skipped.`);
    } catch {
      setImportMessage("Could not import business inquiries CSV.");
    } finally {
      setImportingBusinessCsv(false);
    }
  };

  const onBusinessCsvInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importBusinessInquiriesCsv(file);
    event.target.value = "";
  };

  const statusMatchesPage = (status: Business["projectStatus"]) => {
    if (statusPage === "active_planning") return status === "Active" || status === "Not Started" || status === "Discovery";
    return status === "Complete";
  };

  const matchesSearch = (project: Business) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return project.name.toLowerCase().includes(query)
      || project.ownerName.toLowerCase().includes(query)
      || project.ownerEmail.toLowerCase().includes(query)
      || (project.teamLead ?? "").toLowerCase().includes(query);
  };

  const sortBusinesses = (list: Business[]) => {
    if (sortMode === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...list].sort((a, b) => {
      const statusDelta = PROJECT_STATUS_SORT_ORDER[a.projectStatus] - PROJECT_STATUS_SORT_ORDER[b.projectStatus];
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    });
  };

  const statusScoped = businesses.filter((business) => statusMatchesPage(business.projectStatus));
  const divisionScoped = statusScoped.filter((business) => !filterDiv || business.division === filterDiv);
  const filtered = sortBusinesses(divisionScoped.filter(matchesSearch));

  const teamNameCounts = new Map<string, number>();
  team.forEach((member) => {
    const key = member.name.trim().toLowerCase();
    if (!key) return;
    teamNameCounts.set(key, (teamNameCounts.get(key) ?? 0) + 1);
  });

  const teamNameOptions = Array.from(
    new Set(
      team
        .map((member) => {
          const name = member.name.trim();
          if (!name) return "";
          const nameKey = name.toLowerCase();
          const count = teamNameCounts.get(nameKey) ?? 0;
          if (count <= 1) return name;
          const suffix = member.email?.trim() || member.school?.trim() || member.id.slice(-6);
          return `${name} (${suffix})`;
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const resolveProjectRecipients = (project: Business): { emails: string[]; unresolved: string[] } => {
    const unresolved: string[] = [];
    const emailSet = new Set<string>();
    const availableByEmail = new Map<string, TeamMember>();
    const availableByName = new Map<string, TeamMember[]>();

    for (const member of team) {
      const emailKey = normalizeKey(member.email ?? "");
      if (emailKey) availableByEmail.set(emailKey, member);
      const nameKey = normalizeKey(member.name ?? "");
      if (!nameKey) continue;
      const list = availableByName.get(nameKey) ?? [];
      list.push(member);
      availableByName.set(nameKey, list);
    }

    const assigned = [
      ...(project.teamLead ? [project.teamLead] : []),
      ...(project.teamMembers ?? []),
    ].map((value) => value.trim()).filter(Boolean);

    for (const raw of assigned) {
      const decoratedEmail = normalizeKey(parseEmailFromDecoratedName(raw));
      if (decoratedEmail) {
        const exact = availableByEmail.get(decoratedEmail);
        if (exact?.email?.trim()) {
          emailSet.add(exact.email.trim().toLowerCase());
          continue;
        }
        emailSet.add(decoratedEmail);
        continue;
      }
      const key = normalizeKey(stripDecoratedName(raw));
      const matches = availableByName.get(key) ?? [];
      if (matches.length > 0) {
        matches.forEach((member) => {
          const email = member.email?.trim().toLowerCase();
          if (email) emailSet.add(email);
        });
      } else {
        unresolved.push(raw);
      }
    }

    return {
      emails: Array.from(emailSet),
      unresolved: Array.from(new Set(unresolved)),
    };
  };

  const projectEmailRecipients = emailModalProject ? resolveProjectRecipients(emailModalProject) : { emails: [], unresolved: [] };

  const openProjectEmailModal = (project: Business) => {
    setEmailModalProject(project);
    setProjectEmailFrom("info@voltanyc.org");
    setProjectEmailMode("plain");
    setProjectEmailSubject(`${project.name} — Project Update`);
    setProjectEmailMessage("");
    setProjectEmailStatus(null);
  };

  const sendProjectEmail = async () => {
    if (!emailModalProject) return;
    if (!projectEmailSubject.trim() || !projectEmailMessage.trim()) {
      setProjectEmailStatus("Please add a subject and message.");
      return;
    }
    if (projectEmailRecipients.emails.length === 0) {
      setProjectEmailStatus("No assigned members with email addresses were found.");
      return;
    }
    if (!user) {
      setProjectEmailStatus("Not authenticated.");
      return;
    }

    setProjectEmailSending(true);
    setProjectEmailStatus("Sending…");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/members/team-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAddress: projectEmailFrom,
          subject: projectEmailSubject.trim(),
          message: projectEmailMessage.trim(),
          contentMode: projectEmailMode,
          recipients: projectEmailRecipients.emails,
        }),
      });
      if (!res.ok) {
        setProjectEmailStatus("Could not send email.");
        return;
      }
      const payload = await res.json() as { sent?: number; failed?: string[] };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      setProjectEmailStatus(
        failedCount > 0
          ? `Sent to ${sentCount}. Failed: ${failedCount}.`
          : `Sent to ${sentCount} members.`,
      );
    } catch {
      setProjectEmailStatus("Could not send email.");
    } finally {
      setProjectEmailSending(false);
    }
  };

  const activePlanningCount = businesses.filter((b) => b.projectStatus === "Active" || b.projectStatus === "Not Started" || b.projectStatus === "Discovery").length;
  const completedCount = businesses.filter((b) => b.projectStatus === "Complete").length;

  const normalize = (v: string) => v.trim().toLowerCase();
  const myEmail = normalize(userProfile?.email ?? user?.email ?? "");
  const teamMatchByEmail = myEmail ? team.find((m) => normalize(m.email ?? "") === myEmail) : undefined;
  const myNameSet = new Set(
    [userProfile?.name, teamMatchByEmail?.name]
      .map((v) => normalize(v ?? ""))
      .filter(Boolean)
  );

  const isProjectMine = (project: Business) => {
    if (myNameSet.size === 0) return false;
    const leadKey = normalize(project.teamLead ?? "");
    if (leadKey && myNameSet.has(leadKey)) return true;
    return (project.teamMembers ?? []).some((member) => myNameSet.has(normalize(member)));
  };

  const isNonAdminMember = authRole !== "admin";
  const myProjects = isNonAdminMember ? filtered.filter(isProjectMine) : [];
  const otherProjects = isNonAdminMember ? filtered.filter((p) => !isProjectMine(p)) : filtered;
  const renderProjectCard = (b: Business) => (
    <div
      key={b.id}
      className="bg-[#1C1F26] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-all flex flex-col gap-3"
    >

      {/* Name + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base leading-tight break-words">
            {b.name}
            {b.intakeSource === "website_form" && (
              <span className="text-amber-300 ml-1" title="Submitted via website form">★</span>
            )}
            {b.showcaseEnabled && (
              <span className="text-blue-300 ml-1" title="Visible on public site">◆</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge label={b.projectStatus} />
          {b.division && (
            <span className="text-[10px] font-medium text-white/60 bg-white/8 px-2 py-0.5 rounded-full">{b.division}</span>
          )}
        </div>
      </div>

      {/* Contact info */}
      {(b.ownerName || b.ownerEmail || b.ownerAlternateEmail || b.phone || b.alternatePhone || b.website) && (
        <div className="bg-white/4 rounded-lg px-3 py-2 space-y-1">
          {b.ownerName && (
            <p className="text-white/70 text-xs font-medium">{b.ownerName}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {b.ownerEmail && (
              <a href={`mailto:${b.ownerEmail}`} className="text-[#85CC17]/70 hover:text-[#85CC17] text-xs font-mono transition-colors">{b.ownerEmail}</a>
            )}
            {b.ownerAlternateEmail && (
              <a href={`mailto:${b.ownerAlternateEmail}`} className="text-[#85CC17]/55 hover:text-[#85CC17]/80 text-xs font-mono transition-colors">{b.ownerAlternateEmail}</a>
            )}
            {b.phone && (
              <span className="text-white/40 text-xs">{b.phone}</span>
            )}
            {b.alternatePhone && (
              <span className="text-white/35 text-xs">{b.alternatePhone}</span>
            )}
          </div>
          {b.website && (
            <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-400/70 hover:text-blue-400 text-xs font-mono transition-colors truncate block">{b.website}</a>
          )}
        </div>
      )}

      {/* Assigned members */}
      <div className="border-t border-white/5 pt-2">
        <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Assigned Members</p>
        {(b.teamMembers ?? []).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(b.teamMembers ?? []).map((member) => (
              <span
                key={member}
                className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#85CC17]/15 text-[#85CC17] border-[#85CC17]/25"
              >
                {member}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-white/35 text-xs">No members assigned yet.</p>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
          <Btn
            size="sm"
            variant="secondary"
            className="w-full justify-center"
            onClick={() => openProjectEmailModal(b)}
            disabled={resolveProjectRecipients(b).emails.length === 0}
          >
            Email Team
          </Btn>
          <Btn size="sm" variant="secondary" className="w-full justify-center" onClick={() => openEdit(b)}>Edit</Btn>
        </div>
      )}
    </div>
  );

  const renderProjectCompactRow = (b: Business) => {
    const memberList = (b.teamMembers ?? []).filter(Boolean);
    const teamSummary = [
      b.teamLead ? `Lead: ${b.teamLead}` : "",
      memberList.length > 0 ? `${memberList.slice(0, 3).join(", ")}${memberList.length > 3 ? ` +${memberList.length - 3}` : ""}` : "",
    ].filter(Boolean).join(" · ");
    const ownerSummary = [
      b.ownerName || "",
      b.ownerEmail || "",
      b.phone || "",
    ].filter(Boolean).join(" · ");

    return (
      <div
        key={b.id}
        className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-[minmax(240px,2fr)_120px_130px_minmax(240px,2fr)_minmax(240px,2fr)_auto] gap-2 sm:gap-3 items-center"
      >
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate" title={b.name}>
            {b.name}
            {b.intakeSource === "website_form" && <span className="text-amber-300 ml-1">★</span>}
            {b.showcaseEnabled && <span className="text-blue-300 ml-1">◆</span>}
          </p>
        </div>
        <div className="text-xs text-white/70 min-w-0 truncate" title={b.division || "—"}>{b.division || "—"}</div>
        <div className="text-xs min-w-0"><Badge label={b.projectStatus} /></div>
        <div className="text-xs text-white/55 min-w-0 truncate" title={ownerSummary || "—"}>{ownerSummary || "—"}</div>
        <div className="text-xs text-white/55 min-w-0 truncate" title={teamSummary || "No team assigned"}>{teamSummary || "No team assigned"}</div>
        {canEdit ? (
          <div className="sm:justify-self-end flex gap-2">
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => openProjectEmailModal(b)}
              disabled={resolveProjectRecipients(b).emails.length === 0}
            >
              Email Team
            </Btn>
            <Btn size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Btn>
          </div>
        ) : <div />}
      </div>
    );
  };

  return (
    <MembersLayout>
      <Dialog />
      <input
        ref={businessCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onBusinessCsvInput}
      />

      <PageHeader
        title="Projects"
        subtitle={`${filtered.length} shown · ${businesses.length} total projects`}
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Btn
                variant="secondary"
                onClick={() => businessCsvInputRef.current?.click()}
                disabled={importingBusinessCsv}
              >
                {importingBusinessCsv ? "Importing..." : "Import Business Inquiries CSV"}
              </Btn>
              <Btn variant="primary" onClick={openCreate}>+ New Project</Btn>
            </div>
          ) : undefined
        }
      />
      {importMessage && <p className="text-xs text-white/55 mb-3">{importMessage}</p>}
      <p className="text-xs text-white/45 mb-4">
        <span className="text-amber-300 font-semibold">★</span> Submitted via website business interest form.
        <span className="mx-2">·</span>
        <span className="text-blue-300 font-semibold">◆</span> Visible on public home/showcase.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Active"    value={businesses.filter(b => b.projectStatus === "Active").length}   color="text-green-400" />
        <StatCard label="Discovery" value={businesses.filter(b => b.projectStatus === "Discovery").length} color="text-blue-400" />
        <StatCard label="Not Started" value={businesses.filter(b => b.projectStatus === "Not Started").length} color="text-purple-400" />
        <StatCard label="On Hold"   value={businesses.filter(b => b.projectStatus === "On Hold").length} color="text-orange-400" />
      </div>

      <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1 mb-4 w-fit">
        {[
          { key: "active_planning" as const, label: "Active / Planning", count: activePlanningCount },
          { key: "completed" as const, label: "Completed", count: completedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusPage(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-body transition-colors ${
              statusPage === tab.key ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/55 hover:text-white"
            }`}
          >
            {tab.label} <span className="text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search projects, owners, leads…" />
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-11 py-2.5 text-sm text-white/70 focus:outline-none appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff66' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as ProjectSortMode)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/60 hover:text-white"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("compact")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "compact" ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/60 hover:text-white"}`}
          >
            Compact
          </button>
        </div>
      </div>

      {isNonAdminMember && myProjects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white/75 text-sm font-semibold uppercase tracking-wider mb-3">My Projects</h2>
          {viewMode === "cards" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProjects.map(renderProjectCard)}
            </div>
          ) : (
            <div className="space-y-2">
              {myProjects.map(renderProjectCompactRow)}
            </div>
          )}
        </div>
      )}

      {/* Project cards */}
      {isNonAdminMember && myProjects.length > 0 && (
        <h2 className="text-white/65 text-sm font-semibold uppercase tracking-wider mb-3">Other Projects</h2>
      )}
      {viewMode === "cards" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {otherProjects.map(renderProjectCard)}
          {filtered.length === 0 && (
            <div className="col-span-3">
              <Empty
                message="No projects found in this section."
                action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first project</Btn> : undefined}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {otherProjects.map(renderProjectCompactRow)}
          {filtered.length === 0 && (
            <Empty
              message="No projects found in this section."
              action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first project</Btn> : undefined}
            />
          )}
        </div>
      )}

      <Modal
        open={!!emailModalProject}
        onClose={() => setEmailModalProject(null)}
        title={`Email Team${emailModalProject ? ` · ${emailModalProject.name}` : ""}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-white/55">
            {projectEmailRecipients.emails.length} recipients
            {projectEmailRecipients.unresolved.length > 0 ? ` · ${projectEmailRecipients.unresolved.length} unresolved assignments` : ""}
          </p>
          {projectEmailRecipients.unresolved.length > 0 && (
            <div className="bg-[#0F1014] border border-white/10 rounded-lg p-3">
              <p className="text-[11px] text-white/70 mb-1">Unresolved assigned names:</p>
              <p className="text-[11px] text-white/45 break-words">{projectEmailRecipients.unresolved.join(", ")}</p>
            </div>
          )}
          <Field label="Subject" required>
            <Input value={projectEmailSubject} onChange={(e) => setProjectEmailSubject(e.target.value)} />
          </Field>
          <Field label="Send from" required>
            <select
              value={projectEmailFrom}
              onChange={(e) => setProjectEmailFrom(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              {TEAM_EMAIL_FROM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Message Format" required>
            <select
              value={projectEmailMode}
              onChange={(e) => setProjectEmailMode(e.target.value === "html" ? "html" : "plain")}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="plain">Plain Text</option>
              <option value="html">HTML (links/images supported)</option>
            </select>
          </Field>
          <Field label="Message" required>
            <TextArea
              rows={8}
              value={projectEmailMessage}
              onChange={(e) => setProjectEmailMessage(e.target.value)}
              placeholder={
                projectEmailMode === "html"
                  ? "<p>Team update…</p>"
                  : "Write your email..."
              }
            />
          </Field>
          {projectEmailStatus && <p className="text-xs text-white/60">{projectEmailStatus}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setEmailModalProject(null)}>Close</Btn>
            <Btn
              variant="primary"
              onClick={sendProjectEmail}
              disabled={projectEmailSending || projectEmailRecipients.emails.length === 0}
            >
              {projectEmailSending ? "Sending..." : `Send Email (${projectEmailRecipients.emails.length})`}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingBusiness ? "Edit Project" : "New Project"}>
        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">
          {/* ── Project Info ── */}
          <div className="col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Project Info</p>
          </div>
          <Field label="Status" required>
            <Select options={STATUSES} value={form.projectStatus} onChange={e => setField("projectStatus", e.target.value)} />
          </Field>
          <Field label="Division">
            <Select options={DIVISIONS} value={form.division ?? "Tech"} onChange={e => setField("division", e.target.value)} />
          </Field>
          <Field label="Team Lead">
            <AutocompleteInput
              value={form.teamLead}
              onChange={(value) => setField("teamLead", value)}
              options={teamNameOptions}
              placeholder="Start typing a member name"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Assigned Members">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <AutocompleteInput
                    value={memberInput}
                    onChange={setMemberInput}
                    options={teamNameOptions}
                    placeholder="Type a member name"
                  />
                  <Btn size="sm" variant="secondary" onClick={() => addTeamMember(memberInput)}>Add</Btn>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {(form.teamMembers ?? []).length === 0 ? (
                    <p className="text-xs text-white/35">No members assigned yet.</p>
                  ) : (
                    (form.teamMembers ?? []).map((member) => (
                      <div key={member} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2">
                        <span className="text-sm text-white/80">{member}</span>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(member)}
                          className="text-white/30 hover:text-red-400 transition-colors"
                          aria-label={`Remove ${member}`}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Notes">
              <TextArea rows={3} value={form.notes} onChange={e => setField("notes", e.target.value)} />
            </Field>
          </div>

          {/* ── Business Info ── */}
          <div className="col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Business Info</p>
          </div>
          <Field label="Business Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="Owner Name">
            <Input value={form.ownerName} onChange={e => setField("ownerName", e.target.value)} />
          </Field>
          <Field label="Owner Email">
            <div className="flex items-center gap-2">
              <Input type="email" value={form.ownerEmail} onChange={e => setField("ownerEmail", e.target.value)} />
              {!showOwnerAltEmail ? (
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-white/15 text-white/65 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
                  onClick={() => setShowOwnerAltEmail(true)}
                  aria-label="Add alternate email"
                  title="Add alternate email"
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-white/15 text-white/40 hover:text-red-300 hover:border-red-300/40 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
                  onClick={() => {
                    setField("ownerAlternateEmail", "");
                    setShowOwnerAltEmail(false);
                  }}
                  aria-label="Remove alternate email"
                  title="Remove alternate email"
                >
                  ×
                </button>
              )}
            </div>
          </Field>
          {showOwnerAltEmail && (
            <div>
              <Field label="Alternate Email">
                <Input
                  type="email"
                  value={form.ownerAlternateEmail ?? ""}
                  onChange={e => setField("ownerAlternateEmail", e.target.value)}
                />
              </Field>
            </div>
          )}
          <Field label="Phone">
            <div className="flex items-center gap-2">
              <Input value={form.phone} onChange={e => setField("phone", e.target.value)} />
              {!showAlternatePhone ? (
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-white/15 text-white/65 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
                  onClick={() => setShowAlternatePhone(true)}
                  aria-label="Add alternate phone"
                  title="Add alternate phone"
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-white/15 text-white/40 hover:text-red-300 hover:border-red-300/40 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
                  onClick={() => {
                    setField("alternatePhone", "");
                    setShowAlternatePhone(false);
                  }}
                  aria-label="Remove alternate phone"
                  title="Remove alternate phone"
                >
                  ×
                </button>
              )}
            </div>
          </Field>
          {showAlternatePhone && (
            <div>
              <Field label="Alternate Phone">
                <Input
                  value={form.alternatePhone ?? ""}
                  onChange={e => setField("alternatePhone", e.target.value)}
                />
              </Field>
            </div>
          )}
          <Field label="Website">
            <Input value={form.website} onChange={e => setField("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="First Contact Date">
            <Input type="date" value={form.firstContactDate} onChange={e => setField("firstContactDate", e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Input value={form.address} onChange={e => setField("address", e.target.value)} />
            </Field>
          </div>

          {/* ── Public Showcase ── */}
          <div className="col-span-2 mt-2 pt-2 border-t border-white/8">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-1">Public Showcase</p>
            <p className="text-white/45 text-xs font-body">Controls what appears on the public home/showcase cards.</p>
          </div>
          <Field label="Card/Map Color">
            <div className="grid grid-cols-2 gap-2">
              {SHOWCASE_COLOR_OPTIONS.map((option) => {
                const selected = normalizeColorToken((form.showcaseColor as string) ?? "") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField("showcaseColor", option.value)}
                    className={`w-full rounded-lg border px-2 py-1.5 text-xs text-left transition-colors ${
                      selected ? "border-white/55 bg-white/10 text-white" : "border-white/15 bg-[#0F1014] text-white/70 hover:border-white/30"
                    }`}
                    title={option.label}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-black/25"
                        style={{ backgroundColor: option.swatch }}
                      />
                      <span className="truncate">{option.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body">
              <input
                type="checkbox"
                className="accent-[#85CC17] w-4 h-4"
                checked={!!form.showcaseEnabled}
                onChange={(e) => setField("showcaseEnabled", e.target.checked)}
              />
              Show this project on the public site
            </label>
            <label className={`inline-flex items-center gap-2 text-sm font-body mt-2 ${form.showcaseEnabled ? "text-white/75" : "text-white/35"}`}>
              <input
                type="checkbox"
                className="accent-[#85CC17] w-4 h-4"
                checked={!!form.showcaseFeaturedOnHome}
                onChange={(e) => setField("showcaseFeaturedOnHome", e.target.checked)}
                disabled={!form.showcaseEnabled}
              />
              Feature this card on the homepage
            </label>
          </div>

          {form.showcaseEnabled && (
            <>
              <Field label="Card Name (optional)">
                <Input value={form.showcaseName ?? ""} onChange={e => setField("showcaseName", e.target.value)} />
              </Field>
              <Field label="Division">
                <Input value={DIVISION_PUBLIC_LABEL[form.division ?? "Tech"]} readOnly />
              </Field>
              <Field label="Neighborhood, Borough">
                <Input
                  value={form.showcaseNeighborhood ?? ""}
                  onChange={e => setField("showcaseNeighborhood", e.target.value)}
                  placeholder="e.g. Chinatown, Manhattan"
                />
              </Field>
              <Field label="Card Status">
                <Select options={SHOWCASE_STATUSES} value={form.showcaseStatus ?? "In Progress"} onChange={e => setField("showcaseStatus", e.target.value)} />
              </Field>
              <Field label="Image Link">
                <Input value={form.showcaseImageUrl ?? ""} onChange={e => setField("showcaseImageUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <div className="col-span-2">
                <Field label="What we do">
                  <div className="flex flex-wrap gap-2">
                    {SHOWCASE_SERVICE_OPTIONS.map((option) => {
                      const selected = (form.showcaseServices ?? []).includes(option.label);
                      const trackClass = option.track === "tech"
                        ? (selected ? "bg-blue-200 text-blue-900 border-blue-300" : "bg-blue-50 text-blue-700 border-blue-200")
                        : option.track === "marketing"
                        ? (selected ? "bg-lime-200 text-lime-900 border-lime-300" : "bg-lime-50 text-lime-700 border-lime-200")
                        : (selected ? "bg-amber-200 text-amber-900 border-amber-300" : "bg-amber-50 text-amber-700 border-amber-200");
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => toggleShowcaseService(option.label)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${trackClass}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Description">
                  <TextArea rows={3} value={form.showcaseDescription ?? ""} onChange={e => setField("showcaseDescription", e.target.value)} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Public Link (optional)">
                  <Input value={form.showcaseUrl ?? ""} onChange={e => setField("showcaseUrl", e.target.value)} placeholder="https://" />
                </Field>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          {editingBusiness && (
            <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
              Delete Project
            </Btn>
          )}
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingBusiness ? "Save" : "Create"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
