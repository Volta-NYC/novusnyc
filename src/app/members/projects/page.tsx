"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, AutocompleteInput, useConfirm,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeBusinesses, subscribeTeam, subscribeFinanceAssignments,
  createBusiness, updateBusiness, deleteBusiness,
  type Business, type TeamMember, type FinanceAssignment,
} from "@/lib/members/storage";
import { computeGlobalCodes } from "@/lib/members/assignmentCodes";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES  = ["Upcoming", "Ongoing", "Completed"] as const;
type TrackDivision = "Tech" | "Marketing" | "Finance";
type ProjectStatusValue = (typeof STATUSES)[number];
type DeadlineItem = {
  label: string;
  date: string;
};
const DIVISION_PUBLIC_LABEL: Record<string, string> = {
  Tech: "Digital & Tech",
  Marketing: "Marketing & Strategy",
  Finance: "Finance & Operations",
};
const TRACK_META: Record<TrackDivision, { label: string; chipClass: string; dotClass: string }> = {
  Tech: {
    label: "Tech",
    chipClass: "bg-blue-100 text-blue-700 border-blue-300",
    dotClass: "bg-blue-500",
  },
  Marketing: {
    label: "Marketing",
    chipClass: "bg-lime-100 text-lime-700 border-lime-300",
    dotClass: "bg-lime-500",
  },
  Finance: {
    label: "Finance",
    chipClass: "bg-amber-100 text-amber-700 border-amber-300",
    dotClass: "bg-amber-500",
  },
};
const TRACK_ORDER: TrackDivision[] = ["Tech", "Marketing", "Finance"];
type TrackProjectInfo = {
  projectStatus: ProjectStatusValue;
  teamMembers: string[];
  deadlines: DeadlineItem[];
  notes: string;
};
type TrackProjectMap = Partial<Record<TrackDivision, TrackProjectInfo>>;
const TRACK_DEADLINE_DEFAULT: DeadlineItem[] = [{ label: "Final Deadline", date: "" }];
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
  | "purple-mid"
  | "red-soft"
  | "red-mid"
  | "red-deep";
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
  { value: "purple-mid", label: "Purple · Mid", swatch: "#8B5CF6" },
  { value: "red-soft", label: "Red · Soft", swatch: "#FCA5A5" },
  { value: "red-mid", label: "Red · Mid", swatch: "#EF4444" },
  { value: "red-deep", label: "Red · Deep", swatch: "#991B1B" },
];
const SHOWCASE_COLOR_VALUES = SHOWCASE_COLOR_OPTIONS.map((option) => option.value);
const SHOWCASE_SERVICE_OPTIONS = ["Website", "SEO", "Social", "Content", "Grants", "Finance"] as const;
type ShowcaseServiceValue = (typeof SHOWCASE_SERVICE_OPTIONS)[number];
const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];

const PROJECT_STATUS_SORT_ORDER: Record<Business["projectStatus"], number> = {
  Ongoing: 0,
  Upcoming: 1,
  Completed: 2,
  Active: 0,
  "On Hold": 1,
  "Not Started": 1,
  Discovery: 1,
  Complete: 2,
};

function normalizeProjectStatus(value: unknown): ProjectStatusValue {
  const raw = String(value ?? "").trim();
  if (raw === "Ongoing" || raw === "Upcoming" || raw === "Completed") return raw;
  if (raw === "Active") return "Ongoing";
  if (raw === "Complete") return "Completed";
  if (raw === "On Hold" || raw === "Not Started" || raw === "Discovery") return "Upcoming";
  return "Upcoming";
}

function sortDeadlinesMostRecentFirst(input: DeadlineItem[]): DeadlineItem[] {
  return [...input]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aMs = Date.parse(a.entry.date || "");
      const bMs = Date.parse(b.entry.date || "");
      const aValid = Number.isFinite(aMs);
      const bValid = Number.isFinite(bMs);
      if (aValid && bValid && aMs !== bMs) return bMs - aMs;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map((row) => row.entry);
}

function getOrdinalDeadlineLabel(index: number): string {
  const value = Math.max(1, index);
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th Deadline`;
  const last = value % 10;
  if (last === 1) return `${value}st Deadline`;
  if (last === 2) return `${value}nd Deadline`;
  if (last === 3) return `${value}rd Deadline`;
  return `${value}th Deadline`;
}

function parseOrdinalDeadlineNumber(label: string): number | null {
  const match = label.trim().match(/^(\d+)(st|nd|rd|th)\s+deadline$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeTrackDeadlines(value: unknown): DeadlineItem[] {
  const fromArray = Array.isArray(value)
    ? value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        const label = String(row.label ?? "").trim();
        const date = String(row.date ?? "").trim();
        if (!label && !date) return null;
        return { label, date };
      })
      .filter((entry): entry is DeadlineItem => !!entry)
    : [];

  if (fromArray.length > 0) return sortDeadlinesMostRecentFirst(fromArray);
  return [...TRACK_DEADLINE_DEFAULT];
}

function isTrackDivision(value: unknown): value is TrackDivision {
  return value === "Tech" || value === "Marketing" || value === "Finance";
}

function normalizeDivision(value: unknown): TrackDivision {
  return isTrackDivision(value) ? value : "Tech";
}

function normalizeTrackProjectInfo(value: unknown): TrackProjectInfo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    projectStatus: normalizeProjectStatus(row.projectStatus),
    teamMembers: Array.isArray(row.teamMembers) ? row.teamMembers.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    deadlines: normalizeTrackDeadlines(row.deadlines),
    notes: String(row.notes ?? "").trim(),
  };
}

function normalizeTrackProjectsFromBusiness(business: Business): { projectTracks: TrackDivision[]; trackProjects: TrackProjectMap } {
  const normalizedMap: TrackProjectMap = {};
  const rawTrackProjects = business.trackProjects && typeof business.trackProjects === "object"
    ? (business.trackProjects as Record<string, unknown>)
    : {};

  for (const track of TRACK_ORDER) {
    const info = normalizeTrackProjectInfo(rawTrackProjects[track]);
    if (info) normalizedMap[track] = info;
  }

  const normalizedTracks = (Array.isArray(business.projectTracks) ? business.projectTracks : [])
    .map((track) => normalizeDivision(track))
    .filter((track, index, arr) => arr.indexOf(track) === index);

  let projectTracks = normalizedTracks.filter((track) => !!normalizedMap[track]);
  if (projectTracks.length === 0) {
    projectTracks = Object.keys(normalizedMap).filter(isTrackDivision);
  }

  if (projectTracks.length === 0) {
    const legacyMembers = (business.teamMembers ?? []).map((name) => String(name ?? "").trim()).filter(Boolean);
    if (legacyMembers.length > 0) {
      const fallbackTrack: TrackDivision = "Tech";
      projectTracks = [fallbackTrack];
      normalizedMap[fallbackTrack] = {
        projectStatus: normalizeProjectStatus(business.projectStatus),
        teamMembers: legacyMembers,
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: String(business.notes ?? "").trim(),
      };
    } else {
      return { projectTracks: [], trackProjects: normalizedMap };
    }
  }

  for (const track of projectTracks) {
    if (!normalizedMap[track]) {
      normalizedMap[track] = {
        projectStatus: normalizeProjectStatus(business.projectStatus),
        teamMembers: [],
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: "",
      };
    }
  }

  return { projectTracks, trackProjects: normalizedMap };
}

function deriveOverallStatus(trackProjects: TrackProjectMap, projectTracks: TrackDivision[]): ProjectStatusValue {
  if (projectTracks.length === 0) return "Upcoming";
  const statuses = projectTracks.map((track) => trackProjects[track]?.projectStatus ?? "Upcoming");
  if (statuses.includes("Ongoing")) return "Ongoing";
  if (statuses.includes("Upcoming")) return "Upcoming";
  return "Completed";
}

function derivePrimaryDivision(projectTracks: TrackDivision[]): TrackDivision {
  if (projectTracks.length === 0) return "Tech";
  if (projectTracks.includes("Tech")) return "Tech";
  if (projectTracks.includes("Marketing")) return "Marketing";
  return "Finance";
}

function formatTrackTeamLabel(track: TrackDivision): string {
  return `${TRACK_META[track].label} Team`;
}

function randomShowcaseColor(): ShowcaseColorValue {
  const index = Math.floor(Math.random() * SHOWCASE_COLOR_VALUES.length);
  return SHOWCASE_COLOR_VALUES[index] ?? "blue-mid";
}

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
    case "purple-mid":
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
      return "purple-mid";
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

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeLoose(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseEmailFromDecoratedName(value: string): string {
  const match = value.match(/\(([^()]*@[^()]+)\)\s*$/);
  return match ? match[1].trim().toLowerCase() : "";
}

function stripDecoratedName(value: string): string {
  return value.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

const BLANK_FORM: Omit<Business, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  ownerName: "",
  ownerEmail: "",
  ownerAlternateEmail: "",
  phone: "",
  alternatePhone: "",
  address: "",
  neighborhood: "",
  website: "",
  firstContactDate: "",
  projectStatus: "Upcoming",
  teamLead: "",
  notes: "",
  division: "Tech",
  teamMembers: [],
  projectTracks: [],
  trackProjects: {},
  showcaseEnabled: false,
  showcaseFeaturedOnHome: false,
  showcaseType: "Digital & Tech",
  showcaseNeighborhood: "",
  showcaseServices: [],
  showcaseDescription: "",
  showcaseUrl: "",
  showcaseImageUrl: "",
  showcaseImageData: "",
  showcaseColor: "blue-mid",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

type ProjectTab = "tech" | "marketing" | "discovery";

function normalizeProjectTab(value: string | null | undefined): ProjectTab {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "marketing") return "marketing";
  if (raw === "discovery") return "discovery";
  return "tech";
}

const TAB_TRACK: Record<Exclude<ProjectTab, "discovery">, TrackDivision> = {
  tech: "Tech",
  marketing: "Marketing",
};

const TAB_TITLE: Record<ProjectTab, string> = {
  tech: "Tech Projects",
  marketing: "Marketing Projects",
  discovery: "Discovery",
};

// Wrap the page body in Suspense so static prerendering doesn't bail on the
// useSearchParams() call inside BusinessesPageInner.
export default function BusinessesPage() {
  return (
    <Suspense fallback={null}>
      <BusinessesPageInner />
    </Suspense>
  );
}

function BusinessesPageInner() {
  const searchParams = useSearchParams();
  const activeTab = normalizeProjectTab(searchParams?.get("tab"));

  const [businesses, setBusinesses]           = useState<Business[]>([]);
  const [team, setTeam]                       = useState<TeamMember[]>([]);
  const [search, setSearch]                   = useState("");
  const [openStatusPopoverId, setOpenStatusPopoverId] = useState<string | null>(null);
  const [openMovePopoverId, setOpenMovePopoverId] = useState<string | null>(null);
  const [modal, setModal]                     = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]                       = useState(BLANK_FORM);
  const [showOwnerAltEmail, setShowOwnerAltEmail] = useState(false);
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
  const [showcaseImageSource, setShowcaseImageSource] = useState<"link" | "upload">("link");
  const [uploadImageData, setUploadImageData] = useState("");
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);
  const showcaseImageInputRef = useRef<HTMLInputElement | null>(null);
  const showcaseImagePreviewRef = useRef<HTMLImageElement | null>(null);
  const [memberInputByTrack, setMemberInputByTrack] = useState<Record<TrackDivision, string>>({
    Tech: "",
    Marketing: "",
    Finance: "",
  });
  const [memberInputErrorByTrack, setMemberInputErrorByTrack] = useState<Partial<Record<TrackDivision, string>>>({});
  const [emailModalProject, setEmailModalProject] = useState<Business | null>(null);
  const [projectTeamPickerProject, setProjectTeamPickerProject] = useState<Business | null>(null);
  const [projectEmailSubject, setProjectEmailSubject] = useState("");
  const [projectEmailMessage, setProjectEmailMessage] = useState("");
  const [projectEmailFrom, setProjectEmailFrom] = useState("info@voltanyc.org");
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
  const [projectEmailSending, setProjectEmailSending] = useState(false);
  const [projectEmailStatus, setProjectEmailStatus] = useState<string | null>(null);
  const [projectEmailRecipientOverride, setProjectEmailRecipientOverride] = useState<string[] | null>(null);
  const [projectEmailRecipientLabel, setProjectEmailRecipientLabel] = useState<string | null>(null);
  const [projectEmailAttachments, setProjectEmailAttachments] = useState<File[]>([]);
  // Tracks the neighborhood pre-filled when opening the modal from a group's + button.
  const [presetNeighborhood, setPresetNeighborhood] = useState<string | null>(null);
  const normalizedLegacyColorsRef = useRef(false);
  const normalizedLegacyTracksRef = useRef(false);

  const { ask, Dialog } = useConfirm();
  const { authRole, user, userProfile } = useAuth();
  const canEdit = authRole === "admin";
  const [deepLinkedProjectId, setDeepLinkedProjectId] = useState("");
  const handledProjectDeepLinkRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDeepLinkedProjectId((params.get("projectId") ?? "").trim());
  }, []);

  useEffect(
    () =>
      subscribeBusinesses((items) => {
        setBusinesses(
          items.map((item) => {
            const normalized = normalizeTrackProjectsFromBusiness(item);
            return {
              ...item,
              projectTracks: normalized.projectTracks,
              trackProjects: normalized.trackProjects,
              projectStatus: deriveOverallStatus(normalized.trackProjects, normalized.projectTracks),
              division: derivePrimaryDivision(normalized.projectTracks),
              neighborhood: (item.neighborhood ?? item.showcaseNeighborhood ?? "").trim(),
              teamMembers: TRACK_ORDER.flatMap((track) => normalized.trackProjects[track]?.teamMembers ?? []),
              notes: normalized.trackProjects[normalized.projectTracks[0]]?.notes ?? "",
            };
          })
        );
      }),
    []
  );
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);
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

  useEffect(() => {
    if (normalizedLegacyTracksRef.current) return;
    if (!canEdit || businesses.length === 0) return;
    normalizedLegacyTracksRef.current = true;

    void (async () => {
      for (const business of businesses) {
        const normalized = normalizeTrackProjectsFromBusiness(business);
        const hasLegacyShape = !Array.isArray(business.projectTracks) || !business.trackProjects;
        const existingTracks = (Array.isArray(business.projectTracks) ? business.projectTracks : []).join("|");
        const normalizedTracks = normalized.projectTracks.join("|");
        const shouldWrite = hasLegacyShape || existingTracks !== normalizedTracks;
        if (!shouldWrite) continue;

        const primaryTrack = normalized.projectTracks[0] ?? "Tech";
        // Legacy migration: any existing assignment is normalized into Tech unless already explicit.
        const techMembers = (business.teamMembers ?? []).map((name) => String(name ?? "").trim()).filter(Boolean);
        const nextTrackProjects: TrackProjectMap = {
          ...normalized.trackProjects,
          ...(techMembers.length > 0 ? {
            Tech: {
              projectStatus: normalized.trackProjects.Tech?.projectStatus ?? normalizeProjectStatus(business.projectStatus),
              teamMembers: techMembers,
              deadlines: normalized.trackProjects.Tech?.deadlines ?? [...TRACK_DEADLINE_DEFAULT],
              notes: normalized.trackProjects.Tech?.notes ?? String(business.notes ?? "").trim(),
            },
          } : {}),
        };
        const nextTracks = Array.from(new Set([
          ...(normalized.projectTracks.length > 0 ? normalized.projectTracks : [primaryTrack]),
          ...(techMembers.length > 0 ? ["Tech"] as TrackDivision[] : []),
        ]));
        const overallStatus = deriveOverallStatus(nextTrackProjects, nextTracks);
        const primaryDivision = derivePrimaryDivision(nextTracks);
        const flattenedTeamMembers = TRACK_ORDER.flatMap((track) => nextTrackProjects[track]?.teamMembers ?? []);

        // eslint-disable-next-line no-await-in-loop
        await updateBusiness(business.id, {
          projectTracks: nextTracks,
          trackProjects: nextTrackProjects,
          projectStatus: overallStatus,
          division: primaryDivision,
          teamMembers: flattenedTeamMembers,
          notes: nextTrackProjects[primaryDivision]?.notes ?? "",
        });
      }
    })();
  }, [businesses, canEdit]);

  // One-time migration: strip borough suffix ("Park Slope, Brooklyn" → "Park Slope").
  const trimmedNeighborhoodRef = useRef(false);
  useEffect(() => {
    if (trimmedNeighborhoodRef.current) return;
    if (!canEdit || businesses.length === 0) return;
    trimmedNeighborhoodRef.current = true;
    void (async () => {
      for (const business of businesses) {
        const raw = String(business.neighborhood ?? "").trim();
        const commaIdx = raw.indexOf(",");
        if (commaIdx < 0) continue; // no borough suffix, skip
        const trimmed = raw.slice(0, commaIdx).trim();
        if (trimmed === raw || !trimmed) continue;
        // eslint-disable-next-line no-await-in-loop
        await updateBusiness(business.id, { neighborhood: trimmed, showcaseNeighborhood: trimmed });
      }
    })();
  }, [businesses, canEdit]);

  // Sorted, deduplicated list of neighborhoods from existing businesses.
  const neighborhoodOptions = useMemo(
    () =>
      Array.from(
        new Set(
          businesses
            .map((b) => String(b.neighborhood ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [businesses]
  );

  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const normalizedFormTrackProjects = (): TrackProjectMap => {
    const out: TrackProjectMap = {};
    for (const track of TRACK_ORDER) {
      const info = normalizeTrackProjectInfo(form.trackProjects?.[track]);
      if (info) out[track] = info;
    }
    return out;
  };

  // Pass `neighborhood` to pre-fill the field (e.g. when clicking + on a group header).
  const openCreate = (neighborhood?: string) => {
    setForm({ ...BLANK_FORM, ...(neighborhood !== undefined ? { neighborhood } : {}) });
    setPresetNeighborhood(neighborhood ?? null);
    setEditingBusiness(null);
    setShowOwnerAltEmail(false);
    setShowAlternatePhone(false);
    setShowcaseImageSource("link");
    setUploadImageData("");
    setCropRect(null);
    setCropDragStart(null);
    setMemberInputByTrack({ Tech: "", Marketing: "", Finance: "" });
    setMemberInputErrorByTrack({});
    setModal("create");
  };

  const openEdit = (b: Business) => {
    const normalized = normalizeTrackProjectsFromBusiness(b);
    const primaryDivision = derivePrimaryDivision(normalized.projectTracks);
    const overallStatus = deriveOverallStatus(normalized.trackProjects, normalized.projectTracks);
    setForm({
      name: b.name,
      ownerName: b.ownerName,
      ownerEmail: b.ownerEmail,
      ownerAlternateEmail: b.ownerAlternateEmail ?? "",
      phone: b.phone, alternatePhone: b.alternatePhone ?? "", address: b.address, website: b.website,
      neighborhood: b.neighborhood ?? b.showcaseNeighborhood ?? "",
      firstContactDate: b.firstContactDate ?? "",
      projectStatus: overallStatus,
      teamLead: b.teamLead ?? "",
      notes: normalized.trackProjects[primaryDivision]?.notes ?? "",
      division: primaryDivision,
      teamMembers: TRACK_ORDER.flatMap((track) => normalized.trackProjects[track]?.teamMembers ?? []),
      projectTracks: normalized.projectTracks,
      trackProjects: normalized.trackProjects,
      showcaseEnabled: !!b.showcaseEnabled,
      showcaseFeaturedOnHome: b.showcaseFeaturedOnHome ?? false,
      showcaseType: DIVISION_PUBLIC_LABEL[primaryDivision] ?? "Digital & Tech",
      showcaseNeighborhood: b.neighborhood ?? b.showcaseNeighborhood ?? "",
      showcaseServices: (b.showcaseServices && b.showcaseServices.length > 0) ? [b.showcaseServices[0]] : [],
      showcaseDescription: b.showcaseDescription ?? "",
      showcaseUrl: b.showcaseUrl ?? "",
      showcaseImageUrl: b.showcaseImageUrl ?? "",
      showcaseImageData: b.showcaseImageData ?? "",
      showcaseColor: normalizeColorToken((b.showcaseColor as string) ?? ""),
    });
    setEditingBusiness(b);
    setPresetNeighborhood(null);
    setShowOwnerAltEmail(!!(b.ownerAlternateEmail ?? "").trim());
    setShowAlternatePhone(!!(b.alternatePhone ?? "").trim());
    const savedImageData = (b.showcaseImageData ?? "").trim();
    setShowcaseImageSource(savedImageData ? "upload" : "link");
    setUploadImageData(savedImageData);
    setCropRect(null);
    setCropDragStart(null);
    setMemberInputByTrack({ Tech: "", Marketing: "", Finance: "" });
    setMemberInputErrorByTrack({});
    setModal("edit");
  };

  useEffect(() => {
    if (!canEdit) return;
    if (!deepLinkedProjectId) return;
    if (handledProjectDeepLinkRef.current === deepLinkedProjectId) return;
    const target = businesses.find((business) => business.id === deepLinkedProjectId);
    if (!target) return;
    handledProjectDeepLinkRef.current = deepLinkedProjectId;
    openEdit(target);
  }, [businesses, canEdit, deepLinkedProjectId]);

  const addTeamMember = (track: TrackDivision, raw: string) => {
    const resolvedName = resolveTeamMemberFromInput(raw);
    if (!resolvedName) {
      setMemberInputErrorByTrack((prev) => ({ ...prev, [track]: "Choose a member from the directory list." }));
      return;
    }
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track]?.teamMembers ?? [];
    if (current.includes(resolvedName)) {
      setMemberInputErrorByTrack((prev) => ({ ...prev, [track]: "" }));
      setMemberInputByTrack((prev) => ({ ...prev, [track]: "" }));
      return;
    }
    const nextTrackProjects: TrackProjectMap = {
      ...formTrackProjects,
      [track]: {
        projectStatus: formTrackProjects[track]?.projectStatus ?? "Upcoming",
        notes: formTrackProjects[track]?.notes ?? "",
        deadlines: formTrackProjects[track]?.deadlines ?? [...TRACK_DEADLINE_DEFAULT],
        teamMembers: [...current, resolvedName],
      },
    };
    setField("trackProjects", nextTrackProjects);
    setMemberInputErrorByTrack((prev) => ({ ...prev, [track]: "" }));
    setMemberInputByTrack((prev) => ({ ...prev, [track]: "" }));
  };

  const removeTeamMember = (track: TrackDivision, name: string) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track]?.teamMembers ?? [];
    const nextTrackProjects: TrackProjectMap = {
      ...formTrackProjects,
      [track]: {
        projectStatus: formTrackProjects[track]?.projectStatus ?? "Upcoming",
        notes: formTrackProjects[track]?.notes ?? "",
        deadlines: formTrackProjects[track]?.deadlines ?? [...TRACK_DEADLINE_DEFAULT],
        teamMembers: current.filter((member) => member !== name),
      },
    };
    setField("trackProjects", nextTrackProjects);
  };

  const geocodeProjectLocation = async (input: {
    address: string;
    zipCode: string;
    borough: string;
  }): Promise<{ lat: number; lng: number } | null> => {
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/members/bids/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json() as { lat?: number; lng?: number };
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  };

  const resetImageCrop = () => {
    setCropRect(null);
    setCropDragStart(null);
  };

  const handleShowcaseImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    });
    setShowcaseImageSource("upload");
    setUploadImageData(dataUrl);
    setField("showcaseImageData", dataUrl);
    setField("showcaseImageUrl", "");
    resetImageCrop();
  };

  const onShowcaseDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleShowcaseImageFile(file);
  };

  const getRelativePoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const img = showcaseImagePreviewRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));
    return { x, y };
  };

  const onCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!uploadImageData) return;
    const point = getRelativePoint(event);
    if (!point) return;
    setCropDragStart(point);
    setCropRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const onCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDragStart) return;
    const point = getRelativePoint(event);
    if (!point) return;
    const x = Math.min(cropDragStart.x, point.x);
    const y = Math.min(cropDragStart.y, point.y);
    const width = Math.abs(point.x - cropDragStart.x);
    const height = Math.abs(point.y - cropDragStart.y);
    setCropRect({ x, y, width, height });
  };

  const onCropPointerUp = () => {
    setCropDragStart(null);
  };

  const applyCropToShowcaseImage = () => {
    const img = showcaseImagePreviewRef.current;
    if (!img || !uploadImageData) return;
    if (!cropRect || cropRect.width < 4 || cropRect.height < 4) {
      setField("showcaseImageData", uploadImageData);
      return;
    }

    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    if (displayWidth <= 0 || displayHeight <= 0 || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    const sx = (cropRect.x / displayWidth) * img.naturalWidth;
    const sy = (cropRect.y / displayHeight) * img.naturalHeight;
    const sw = (cropRect.width / displayWidth) * img.naturalWidth;
    const sh = (cropRect.height / displayHeight) * img.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      img,
      Math.max(0, sx),
      Math.max(0, sy),
      Math.max(1, sw),
      Math.max(1, sh),
      0,
      0,
      canvas.width,
      canvas.height,
    );
    // Preserve source format when possible so cropped images keep full quality.
    const sourceMime = uploadImageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)?.[1] ?? "image/png";
    const outputMime = sourceMime === "image/png" || sourceMime === "image/webp" || sourceMime === "image/jpeg" || sourceMime === "image/jpg"
      ? sourceMime.replace("image/jpg", "image/jpeg")
      : "image/png";
    const cropped = outputMime === "image/png"
      ? canvas.toDataURL(outputMime)
      : canvas.toDataURL(outputMime, 1.0);
    setField("showcaseImageData", cropped);
    setUploadImageData(cropped);
    setField("showcaseImageUrl", "");
    resetImageCrop();
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    if (!form.name.trim()) return;
    const selectedTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : [])
      .map((track) => normalizeDivision(track))
      .filter((track, index, arr) => arr.indexOf(track) === index);

    const nextTrackProjects: TrackProjectMap = {};
    for (const track of selectedTracks) {
      const info = normalizeTrackProjectInfo(form.trackProjects?.[track]);
      nextTrackProjects[track] = info ?? {
        projectStatus: "Upcoming",
        teamMembers: [],
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: "",
      };
    }
    const overallStatus = deriveOverallStatus(nextTrackProjects, selectedTracks);
    const primaryDivision = derivePrimaryDivision(selectedTracks);
    const flattenedTeamMembers = TRACK_ORDER.flatMap((track) => nextTrackProjects[track]?.teamMembers ?? []);
    const primaryNotes = nextTrackProjects[primaryDivision]?.notes ?? "";

    const showcaseEnabled = !!form.showcaseEnabled;
    const showcaseColor = showcaseEnabled
      ? normalizeColorToken((form.showcaseColor as string) ?? "")
      : randomShowcaseColor();
    const showcaseService = (form.showcaseServices ?? [])[0]?.trim() ?? "";
    const showcaseServices = showcaseService ? [showcaseService] : [];
    const showcaseImageData = showcaseImageSource === "upload"
      ? (form.showcaseImageData ?? "").trim()
      : "";
    const neighborhood = (form.neighborhood ?? "").trim();
    const geocodeAddress = (form.address ?? "").trim() || neighborhood;
    const geocoded = geocodeAddress
      ? await geocodeProjectLocation({ address: geocodeAddress, zipCode: "", borough: "" })
      : null;
    const payload: Partial<Business> = {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      ownerEmail: form.ownerEmail.trim(),
      ownerAlternateEmail: (form.ownerAlternateEmail ?? "").trim(),
      phone: form.phone.trim(),
      alternatePhone: (form.alternatePhone ?? "").trim(),
      address: form.address.trim(),
      neighborhood,
      website: form.website.trim(),
      projectStatus: overallStatus,
      teamMembers: flattenedTeamMembers,
      division: primaryDivision,
      notes: primaryNotes,
      projectTracks: selectedTracks,
      trackProjects: nextTrackProjects,
      showcaseEnabled,
      showcaseColor,
      ...(geocoded ? { lat: geocoded.lat, lng: geocoded.lng } : {}),
      ...(!geocodeAddress ? { lat: null as unknown as number, lng: null as unknown as number } : {}),
    };

    if (showcaseEnabled) {
      payload.showcaseFeaturedOnHome = !!form.showcaseFeaturedOnHome;
      payload.showcaseType = DIVISION_PUBLIC_LABEL[primaryDivision] ?? "Digital & Tech";
      payload.showcaseNeighborhood = neighborhood;
      payload.showcaseServices = showcaseServices;
      payload.showcaseDescription = (form.showcaseDescription ?? "").trim();
      payload.showcaseUrl = (form.showcaseUrl ?? "").trim();
      payload.showcaseImageUrl = (form.showcaseImageUrl ?? "").trim();
      payload.showcaseImageData = showcaseImageData;
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
        firstContactDate: null as unknown as string,
        teamLead: null as unknown as string,
        showcaseName: null as unknown as string,
        showcaseType: showcaseEnabled ? payload.showcaseType : (null as unknown as string),
        showcaseNeighborhood: showcaseEnabled ? payload.showcaseNeighborhood : (null as unknown as string),
        showcaseServices: showcaseEnabled ? payload.showcaseServices : (null as unknown as string[]),
        showcaseStatus: null as unknown as Business["showcaseStatus"],
        showcaseDescription: showcaseEnabled ? payload.showcaseDescription : (null as unknown as string),
        showcaseUrl: showcaseEnabled ? payload.showcaseUrl : (null as unknown as string),
        showcaseImageUrl: showcaseEnabled ? payload.showcaseImageUrl : (null as unknown as string),
        showcaseImageData: showcaseEnabled ? payload.showcaseImageData : (null as unknown as string),
      });
    } else {
      await createBusiness({
        ...payload,
        sortIndex: nextSortIndex(businesses),
      } as Omit<Business, "id" | "createdAt" | "updatedAt">);
    }

    // "Save & Add Another" re-opens the modal with the same neighborhood pre-filled.
    if (opts?.addAnother && !editingBusiness) {
      openCreate(neighborhood || undefined);
    } else {
      setModal(null);
    }
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

  const getNeighborhoodLabel = (project: Business): string => {
    const neighborhood = (project.neighborhood ?? project.showcaseNeighborhood ?? "").trim();
    return neighborhood;
  };

  const matchesSearch = (project: Business) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const trackAssignments = getTrackAssignments(project);
    const allTeamNames = trackAssignments.flatMap((assignment) => assignment.members);
    const allTrackNotes = trackAssignments
      .map((assignment) => String(project.trackProjects?.[assignment.track]?.notes ?? ""))
      .join(" ");
    return project.name.toLowerCase().includes(query)
      || project.ownerName.toLowerCase().includes(query)
      || project.ownerEmail.toLowerCase().includes(query)
      || allTeamNames.some((name) => name.toLowerCase().includes(query))
      || allTrackNotes.toLowerCase().includes(query)
      || (project.teamLead ?? "").toLowerCase().includes(query);
  };

  // Status sort puts Ongoing on top, then Upcoming, then Completed; tie-break by business name.
  const sortByStatusThenName = (list: Business[]) => {
    return [...list].sort((a, b) => {
      const statusDelta = PROJECT_STATUS_SORT_ORDER[normalizeProjectStatus(a.projectStatus)] - PROJECT_STATUS_SORT_ORDER[normalizeProjectStatus(b.projectStatus)];
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    });
  };

  const businessHasTrack = (business: Business, track: TrackDivision): boolean => {
    const normalized = normalizeTrackProjectsFromBusiness(business);
    return normalized.projectTracks.includes(track);
  };

  const isDiscoveryBusiness = (business: Business): boolean => {
    const normalized = normalizeTrackProjectsFromBusiness(business);
    return normalized.projectTracks.length === 0;
  };

  const tabScoped = businesses.filter((business) => {
    if (activeTab === "discovery") return isDiscoveryBusiness(business);
    return businessHasTrack(business, TAB_TRACK[activeTab]);
  });
  const filtered = sortByStatusThenName(tabScoped.filter(matchesSearch));

  const teamNameCounts = new Map<string, number>();
  team.forEach((member) => {
    const key = normalizeKey(member.name ?? "");
    if (!key) return;
    teamNameCounts.set(key, (teamNameCounts.get(key) ?? 0) + 1);
  });

  const teamMemberLookup = new Map<string, TeamMember[]>();
  team.forEach((member) => {
    const key = normalizeKey(member.name ?? "");
    if (!key) return;
    const list = teamMemberLookup.get(key) ?? [];
    list.push(member);
    teamMemberLookup.set(key, list);
  });

  const teamNameOptions = Array.from(
    new Set(
      team
        .map((member) => {
          const name = (member.name ?? "").trim();
          if (!name) return "";
          const key = normalizeKey(name);
          const count = teamNameCounts.get(key) ?? 0;
          if (count <= 1) return name;
          const suffix = (member.email ?? "").trim() || (member.school ?? "").trim() || member.id.slice(-6);
          return `${name} (${suffix})`;
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const resolveTeamMemberFromInput = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return null;

    const decoratedEmail = normalizeKey(parseEmailFromDecoratedName(value));
    if (decoratedEmail) {
      const byEmail = team.find((member) => normalizeKey(member.email ?? "") === decoratedEmail);
      if (byEmail?.name?.trim()) return byEmail.name.trim();
    }

    const baseName = stripDecoratedName(value);
    const byName = teamMemberLookup.get(normalizeKey(baseName));
    if (byName && byName.length > 0) return (byName[0].name ?? "").trim();

    return null;
  };

  const resolveActiveMemberEmail = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return null;
    const activeMembers = team.filter((member) => normalizeLoose(member.status ?? "") !== "inactive");

    const decoratedEmail = normalizeKey(parseEmailFromDecoratedName(value));
    if (decoratedEmail) {
      const byEmail = activeMembers.find((member) => normalizeKey(member.email ?? "") === decoratedEmail);
      if (byEmail?.email?.trim()) return byEmail.email.trim().toLowerCase();
    }

    const baseName = stripDecoratedName(value);
    const key = normalizeKey(baseName);
    const byName = activeMembers.find((member) => normalizeKey(member.name ?? "") === key);
    if (byName?.email?.trim()) return byName.email.trim().toLowerCase();
    return null;
  };

  const getTrackAssignments = (project: Business): Array<{ track: TrackDivision; members: string[] }> => {
    const normalized = normalizeTrackProjectsFromBusiness(project);
    return normalized.projectTracks.map((track) => {
      const members = (normalized.trackProjects[track]?.teamMembers ?? [])
        .map((value) => resolveTeamMemberFromInput(value) ?? stripDecoratedName(String(value ?? "")))
        .filter(Boolean);
      return {
        track,
        members: Array.from(new Set(members)),
      };
    });
  };

  const resolveRecipientsFromAssignedNames = (inputNames: string[]): { emails: string[]; unresolved: string[] } => {
    const unresolved: string[] = [];
    const emailSet = new Set<string>();
    const availableByEmail = new Map<string, TeamMember>();
    const availableByName = new Map<string, TeamMember[]>();

    for (const member of team) {
      if (normalizeLoose(member.status ?? "") === "inactive") continue;
      const emailKey = normalizeKey(member.email ?? "");
      if (emailKey) availableByEmail.set(emailKey, member);
      const nameKey = normalizeKey(member.name ?? "");
      if (!nameKey) continue;
      const list = availableByName.get(nameKey) ?? [];
      list.push(member);
      availableByName.set(nameKey, list);
    }

    const assigned = inputNames
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

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

  const resolveProjectRecipients = (project: Business): { emails: string[]; unresolved: string[] } => {
    const assigned = getTrackAssignments(project)
      .flatMap((assignment) => assignment.members)
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    return resolveRecipientsFromAssignedNames(assigned);
  };

  const baseProjectEmailRecipients = emailModalProject ? resolveProjectRecipients(emailModalProject) : { emails: [], unresolved: [] };
  const projectEmailRecipients = projectEmailRecipientOverride
    ? { emails: projectEmailRecipientOverride, unresolved: [] as string[] }
    : baseProjectEmailRecipients;

  const closeProjectEmailModal = () => {
    setEmailModalProject(null);
    setProjectEmailRecipientOverride(null);
    setProjectEmailRecipientLabel(null);
    setProjectEmailStatus(null);
    setProjectEmailAttachments([]);
  };

  const openProjectEmailModal = (project: Business, options?: { memberNames?: string[]; label?: string }) => {
    setEmailModalProject(project);
    const scopedNames = (options?.memberNames ?? []).map((name) => String(name ?? "").trim()).filter(Boolean);
    if (scopedNames.length > 0) {
      const resolved = resolveRecipientsFromAssignedNames(scopedNames);
      setProjectEmailRecipientOverride(resolved.emails);
      setProjectEmailRecipientLabel(options?.label ?? null);
      if (resolved.emails.length === 0) {
        setProjectEmailStatus(`No active emails found for ${options?.label ?? "selected team"}.`);
      } else {
        setProjectEmailStatus(null);
      }
    } else {
      setProjectEmailRecipientOverride(null);
      setProjectEmailRecipientLabel(null);
      setProjectEmailStatus(null);
    }
    setProjectEmailFrom("info@voltanyc.org");
    setProjectEmailSubject(`${project.name} — Project Update`);
    setProjectEmailMessage("");
    setProjectEmailAttachments([]);
  };

  const openProjectTeamEmailModal = (project: Business) => {
    const teamChoices = getTrackAssignments(project).filter((assignment) => assignment.members.length > 0);
    if (teamChoices.length > 1) {
      setProjectTeamPickerProject(project);
      return;
    }
    if (teamChoices.length === 1) {
      const choice = teamChoices[0];
      openProjectEmailModal(project, {
        memberNames: choice.members,
        label: formatTrackTeamLabel(choice.track),
      });
      return;
    }
    openProjectEmailModal(project);
  };

  const openProjectMemberEmailModal = (project: Business, memberName: string) => {
    openProjectEmailModal(project);
    const memberEmail = resolveActiveMemberEmail(memberName);
    setProjectEmailRecipientLabel(memberName);
    if (memberEmail) {
      setProjectEmailRecipientOverride([memberEmail]);
      return;
    }
    setProjectEmailRecipientOverride([]);
    setProjectEmailStatus(`No active email found for ${memberName}.`);
  };

  const projectTeamPickerOptions = projectTeamPickerProject
    ? getTrackAssignments(projectTeamPickerProject)
      .filter((assignment) => assignment.members.length > 0)
      .map((assignment) => ({
        track: assignment.track,
        label: formatTrackTeamLabel(assignment.track),
        members: assignment.members,
        recipients: resolveRecipientsFromAssignedNames(assignment.members),
      }))
    : [];

  const globalCodeMaps = useMemo(
    () => computeGlobalCodes(businesses, financeAssignments),
    [businesses, financeAssignments]
  );

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
      const formData = new FormData();
      formData.append("fromAddress", projectEmailFrom);
      formData.append("subject", projectEmailSubject.trim());
      formData.append("message", projectEmailMessage.trim());
      formData.append("contentMode", "html");
      projectEmailRecipients.emails.forEach((email) => formData.append("bccRecipients", email));
      projectEmailAttachments.forEach((f) => formData.append("attachments", f, f.name));
      const res = await fetch("/api/members/team-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { setProjectEmailStatus("Could not send email."); return; }
      const payload = await res.json() as { sent?: number; failed?: string[]; counts?: Record<string, number> };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      setProjectEmailStatus(failedCount > 0 ? `Sent to ${sentCount}. Failed: ${failedCount}.` : `Sent to ${sentCount} members.`);
    } catch {
      setProjectEmailStatus("Could not send email.");
    } finally {
      setProjectEmailSending(false);
    }
  };

  const ongoingCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Ongoing").length;
  const upcomingCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Upcoming").length;
  const completedCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Completed").length;

  // Inline status pill change for the active track (Tech/Marketing tabs); writes the new
  // status to that track and recomputes the overall projectStatus.
  const handleQuickStatusChange = async (business: Business, newStatus: ProjectStatusValue) => {
    setOpenStatusPopoverId(null);
    if (activeTab === "discovery") return;
    const track = TAB_TRACK[activeTab];
    const normalized = normalizeTrackProjectsFromBusiness(business);
    const currentInfo = normalized.trackProjects[track] ?? {
      projectStatus: "Upcoming" as ProjectStatusValue,
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const nextTrackProjects: TrackProjectMap = {
      ...normalized.trackProjects,
      [track]: { ...currentInfo, projectStatus: newStatus },
    };
    const overallStatus = deriveOverallStatus(nextTrackProjects, normalized.projectTracks);
    await updateBusiness(business.id, {
      trackProjects: nextTrackProjects,
      projectStatus: overallStatus,
    });
  };

  // Move a Discovery business onto a track. Seeds an empty track project and updates derived fields.
  const handleMoveToTrack = async (business: Business, targetTrack: TrackDivision) => {
    setOpenMovePopoverId(null);
    const normalized = normalizeTrackProjectsFromBusiness(business);
    if (normalized.projectTracks.includes(targetTrack)) return;
    const nextTracks = [...normalized.projectTracks, targetTrack];
    const nextTrackProjects: TrackProjectMap = {
      ...normalized.trackProjects,
      [targetTrack]: normalized.trackProjects[targetTrack] ?? {
        projectStatus: "Upcoming",
        teamMembers: [],
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: "",
      },
    };
    const overallStatus = deriveOverallStatus(nextTrackProjects, nextTracks);
    const primaryDivision = derivePrimaryDivision(nextTracks);
    const flattenedTeamMembers = TRACK_ORDER.flatMap((t) => nextTrackProjects[t]?.teamMembers ?? []);
    await updateBusiness(business.id, {
      projectTracks: nextTracks,
      trackProjects: nextTrackProjects,
      projectStatus: overallStatus,
      division: primaryDivision,
      teamMembers: flattenedTeamMembers,
    });
  };

  useEffect(() => {
    if (!openStatusPopoverId && !openMovePopoverId) return;
    const close = () => {
      setOpenStatusPopoverId(null);
      setOpenMovePopoverId(null);
    };
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("click", close);
    };
  }, [openStatusPopoverId, openMovePopoverId]);

  const myEmail = normalizeLoose(userProfile?.email ?? user?.email ?? "");
  const teamMatchByEmail = myEmail ? team.find((m) => normalizeLoose(m.email ?? "") === myEmail) : undefined;
  const myNameSet = new Set(
    [userProfile?.name, teamMatchByEmail?.name]
      .map((v) => normalizeLoose(v ?? ""))
      .filter(Boolean)
  );

  const isProjectMine = (project: Business) => {
    if (myNameSet.size === 0) return false;
    return getTrackAssignments(project)
      .flatMap((assignment) => assignment.members)
      .some((member) => myNameSet.has(normalizeLoose(member)));
  };

  const isNonAdminMember = authRole !== "admin";
  const isMemberRestricted = authRole === "member";
  const myProjects = isNonAdminMember ? filtered.filter(isProjectMine) : [];
  const otherProjects = isNonAdminMember ? filtered.filter((p) => !isProjectMine(p)) : filtered;

  const copyText = async (value: string) => {
    const safe = value.trim();
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
    } catch {
      // no-op
    }
  };

  const codeColorClass = (track: TrackDivision) => {
    switch (track) {
      case "Tech": return "bg-blue-500/10 border-blue-400/25 text-blue-300";
      case "Marketing": return "bg-lime-500/10 border-lime-400/25 text-lime-300";
      case "Finance": return "bg-amber-500/10 border-amber-400/25 text-amber-300";
    }
  };

  // Renders a row for the Tech or Marketing tab. Status pill is clickable; members and deadlines
  // are scoped to the current track so each tab shows that track's timeline only.
  const renderTrackRow = (b: Business, track: TrackDivision) => {
    const normalized = normalizeTrackProjectsFromBusiness(b);
    const trackInfo = normalized.trackProjects[track];
    const trackStatus: ProjectStatusValue = trackInfo?.projectStatus ?? normalizeProjectStatus(b.projectStatus);
    const members = (trackInfo?.teamMembers ?? [])
      .map((value) => resolveTeamMemberFromInput(value) ?? stripDecoratedName(String(value ?? "")))
      .filter(Boolean);
    const dedupedMembers = Array.from(new Set(members));
    const deadlines = sortDeadlinesMostRecentFirst(trackInfo?.deadlines ?? [])
      .filter((entry) => String(entry.date ?? "").trim());
    const code = globalCodeMaps.businessTrackCode.get(`${b.id}-${track}`)
      ?? globalCodeMaps.businessTrackCode.get(b.id);
    const neighborhood = getNeighborhoodLabel(b);

    return (
      <tr id={`project-${b.id}`} key={b.id} className="border-b border-white/8 hover:bg-white/[0.03] align-top">
        <td className="px-2 py-2 text-[11px] text-white/90 align-top">
          <div className="flex items-start gap-1.5 min-w-0">
            {code && (
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold font-mono flex-shrink-0 ${codeColorClass(track)}`}
                title={TRACK_META[track].label}
              >
                {code}
              </span>
            )}
            <span className="font-medium leading-snug break-words">
              {b.name}
              {b.intakeSource === "website_form" && <span className="text-amber-300 ml-1">★</span>}
              {b.showcaseEnabled && <span className="text-blue-300 ml-1">◆</span>}
            </span>
          </div>
        </td>
        <td className="px-2 py-2 text-[11px] text-white/65 break-words align-top">
          {neighborhood || <span className="text-white/30">—</span>}
        </td>
        <td className="px-2 py-2 text-[11px] text-white/80 break-words align-top">
          {b.ownerName || <span className="text-white/30">—</span>}
        </td>
        <td className="px-2 py-2 text-[11px] align-top">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.ownerEmail ? (
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="text-[#85CC17]/80 break-all" title={b.ownerEmail}>{b.ownerEmail}</span>
              <button
                type="button"
                className="members-copy-btn flex-shrink-0"
                onClick={() => void copyText(b.ownerEmail)}
                title="Copy primary email"
                aria-label="Copy primary email"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>
        <td className="px-2 py-2 align-top">
          {canEdit ? (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenStatusPopoverId(openStatusPopoverId === b.id ? null : b.id);
                }}
                className="cursor-pointer"
                title="Click to change status"
              >
                <Badge label={trackStatus} />
              </button>
              {openStatusPopoverId === b.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1 z-50 bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[130px]"
                >
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void handleQuickStatusChange(b, status)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors ${
                        trackStatus === status ? "text-[#85CC17]" : "text-white/70"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Badge label={trackStatus} />
          )}
        </td>
        <td className="px-2 py-2 text-[11px] text-white/80 align-top">
          {dedupedMembers.length === 0 ? (
            <span className="text-white/30">—</span>
          ) : (
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {dedupedMembers.map((memberName, idx) => (
                <span key={`${b.id}-${track}-${memberName}-${idx}`}>
                  {idx > 0 && <span className="text-white/40">,&nbsp;</span>}
                  {canEdit ? (
                    <button
                      type="button"
                      className="text-[#85CC17]/85 hover:text-[#9BE22B] underline-offset-2 hover:underline"
                      onClick={() => openProjectMemberEmailModal(b, memberName)}
                      title={`Email ${memberName}`}
                    >
                      {memberName}
                    </button>
                  ) : (
                    <span>{memberName}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className="px-2 py-2 text-[11px] text-white/75 align-top">
          {deadlines.length === 0 ? (
            <span className="text-white/30">—</span>
          ) : (
            <div className="space-y-0.5">
              {deadlines.slice(0, 2).map((entry, idx) => (
                <div key={`${b.id}-deadline-${idx}`} className="leading-snug">
                  <span className="text-white/50">{entry.label || "Deadline"}:</span>{" "}
                  <span className="text-white/85">{entry.date}</span>
                </div>
              ))}
              {deadlines.length > 2 && (
                <div className="text-white/40">+{deadlines.length - 2} more</div>
              )}
            </div>
          )}
        </td>
        <td className="px-2 py-2 align-top">
          {canEdit && (
            <div className="flex flex-wrap gap-1.5">
              <Btn
                size="sm"
                variant="secondary"
                onClick={() => openProjectTeamEmailModal(b)}
                disabled={resolveProjectRecipients(b).emails.length === 0}
              >
                Email
              </Btn>
              <Btn size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Btn>
            </div>
          )}
        </td>
      </tr>
    );
  };

  // Renders a row for the Discovery tab. Highlights website-form intake and adds a quick
  // "Move to..." action so an admin can promote the entry into Tech/Marketing/Finance without
  // opening the full edit modal.
  const renderDiscoveryRow = (b: Business) => {
    const neighborhood = getNeighborhoodLabel(b);
    const fromWebsite = b.intakeSource === "website_form";
    return (
      <tr id={`project-${b.id}`} key={b.id} className="border-b border-white/8 hover:bg-white/[0.03] align-top">
        <td className="px-2 py-2 text-[11px] text-white/90 align-top">
          <span className="font-medium leading-snug break-words">
            {b.name}
            {fromWebsite && <span className="text-amber-300 ml-1" title="Submitted via website business interest form">★</span>}
            {b.showcaseEnabled && <span className="text-blue-300 ml-1">◆</span>}
          </span>
        </td>
        <td className="px-2 py-2 text-[11px] text-white/65 break-words align-top">
          {neighborhood || <span className="text-white/30">—</span>}
        </td>
        <td className="px-2 py-2 text-[11px] text-white/80 break-words align-top">
          {b.ownerName || <span className="text-white/30">—</span>}
        </td>
        <td className="px-2 py-2 text-[11px] align-top">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.ownerEmail ? (
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="text-[#85CC17]/80 break-all" title={b.ownerEmail}>{b.ownerEmail}</span>
              <button
                type="button"
                className="members-copy-btn flex-shrink-0"
                onClick={() => void copyText(b.ownerEmail)}
                title="Copy primary email"
                aria-label="Copy primary email"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>
        <td className="px-2 py-2 text-[11px] text-white/75 align-top">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.phone ? (
            <span className="break-all">{b.phone}</span>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>
        <td className="px-2 py-2 text-[11px] align-top">
          {fromWebsite ? (
            <span className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              Website form
            </span>
          ) : (
            <span className="text-white/30">Manual</span>
          )}
        </td>
        <td className="px-2 py-2 align-top">
          {canEdit && (
            <div className="flex flex-wrap gap-1.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMovePopoverId(openMovePopoverId === b.id ? null : b.id);
                  }}
                  className="rounded-md border border-white/15 hover:border-[#85CC17]/45 bg-[#11141A] hover:bg-[#85CC17]/10 px-2 py-1 text-[11px] text-white/80 hover:text-white transition-colors"
                >
                  Move to…
                </button>
                {openMovePopoverId === b.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 z-50 bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[140px]"
                  >
                    {TRACK_ORDER.map((track) => (
                      <button
                        key={`move-${b.id}-${track}`}
                        type="button"
                        onClick={() => void handleMoveToTrack(b, track)}
                        className="w-full text-left px-3 py-2 text-xs text-white/75 hover:bg-white/8 transition-colors flex items-center gap-2"
                      >
                        <span className={`inline-block h-2 w-2 rounded-full ${TRACK_META[track].dotClass}`} />
                        {TRACK_META[track].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Btn size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Btn>
            </div>
          )}
        </td>
      </tr>
    );
  };

  const toggleTrackSelection = (track: TrackDivision) => {
    const currentTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []).map((item) => normalizeDivision(item));
    const formTrackProjects = normalizedFormTrackProjects();
    const hasTrack = currentTracks.includes(track);

    if (hasTrack) {
      const nextTracks = currentTracks.filter((item) => item !== track);
      const nextTrackProjects = { ...formTrackProjects };
      delete nextTrackProjects[track];
      setField("projectTracks", nextTracks);
      setField("trackProjects", nextTrackProjects);
      setMemberInputByTrack((prev) => ({ ...prev, [track]: "" }));
      setMemberInputErrorByTrack((prev) => ({ ...prev, [track]: "" }));
      return;
    }

    const nextTracks = [...currentTracks, track];
    const nextTrackProjects: TrackProjectMap = {
      ...formTrackProjects,
      [track]: formTrackProjects[track] ?? {
        projectStatus: "Upcoming",
        teamMembers: [],
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: "",
      },
    };
    setField("projectTracks", nextTracks);
    setField("trackProjects", nextTrackProjects);
  };

  const setTrackField = (track: TrackDivision, key: keyof TrackProjectInfo, value: string | string[] | DeadlineItem[]) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const nextTrackProjects: TrackProjectMap = {
      ...formTrackProjects,
      [track]: {
        ...current,
        [key]: value,
      },
    };
    setField("trackProjects", nextTrackProjects);
  };

  const setTrackDeadlineField = (track: TrackDivision, index: number, key: keyof DeadlineItem, value: string) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const currentDeadlines = current.deadlines?.length ? [...current.deadlines] : [...TRACK_DEADLINE_DEFAULT];
    if (!currentDeadlines[index]) return;
    currentDeadlines[index] = { ...currentDeadlines[index], [key]: value };
    setTrackField(track, "deadlines", sortDeadlinesMostRecentFirst(currentDeadlines));
  };

  const addTrackDeadline = (track: TrackDivision) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const deadlines = current.deadlines?.length ? [...current.deadlines] : [...TRACK_DEADLINE_DEFAULT];
    const maxOrdinal = deadlines
      .map((entry) => parseOrdinalDeadlineNumber(entry.label))
      .reduce<number>((best, value) => (typeof value === "number" && value > best ? value : best), 0);
    deadlines.push({ label: getOrdinalDeadlineLabel(maxOrdinal + 1), date: "" });
    setTrackField(track, "deadlines", sortDeadlinesMostRecentFirst(deadlines));
  };

  const removeTrackDeadline = (track: TrackDivision, index: number) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const deadlines = current.deadlines?.length ? [...current.deadlines] : [...TRACK_DEADLINE_DEFAULT];
    const next = deadlines.filter((_, itemIndex) => itemIndex !== index);
    setTrackField(
      track,
      "deadlines",
      next.length > 0 ? sortDeadlinesMostRecentFirst(next) : [...TRACK_DEADLINE_DEFAULT]
    );
  };

  const renderTrackProjectSection = (track: TrackDivision) => {
    const info = normalizedFormTrackProjects()[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
      deadlines: [...TRACK_DEADLINE_DEFAULT],
      notes: "",
    };
    const memberInput = memberInputByTrack[track] ?? "";
    const memberInputError = memberInputErrorByTrack[track] ?? "";
    return (
      <div key={`track-section-${track}`} className="lg:col-span-2 rounded-xl border border-white/10 bg-[#0F1014] p-3.5">
        <p className="text-white/85 text-sm font-semibold mb-3">{TRACK_META[track].label} Project Info</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Field label="Status" required>
            <Select
              options={STATUSES}
              emptyLabel="-"
              value={info.projectStatus}
              onChange={(e) => setTrackField(track, "projectStatus", normalizeProjectStatus(e.target.value))}
            />
          </Field>
          <div />
          <div className="lg:col-span-2">
            <Field label="Assigned Members">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <AutocompleteInput
                    value={memberInput}
                    onChange={(value) => setMemberInputByTrack((prev) => ({ ...prev, [track]: value }))}
                    options={teamNameOptions}
                    placeholder={`Add a ${TRACK_META[track].label} team member`}
                  />
                  <Btn size="sm" variant="secondary" onClick={() => addTeamMember(track, memberInput)}>Add</Btn>
                </div>
                {memberInputError && <p className="text-[11px] text-red-300">{memberInputError}</p>}
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(info.teamMembers ?? []).length === 0 ? (
                    <p className="text-xs text-white/35">No members assigned yet.</p>
                  ) : (
                    (info.teamMembers ?? []).map((member) => (
                      <div key={`${track}-${member}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#11141A] px-3 py-2">
                        <span className="text-sm text-white/80">{member}</span>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(track, member)}
                          className="members-icon-btn members-icon-btn-danger h-7 w-7"
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
          <div className="lg:col-span-2">
            <Field label="Deadlines">
              <div className="space-y-2">
                {(info.deadlines ?? TRACK_DEADLINE_DEFAULT).map((deadline, index) => (
                  <div key={`${track}-deadline-${index}`} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_170px_auto] gap-2 items-center">
                    <Input
                      value={deadline.label}
                      onChange={(e) => setTrackDeadlineField(track, index, "label", e.target.value)}
                      placeholder={index === 0 ? "Final Deadline" : getOrdinalDeadlineLabel(index)}
                    />
                    <Input
                      type="date"
                      value={deadline.date}
                      onChange={(e) => setTrackDeadlineField(track, index, "date", e.target.value)}
                    />
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => removeTrackDeadline(track, index)}
                      disabled={(info.deadlines ?? TRACK_DEADLINE_DEFAULT).length <= 1}
                    >
                      Remove
                    </Btn>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Btn size="sm" variant="secondary" onClick={() => addTrackDeadline(track)}>+ Add Deadline</Btn>
                </div>
              </div>
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Field label="Notes">
              <TextArea rows={3} value={info.notes} onChange={(e) => setTrackField(track, "notes", e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={PROJECT_GROUP_TABS} />

      <PageHeader
        title={TAB_TITLE[activeTab]}
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Btn variant="primary" onClick={() => openCreate()}>+ New Project</Btn>
            </div>
          ) : undefined
        }
      />
      <p className="text-xs text-white/45 mb-4">
        <span className="text-amber-300 font-semibold">★</span> Submitted via website business interest form.
        <span className="mx-2">·</span>
        <span className="text-blue-300 font-semibold">◆</span> Visible on public home/showcase.
        {activeTab !== "discovery" && (
          <>
            <span className="mx-2">·</span>
            <span className="inline-flex items-center gap-1 align-middle">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${TRACK_META[TAB_TRACK[activeTab]].dotClass}`} />
            </span>{" "}
            {TRACK_META[TAB_TRACK[activeTab]].label} track.
          </>
        )}
      </p>

      {activeTab !== "discovery" && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Ongoing" value={ongoingCount} color="text-green-400" />
          <StatCard label="Upcoming" value={upcomingCount} color="text-blue-400" />
          <StatCard label="Completed" value={completedCount} color="text-violet-400" />
        </div>
      )}

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={isMemberRestricted ? "Search business names…" : "Search businesses, owners, leads…"}
        />
      </div>

      {activeTab === "discovery" ? (
        <div className="rounded-xl border border-white/8 bg-[#13161D] mb-6 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Business Name</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Neighborhood</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Owner</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[20%]">Primary Email</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Phone</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Source</th>
                <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[16%]">Actions</th>
              </tr>
            </thead>
            <tbody>{filtered.map(renderDiscoveryRow)}</tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-6">
              <Empty
                message="No discovery entries. New website-form submissions and any unassigned businesses will land here."
                action={canEdit ? <Btn variant="primary" onClick={() => openCreate()}>Add first project</Btn> : undefined}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {isNonAdminMember && myProjects.length > 0 && (
            <div className="mb-4">
              <h2 className="text-white/75 text-sm font-semibold uppercase tracking-wider mb-2">My Projects</h2>
              <div className="rounded-xl border border-white/8 bg-[#13161D] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#0F1014] border-b border-white/8">
                    <tr>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Business Name</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Neighborhood</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Owner</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Primary Email</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Status</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Members</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Deadlines</th>
                      <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{myProjects.map((b) => renderTrackRow(b, TAB_TRACK[activeTab]))}</tbody>
                </table>
              </div>
            </div>
          )}

          {isNonAdminMember && myProjects.length > 0 && (
            <h2 className="text-white/65 text-sm font-semibold uppercase tracking-wider mb-2">Other Projects</h2>
          )}

          <div className="rounded-xl border border-white/8 bg-[#13161D] mb-6 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Business Name</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Neighborhood</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Owner</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Primary Email</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Status</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Members</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[10%]">Deadlines</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[8%]">Actions</th>
                </tr>
              </thead>
              <tbody>{otherProjects.map((b) => renderTrackRow(b, TAB_TRACK[activeTab]))}</tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-6">
                <Empty
                  message={`No ${TAB_TITLE[activeTab].toLowerCase()} found.`}
                  action={canEdit ? <Btn variant="primary" onClick={() => openCreate()}>Add first project</Btn> : undefined}
                />
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!projectTeamPickerProject}
        onClose={() => setProjectTeamPickerProject(null)}
        title={`Choose Team · ${projectTeamPickerProject?.name ?? ""}`}
      >
        <div className="space-y-2">
          {projectTeamPickerOptions.length === 0 ? (
            <p className="text-sm text-white/55">No assigned teams with email recipients were found.</p>
          ) : (
            projectTeamPickerOptions.map((option) => (
              <button
                key={`team-picker-${option.track}`}
                type="button"
                className="w-full rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 text-left hover:border-[#85CC17]/45 transition-colors disabled:opacity-50"
                disabled={option.recipients.emails.length === 0}
                onClick={() => {
                  if (!projectTeamPickerProject) return;
                  setProjectTeamPickerProject(null);
                  openProjectEmailModal(projectTeamPickerProject, {
                    memberNames: option.members,
                    label: option.label,
                  });
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/90">{option.label}</span>
                  <span className="text-xs text-white/55">{option.recipients.emails.length} recipients</span>
                </div>
                <p className="text-[11px] text-white/50 mt-1 truncate" title={option.members.join(", ")}>
                  {option.members.join(", ")}
                </p>
              </button>
            ))
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setProjectTeamPickerProject(null)}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!emailModalProject}
        onClose={closeProjectEmailModal}
        title={`${projectEmailRecipientLabel ? "Email Member" : "Email Team"}${emailModalProject ? ` · ${emailModalProject.name}` : ""}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-white/55">
            {projectEmailRecipientLabel ? `${projectEmailRecipientLabel} · ` : ""}
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
          <Field label="Message" required>
            <RichTextEditor
              content={projectEmailMessage}
              onChange={setProjectEmailMessage}
              attachments={projectEmailAttachments}
              onAttachmentsChange={setProjectEmailAttachments}
              placeholder="Write your email..."
              minHeight={200}
            />
          </Field>
          {projectEmailStatus && <p className="text-xs text-white/60">{projectEmailStatus}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={closeProjectEmailModal}>Close</Btn>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[74vh] overflow-y-auto pr-2">
          {/* ── Business Info ── */}
          <div className="lg:col-span-2">
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
                  className="members-icon-btn h-8 w-8 text-base leading-none flex-shrink-0"
                  onClick={() => setShowOwnerAltEmail(true)}
                  aria-label="Add alternate email"
                  title="Add alternate email"
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="members-icon-btn members-icon-btn-danger h-8 w-8 text-base leading-none flex-shrink-0"
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
                  className="members-icon-btn h-8 w-8 text-base leading-none flex-shrink-0"
                  onClick={() => setShowAlternatePhone(true)}
                  aria-label="Add alternate phone"
                  title="Add alternate phone"
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="members-icon-btn members-icon-btn-danger h-8 w-8 text-base leading-none flex-shrink-0"
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
          <div className="lg:col-span-2">
            <Field label="Address">
              <Input value={form.address} onChange={e => setField("address", e.target.value)} />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Field label="Neighborhood">
              <AutocompleteInput
                value={form.neighborhood ?? ""}
                onChange={(v) => setField("neighborhood", v)}
                options={neighborhoodOptions}
                placeholder="Select or type a neighborhood"
                showOnEmpty
              />
              {!editingBusiness && presetNeighborhood !== null && presetNeighborhood !== "" && (
                <p className="text-[11px] text-[#85CC17]/55 mt-1">Pre-filled from &ldquo;{presetNeighborhood}&rdquo; group</p>
              )}
            </Field>
          </div>

          {/* ── Project Info ── */}
          <div className="lg:col-span-2 mt-2 pt-2 border-t border-white/8">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-1">Project Info</p>
            <p className="text-white/45 text-xs font-body">Tracks are optional. Use this section when work is assigned.</p>
          </div>
          <div className="lg:col-span-2">
            <Field label="Tracks">
              <div className="flex flex-wrap gap-2">
                {TRACK_ORDER.map((track) => {
                  const selectedTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []).map((item) => normalizeDivision(item));
                  const selected = selectedTracks.includes(track);
                  return (
                    <button
                      key={`track-toggle-${track}`}
                      type="button"
                      onClick={() => toggleTrackSelection(track)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? TRACK_META[track].chipClass
                          : "border-white/20 text-white/65 bg-[#11141A] hover:border-white/35"
                      }`}
                    >
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${TRACK_META[track].dotClass}`} />
                      {TRACK_META[track].label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
          {(Array.isArray(form.projectTracks) ? form.projectTracks : [])
            .map((track) => normalizeDivision(track))
            .filter((track, index, arr) => arr.indexOf(track) === index)
            .map((track) => renderTrackProjectSection(track))}

          {/* ── Public Showcase ── */}
          <div className="lg:col-span-2 mt-2 pt-2 border-t border-white/8">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-1">Public Showcase</p>
            <p className="text-white/45 text-xs font-body">Controls what appears on the public home/showcase cards.</p>
          </div>
          <div className="lg:col-span-2">
            <label className="inline-flex items-center gap-2.5 text-sm text-white/80 font-body rounded-lg border border-white/10 bg-[#11141A] px-3 py-2">
              <input
                type="checkbox"
                className="members-checkbox"
                checked={!!form.showcaseEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setField("showcaseEnabled", checked);
                  if (!checked) {
                    setField("showcaseFeaturedOnHome", false);
                  } else {
                    // When enabling showcase on a multi-track business, default the public-facing
                    // work to the Tech track's website so the user lands on a sensible default.
                    const tracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []).map((t) => normalizeDivision(t));
                    const hasTech = tracks.includes("Tech");
                    const currentService = (form.showcaseServices ?? [])[0]?.trim() ?? "";
                    if (hasTech && !currentService) {
                      setField("showcaseServices", ["Website"]);
                      setField("showcaseType", DIVISION_PUBLIC_LABEL.Tech);
                    }
                  }
                }}
              />
              Show this project on the public site
            </label>
            <label className={`inline-flex items-center gap-2.5 text-sm font-body mt-2 rounded-lg border px-3 py-2 ${form.showcaseEnabled ? "text-white/75 border-white/10 bg-[#11141A]" : "text-white/35 border-white/5 bg-[#11141A]/40"}`}>
              <input
                type="checkbox"
                className="members-checkbox"
                checked={!!form.showcaseFeaturedOnHome}
                onChange={(e) => setField("showcaseFeaturedOnHome", e.target.checked)}
                disabled={!form.showcaseEnabled}
              />
              Feature this card on the homepage
            </label>
          </div>

          {form.showcaseEnabled && (
            <>
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
              <div className="lg:col-span-2">
                <Field label="Image">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowcaseImageSource("link")}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          showcaseImageSource === "link"
                            ? "bg-white/10 border-white/35 text-white"
                            : "bg-[#0F1014] border-white/15 text-white/65 hover:border-white/30"
                        }`}
                      >
                        Use Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowcaseImageSource("upload")}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          showcaseImageSource === "upload"
                            ? "bg-white/10 border-white/35 text-white"
                            : "bg-[#0F1014] border-white/15 text-white/65 hover:border-white/30"
                        }`}
                      >
                        Upload + Crop
                      </button>
                    </div>

                    {showcaseImageSource === "link" ? (
                      <Input
                        value={form.showcaseImageUrl ?? ""}
                        onChange={e => {
                          setField("showcaseImageUrl", e.target.value);
                          setField("showcaseImageData", "");
                        }}
                        placeholder="https://..."
                      />
                    ) : (
                      <div className="space-y-3">
                        <div
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={onShowcaseDrop}
                          className="rounded-lg border border-dashed border-white/25 bg-[#0F1014] p-4 text-center"
                        >
                          <p className="text-xs text-white/65">Drag an image here, or</p>
                          <Btn
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            onClick={() => showcaseImageInputRef.current?.click()}
                          >
                            Choose Image
                          </Btn>
                          <input
                            ref={showcaseImageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (file) await handleShowcaseImageFile(file);
                              event.target.value = "";
                            }}
                          />
                        </div>

                        {(uploadImageData || form.showcaseImageData) && (
                          <div className="rounded-lg border border-white/15 bg-[#0F1014] p-3 space-y-2">
                            <p className="text-[11px] text-white/60">Drag across the image to crop, then click Apply Crop.</p>
                            <div
                              className="relative w-full overflow-hidden rounded-md border border-white/10"
                              onPointerDown={onCropPointerDown}
                              onPointerMove={onCropPointerMove}
                              onPointerUp={onCropPointerUp}
                              onPointerLeave={onCropPointerUp}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                ref={showcaseImagePreviewRef}
                                src={uploadImageData || form.showcaseImageData || ""}
                                alt="Showcase crop preview"
                                className="block w-full h-auto select-none"
                                draggable={false}
                              />
                              {cropRect && cropRect.width > 0 && cropRect.height > 0 && (
                                <div
                                  className="absolute border-2 border-[#85CC17] bg-[#85CC17]/20 pointer-events-none"
                                  style={{
                                    left: cropRect.x,
                                    top: cropRect.y,
                                    width: cropRect.width,
                                    height: cropRect.height,
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Btn size="sm" variant="secondary" onClick={applyCropToShowcaseImage}>Apply Crop</Btn>
                              <Btn
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setField("showcaseImageData", uploadImageData || "");
                                  resetImageCrop();
                                }}
                              >
                                Use Full Image
                              </Btn>
                              <Btn
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setUploadImageData("");
                                  setField("showcaseImageData", "");
                                  resetImageCrop();
                                }}
                              >
                                Clear
                              </Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="What we do">
                  <Select
                    options={[...SHOWCASE_SERVICE_OPTIONS]}
                    value={(form.showcaseServices?.[0] as ShowcaseServiceValue | undefined) ?? ""}
                    onChange={e => {
                      const next = e.target.value.trim();
                      setField("showcaseServices", next ? [next] : []);
                    }}
                  />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="Description">
                  <TextArea rows={3} value={form.showcaseDescription ?? ""} onChange={e => setField("showcaseDescription", e.target.value)} />
                </Field>
              </div>
              <div className="lg:col-span-2">
                <Field label="Completed Showcase">
                  <Input value={form.showcaseUrl ?? ""} onChange={e => setField("showcaseUrl", e.target.value)} placeholder="https://" />
                </Field>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between items-center gap-3 mt-5 pt-4 border-t border-white/8">
          <div>
            {editingBusiness && (
              <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
                Delete Project
              </Btn>
            )}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            {!editingBusiness && (
              <Btn
                variant="secondary"
                onClick={() => void handleSave({ addAnother: true })}
                disabled={!form.name.trim()}
                title="Save this business and immediately open a new form with the same neighborhood"
              >
                Save &amp; Add Another
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim()}>
              {editingBusiness ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
