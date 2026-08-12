"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, AutocompleteInput, SkeletonRows, useConfirm,
  ViewPanel, ViewSection,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import MasonryGrid from "@/components/MasonryGrid";
import {
  subscribeBusinesses, subscribeTeam, subscribeAssignments, subscribeAssignmentClaims,
  createBusiness, updateBusiness, hardDeleteBusiness,
  getSiteSettings,
  type Business, type TeamMember, type Assignment, type AssignmentClaim,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { TRACK_META, TRACK_ORDER, DIVISION_PUBLIC_LABEL, type TrackDivision } from "@/lib/members/constants";
import { toCsv, downloadCsv, dateStampedFilename } from "@/lib/csv";
import { formatPhone } from "@/lib/format";
import { EMAIL } from "@/lib/mail";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

type ProjectStatusValue = "Upcoming" | "Ongoing" | "Completed";

type TechStatusValue = "Upcoming" | "In Development" | "Awaiting Client" | "Awaiting Deployment" | "Completed";
type MarketingStatusValue = "Upcoming" | "In Planning" | "Awaiting Client" | "Consistent Posts";
type FinanceStatusValue = "Upcoming" | "In Progress" | "Completed";

const TECH_STATUSES: Array<{ value: TechStatusValue }> = [
  { value: "Upcoming" },
  { value: "In Development" },
  { value: "Awaiting Client" },
  { value: "Awaiting Deployment" },
  { value: "Completed" },
];

const MARKETING_STATUSES: Array<{ value: MarketingStatusValue }> = [
  { value: "Upcoming" },
  { value: "In Planning" },
  { value: "Awaiting Client" },
  { value: "Consistent Posts" },
];

const FINANCE_STATUSES: Array<{ value: FinanceStatusValue }> = [
  { value: "Upcoming" },
  { value: "In Progress" },
  { value: "Completed" },
];

type DeadlineItem = {
  label: string;
  date: string;
};
type TrackStatusValue = TechStatusValue | MarketingStatusValue | FinanceStatusValue | ProjectStatusValue;

type TrackProjectInfo = {
  projectStatus: TrackStatusValue;
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
// `value` is the token persisted in businesses.showcase_color and must not
// change — the labels and swatches describe what actually renders, which is now
// the Novus pastel palette (see SHOWCASE_COLOR_CLASS in app/page.tsx).
const SHOWCASE_COLOR_OPTIONS: Array<{ value: ShowcaseColorValue; label: string; swatch: string }> = [
  { value: "blue-soft", label: "Violet · Soft", swatch: "#DDD6FE" },
  { value: "blue-mid", label: "Violet · Mid", swatch: "#C4B5FD" },
  { value: "blue-deep", label: "Violet · Deep", swatch: "#A78BFA" },
  { value: "lime-soft", label: "Peach · Soft", swatch: "#FED7AA" },
  { value: "lime-mid", label: "Peach · Mid", swatch: "#FDBA74" },
  { value: "lime-deep", label: "Peach · Deep", swatch: "#FB923C" },
  { value: "amber-soft", label: "Amber · Soft", swatch: "#FDE68A" },
  { value: "amber-mid", label: "Amber · Mid", swatch: "#FCD34D" },
  { value: "amber-deep", label: "Amber · Deep", swatch: "#FBBF24" },
  { value: "pink-soft", label: "Fuchsia · Soft", swatch: "#F5D0FE" },
  { value: "pink-mid", label: "Fuchsia · Mid", swatch: "#F0ABFC" },
  { value: "pink-deep", label: "Fuchsia · Deep", swatch: "#E879F9" },
  { value: "purple-mid", label: "Purple · Mid", swatch: "#D8B4FE" },
  { value: "red-soft", label: "Rose · Soft", swatch: "#FECDD3" },
  { value: "red-mid", label: "Rose · Mid", swatch: "#FDA4AF" },
  { value: "red-deep", label: "Rose · Deep", swatch: "#FB7185" },
];
const SHOWCASE_COLOR_VALUES = SHOWCASE_COLOR_OPTIONS.map((option) => option.value);
const TEAM_EMAIL_FROM_OPTIONS = [
  { value: EMAIL.info, label: EMAIL.info },
  { value: EMAIL.ethan, label: EMAIL.ethan },
];

const TECH_STATUS_SORT: Record<string, number> = {
  "Upcoming": 0,
  "In Development": 1,
  "Awaiting Client": 2,
  "Awaiting Deployment": 3,
  "Completed": 4,
};

const MARKETING_STATUS_SORT: Record<string, number> = {
  "Upcoming": 0,
  "In Planning": 1,
  "Awaiting Client": 2,
  "Consistent Posts": 3,
};

function normalizeProjectStatus(value: unknown): ProjectStatusValue {
  const raw = String(value ?? "").trim();
  if (raw === "Completed" || raw === "Complete" || raw === "Done") return "Completed";
  if (raw === "Upcoming" || raw === "Not Started" || raw === "On Hold" || raw === "Discovery") return "Upcoming";
  if (raw === "Ongoing" || raw === "Active" || raw === "In Development" || raw === "Awaiting Client" ||
      raw === "Awaiting Deployment" || raw === "In Planning" || raw === "Consistent Posts" ||
      raw === "In Progress") return "Ongoing";
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

const ALL_TRACK_STATUSES = new Set<string>([
  "Upcoming", "Ongoing", "Completed",
  "In Development", "Awaiting Client", "Awaiting Deployment",
  "In Planning", "Consistent Posts",
]);

function normalizeTrackProjectInfo(value: unknown): TrackProjectInfo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const rawStatus = String(row.projectStatus ?? "").trim();
  const projectStatus: TrackStatusValue = ALL_TRACK_STATUSES.has(rawStatus)
    ? rawStatus as TrackStatusValue
    : "Upcoming";
  return {
    projectStatus,
    teamMembers: Array.isArray(row.teamMembers) ? row.teamMembers.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    deadlines: normalizeTrackDeadlines(row.deadlines),
    notes: String(row.notes ?? ""),
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
    return { projectTracks: [], trackProjects: normalizedMap };
  }

  for (const track of projectTracks) {
    if (!normalizedMap[track]) {
      normalizedMap[track] = {
        projectStatus: "Upcoming",
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
  if (statuses.every((s) => s === "Completed")) return "Completed";
  if (statuses.some((s) => s !== "Upcoming")) return "Ongoing";
  return "Upcoming";
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

function getServicesRequestedLabel(business: Pick<Business, "activeServices" | "notes" | "servicesRequested" | "showcaseServices">): string {
  if (business.servicesRequested?.trim()) return business.servicesRequested.trim();
  const notesLine = (business.notes ?? "")
    .split(/\r?\n/)
    .find((line) => /^Services requested:\s*/i.test(line.trim()));
  if (notesLine) return notesLine.replace(/^Services requested:\s*/i, "").trim();
  const activeServices = (business.activeServices ?? []).map((service) => service.trim()).filter(Boolean);
  if (activeServices.length > 0) return activeServices.join(", ");
  return (business.showcaseServices ?? []).map((service) => service.trim()).filter(Boolean).join(", ");
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

type ProjectTab = "businesses" | "discovery" | "showcase";

function normalizeProjectTabFromPath(pathname: string): ProjectTab {
  if (pathname.includes("/projects/discovery")) return "discovery";
  if (pathname.includes("/projects/showcase")) return "showcase";
  return "businesses";
}

const TAB_TITLE: Record<ProjectTab, string> = {
  businesses: "Businesses",
  discovery: "Discovery",
  showcase: "Public Showcase",
};

export default function BusinessesPage() {
  return (
    <Suspense fallback={null}>
      <BusinessesPageInner />
    </Suspense>
  );
}

function BusinessesPageInner() {
  const pathname = usePathname();
  const activeTab = normalizeProjectTabFromPath(pathname);

  const [businesses, setBusinesses]           = useState<Business[]>([]);
  const [team, setTeam]                       = useState<TeamMember[]>([]);
  const [assignments, setAssignments]         = useState<Assignment[]>([]);
  const [claims, setClaims]                   = useState<AssignmentClaim[]>([]);
  const [search, setSearch]                   = useState("");
  const [openStatusPopover, setOpenStatusPopover] = useState<{ id: string; track: TrackDivision } | null>(null);
  const [modal, setModal]                     = useState<"create" | "edit" | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm]                       = useState(BLANK_FORM);
  const [showOwnerAltEmail, setShowOwnerAltEmail] = useState(false);
  const [showAlternatePhone, setShowAlternatePhone] = useState(false);
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
  const [projectEmailFrom, setProjectEmailFrom] = useState<string>(EMAIL.info);
  const [projectEmailSending, setProjectEmailSending] = useState(false);
  const [projectEmailStatus, setProjectEmailStatus] = useState<string | null>(null);
  const [projectEmailRecipientOverride, setProjectEmailRecipientOverride] = useState<string[] | null>(null);
  const [projectEmailRecipientLabel, setProjectEmailRecipientLabel] = useState<string | null>(null);
  const [projectEmailAttachments, setProjectEmailAttachments] = useState<File[]>([]);
  // Tracks the neighborhood pre-filled when opening the modal from a group's + button.
  const [presetNeighborhood, setPresetNeighborhood] = useState<string | null>(null);
  // True when the create modal was opened from the discovery tab (sets intakeSource:"discovery").
  const [isDiscoveryCreate, setIsDiscoveryCreate] = useState(false);
  // When false (default), only Ongoing businesses are shown in the Businesses tab.
  // Fine-grained filter checkboxes for businesses tab.
  const [filterTracks, setFilterTracks] = useState<Set<string>>(new Set());
  const [filterTechStatuses, setFilterTechStatuses] = useState<Set<string>>(new Set());
  const [filterMarketingStatuses, setFilterMarketingStatuses] = useState<Set<string>>(new Set());
  const [filterNeighborhoods, setFilterNeighborhoods] = useState<Set<string>>(new Set());
  const [hideArchived, setHideArchived] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showOnlyArchived, setShowOnlyArchived] = useState(false);
  const [promoteModal, setPromoteModal] = useState<Business | null>(null);
  const [promoteModalTracks, setPromoteModalTracks] = useState<Set<TrackDivision>>(new Set());
  const [promoteModalStatuses, setPromoteModalStatuses] = useState<Partial<Record<TrackDivision, string>>>({});
  const [promoteBusy, setPromoteBusy] = useState(false);
  const normalizedLegacyColorsRef = useRef(false);
  const normalizedLegacyTracksRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showcaseServiceOptions, setShowcaseServiceOptions] = useState<string[]>(["Website", "SEO", "Social Media", "Graphic Design", "Grants"]);

  // Showcase tab state
  const [scAddOpen, setScAddOpen] = useState(false);
  const [scAddPickerId, setScAddPickerId] = useState("");
  const [scAddQuery, setScAddQuery] = useState("");
  const [scAddBusy, setScAddBusy] = useState(false);
  const [scView, setScView] = useState<"showcase" | "home">("showcase");
  const [scDragSrcId, setScDragSrcId] = useState<string | null>(null);
  const [scDragOverId, setScDragOverId] = useState<string | null>(null);

  const { ask, Dialog } = useConfirm();
  const { authRole, user, userProfile } = useAuth();
  const canEdit = authRole === "owner" || authRole === "admin";
  const [deepLinkedProjectId, setDeepLinkedProjectId] = useState("");
  const handledProjectDeepLinkRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDeepLinkedProjectId((params.get("projectId") ?? "").trim());
  }, []);

  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const businessesLoadedRef = useRef(false);
  useEffect(
    () =>
      subscribeBusinesses((items) => {
        setBusinesses(
          items.map((item) => {
            const normalized = normalizeTrackProjectsFromBusiness(item);
            const servicesRequested = getServicesRequestedLabel(item);
            return {
              ...item,
              servicesRequested,
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
        if (!businessesLoadedRef.current) {
          businessesLoadedRef.current = true;
          setBusinessesLoaded(true);
        }
      }),
    []
  );
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeAssignments(setAssignments), []);
  useEffect(() => subscribeAssignmentClaims(setClaims), []);
  useEffect(() => {
    getSiteSettings().then((s) => { if (s.services.length > 0) setShowcaseServiceOptions(s.services); });
  }, []);
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
              projectStatus: normalized.trackProjects.Tech?.projectStatus ?? "Upcoming",
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
  // Pass `forDiscovery: true` when creating from the discovery tab.
  const openCreate = (neighborhood?: string, forDiscovery = false) => {
    setForm({ ...BLANK_FORM, ...(neighborhood !== undefined ? { neighborhood } : {}) });
    setPresetNeighborhood(neighborhood ?? null);
    setIsDiscoveryCreate(forDiscovery);
    setEditingBusiness(null);
    setShowOwnerAltEmail(false);
    setShowAlternatePhone(false);
    setMemberInputByTrack({ Tech: "", Marketing: "", Finance: "" });
    setMemberInputErrorByTrack({});
    setSaveError(null);
    setModal("create");
  };

  const openEdit = async (b: Business) => {
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
      showcaseImageData: "",
      showcaseColor: normalizeColorToken((b.showcaseColor as string) ?? ""),
    });
    setEditingBusiness(b);
    setPresetNeighborhood(null);
    setShowOwnerAltEmail(!!(b.ownerAlternateEmail ?? "").trim());
    setShowAlternatePhone(!!(b.alternatePhone ?? "").trim());
    setMemberInputByTrack({ Tech: "", Marketing: "", Finance: "" });
    setMemberInputErrorByTrack({});
    setSaveError(null);
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
      const token = await getAuthToken();
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


  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaveBusy(true);
    setSaveError(null);
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
    const overallStatus = selectedTracks.length > 0
      ? deriveOverallStatus(nextTrackProjects, selectedTracks)
      : (normalizeProjectStatus(form.projectStatus) as ProjectStatusValue);
    const primaryDivision = derivePrimaryDivision(selectedTracks);
    const flattenedTeamMembers = TRACK_ORDER.flatMap((track) => nextTrackProjects[track]?.teamMembers ?? []);
    const primaryNotes = nextTrackProjects[primaryDivision]?.notes ?? "";

    const showcaseEnabled = !!form.showcaseEnabled;
    const showcaseColor = showcaseEnabled
      ? normalizeColorToken((form.showcaseColor as string) ?? "")
      : randomShowcaseColor();
    const showcaseService = (form.showcaseServices ?? [])[0]?.trim() ?? "";
    const showcaseServices = showcaseService ? [showcaseService] : [];
    const showcaseImageData = (form.showcaseImageData ?? "").trim();
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

    try {
      if (editingBusiness) {
        const wasDiscovery = editingBusiness.intakeSource === "discovery";
        const nowHasTracks = selectedTracks.length > 0;
        await updateBusiness(editingBusiness.id, {
          ...payload,
          ...(wasDiscovery && nowHasTracks ? { intakeSource: null as unknown as Business["intakeSource"] } : {}),
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
          ...(isDiscoveryCreate ? { intakeSource: "discovery" as const } : {}),
        } as Omit<Business, "id" | "createdAt" | "updatedAt">);
      }
      setModal(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaveBusy(false);
    }
  };

  const handleArchiveFromEdit = async () => {
    if (!editingBusiness) return;
    const name = editingBusiness.name || "this business";
    const isCurrentlyArchived = !!editingBusiness.archived;
    await ask(
      async () => {
        await updateBusiness(editingBusiness.id, { archived: !isCurrentlyArchived });
        setModal(null);
      },
      isCurrentlyArchived
        ? `Unarchive "${name}"? It will reappear in the main businesses list.`
        : `Archive "${name}"? It will be hidden by default but can be found with the "Show only archived" filter.`,
    );
  };

  const handleHardDeleteFromEdit = async () => {
    if (!editingBusiness) return;
    const name = editingBusiness.name || "this business";
    await ask(
      async () => {
        await hardDeleteBusiness(editingBusiness.id);
        setModal(null);
      },
      `Permanently delete "${name}"? This cannot be undone.`,
    );
  };

  const handleHardDeleteDirect = async (b: Business) => {
    await ask(
      async () => { await hardDeleteBusiness(b.id); },
      `Permanently delete "${b.name || "this entry"}"? This cannot be undone.`,
    );
  };

  const openPromoteModal = (b: Business) => {
    setPromoteModal(b);
    setPromoteModalTracks(new Set());
    setPromoteModalStatuses({});
  };

  const handlePromote = async () => {
    if (!promoteModal || promoteModalTracks.size === 0) return;
    setPromoteBusy(true);
    const tracks = [...promoteModalTracks] as TrackDivision[];
    const nextTrackProjects: TrackProjectMap = {};
    for (const track of tracks) {
      nextTrackProjects[track] = {
        projectStatus: (promoteModalStatuses[track] ?? "Upcoming") as TrackStatusValue,
        teamMembers: [],
        deadlines: [...TRACK_DEADLINE_DEFAULT],
        notes: "",
      };
    }
    const overallStatus = deriveOverallStatus(nextTrackProjects, tracks);
    const primaryDivision = derivePrimaryDivision(tracks);
    try {
      await updateBusiness(promoteModal.id, {
        projectTracks: tracks,
        trackProjects: nextTrackProjects,
        projectStatus: overallStatus,
        division: primaryDivision,
        intakeSource: null as unknown as Business["intakeSource"],
      });
      setPromoteModal(null);
    } finally {
      setPromoteBusy(false);
    }
  };

  // ── Showcase tab handlers ────────────────────────────────────────────────────

  const handleScAdd = async () => {
    const biz = businesses.find((b) => b.id === scAddPickerId);
    if (!biz) return;
    setScAddBusy(true);
    await updateBusiness(biz.id, { showcaseEnabled: true });
    setScAddBusy(false);
    setScAddOpen(false);
    setScAddPickerId("");
    // Open the business edit modal so admin can fill showcase details immediately.
    await openEdit({ ...biz, showcaseEnabled: true });
    setModal("edit");
  };

  const handleScRemove = async (biz: Business) => {
    await ask(
      async () => {
        await updateBusiness(biz.id, { showcaseEnabled: false, showcaseFeaturedOnHome: false });
      },
      `Remove "${biz.name}" from the public showcase? The business record is kept.`,
    );
  };

  const handleScToggleHome = async (biz: Business) => {
    await updateBusiness(biz.id, { showcaseFeaturedOnHome: !biz.showcaseFeaturedOnHome });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getNeighborhoodLabel = (project: Business): string => {
    const neighborhood = (project.neighborhood ?? project.showcaseNeighborhood ?? "").trim();
    return neighborhood;
  };

  const matchesSearch = (project: Business) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const trackAssignments = getTrackAssignments(project);
    const allTeamNames = trackAssignments.flatMap((assignment) => assignment.members);
    const neighborhood = (project.neighborhood ?? project.showcaseNeighborhood ?? "").trim();
    const servicesRequested = getServicesRequestedLabel(project);
    return project.name.toLowerCase().includes(query)
      || project.ownerName.toLowerCase().includes(query)
      || neighborhood.toLowerCase().includes(query)
      || (project.referredBy ?? "").toLowerCase().includes(query)
      || servicesRequested.toLowerCase().includes(query)
      || allTeamNames.some((name) => name.toLowerCase().includes(query));
  };

  const sortByStatusThenName = (list: Business[]) => {
    return [...list].sort((a, b) => {
      const aN = normalizeTrackProjectsFromBusiness(a);
      const bN = normalizeTrackProjectsFromBusiness(b);

      const aTechRank = aN.projectTracks.includes("Tech")
        ? (TECH_STATUS_SORT[aN.trackProjects.Tech?.projectStatus ?? "Upcoming"] ?? 99)
        : 99;
      const bTechRank = bN.projectTracks.includes("Tech")
        ? (TECH_STATUS_SORT[bN.trackProjects.Tech?.projectStatus ?? "Upcoming"] ?? 99)
        : 99;
      if (aTechRank !== bTechRank) return aTechRank - bTechRank;

      const aMarketingRank = aN.projectTracks.includes("Marketing")
        ? (MARKETING_STATUS_SORT[aN.trackProjects.Marketing?.projectStatus ?? "Upcoming"] ?? 99)
        : 99;
      const bMarketingRank = bN.projectTracks.includes("Marketing")
        ? (MARKETING_STATUS_SORT[bN.trackProjects.Marketing?.projectStatus ?? "Upcoming"] ?? 99)
        : 99;
      if (aMarketingRank !== bMarketingRank) return aMarketingRank - bMarketingRank;

      return a.name.localeCompare(b.name);
    });
  };

  const _businessHasTrack = (business: Business, track: TrackDivision): boolean => {
    const normalized = normalizeTrackProjectsFromBusiness(business);
    return normalized.projectTracks.includes(track);
  };

  // Discovery tab shows entries explicitly tagged as discovery (website form or manually added).
  const isDiscoveryEntry = (business: Business): boolean =>
    business.intakeSource === "website_form" || business.intakeSource === "discovery";

  // Hides from the businesses tab — same set as discovery entries.
  const isDiscoveryBusiness = (business: Business): boolean =>
    business.intakeSource === "website_form" || business.intakeSource === "discovery";


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

  const tabScoped = businesses.filter((business) => {
    if (activeTab === "discovery") return isDiscoveryEntry(business);
    if (activeTab === "showcase") return false; // showcase tab renders its own list
    // "businesses" tab: only entries promoted to at least one track
    if (isDiscoveryBusiness(business)) return false;
    // Archived visibility
    if (showOnlyArchived) {
      if (!business.archived) return false;
    } else if (hideArchived) {
      if (business.archived) return false;
    }
    // Fine-grained filters (only applied in businesses tab)
    if (filterTracks.size > 0) {
      const bTracks = TRACK_ORDER.filter((t) => (business.projectTracks ?? []).includes(t));
      if (!bTracks.some((t) => filterTracks.has(t))) return false;
    }
    if (filterTechStatuses.size > 0) {
      const norm = normalizeTrackProjectsFromBusiness(business);
      if (!norm.projectTracks.includes("Tech")) return false;
      if (!filterTechStatuses.has(norm.trackProjects.Tech?.projectStatus ?? "Upcoming")) return false;
    }
    if (filterMarketingStatuses.size > 0) {
      const norm = normalizeTrackProjectsFromBusiness(business);
      if (!norm.projectTracks.includes("Marketing")) return false;
      if (!filterMarketingStatuses.has(norm.trackProjects.Marketing?.projectStatus ?? "Upcoming")) return false;
    }
    if (filterNeighborhoods.size > 0) {
      const n = getNeighborhoodLabel(business);
      if (!filterNeighborhoods.has(n)) return false;
    }
    return true;
  });

  // Unique neighborhoods for the filter dropdown (computed from assigned businesses).
  const allNeighborhoods = useMemo(
    () => [...new Set(
      businesses
        .filter((b) => !isDiscoveryBusiness(b))
        .map((b) => getNeighborhoodLabel(b))
        .filter(Boolean)
    )].sort(),
    [businesses]
  );

  const hasActiveFilters = filterTracks.size > 0 || filterTechStatuses.size > 0 || filterMarketingStatuses.size > 0 || filterNeighborhoods.size > 0 || showOnlyArchived || !hideArchived;
  const filtered = activeTab === "discovery"
    ? tabScoped.filter(matchesSearch).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    : sortByStatusThenName(tabScoped.filter(matchesSearch));

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
    // Use AssignmentClaims as the authoritative source: includes everyone who has ever
    // claimed or worked on an assignment for this business (not just current active ones).
    const bizAssignmentIds = new Set(
      assignments.filter((a) => a.businessId === project.id).map((a) => a.id)
    );
    const claimerNames = claims
      .filter((c) => bizAssignmentIds.has(c.assignmentId) && c.status !== "rejected")
      .map((c) => (c.memberName ?? "").trim())
      .filter(Boolean);

    // Fall back to legacy trackProjects teamMembers if no claims exist yet.
    const fallbackNames = claimerNames.length === 0
      ? getTrackAssignments(project).flatMap((a) => a.members).map((v) => String(v ?? "").trim()).filter(Boolean)
      : [];

    return resolveRecipientsFromAssignedNames([...new Set([...claimerNames, ...fallbackNames])]);
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
    setProjectEmailFrom(EMAIL.info);
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
      const token = await getAuthToken();
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

  // Counts across all assigned businesses (excludes discovery and archived).
  const assignedBusinesses = businesses.filter((b) => !isDiscoveryBusiness(b) && !b.archived);
  const ongoingCount = assignedBusinesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Ongoing").length;
  const upcomingCount = assignedBusinesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Upcoming").length;
  const completedCount = assignedBusinesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Completed").length;

  // Inline status pill change — updates all active tracks to the new status, then
  // recomputes the derived overall projectStatus.
  const handleQuickStatusChange = async (business: Business, track: TrackDivision, newStatus: string) => {
    setOpenStatusPopover(null);
    const normalized = normalizeTrackProjectsFromBusiness(business);
    const nextTrackProjects: TrackProjectMap = { ...normalized.trackProjects };
    const current = nextTrackProjects[track];
    if (current) {
      nextTrackProjects[track] = { ...current, projectStatus: newStatus as TrackStatusValue };
    } else {
      nextTrackProjects[track] = { projectStatus: newStatus as TrackStatusValue, teamMembers: [], deadlines: TRACK_DEADLINE_DEFAULT, notes: "" };
    }
    const overallStatus = deriveOverallStatus(nextTrackProjects, normalized.projectTracks);
    // Optimistic update — reflect change immediately so the row doesn't jump after the roundtrip.
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === business.id
          ? { ...b, trackProjects: nextTrackProjects, projectStatus: overallStatus }
          : b,
      ),
    );
    await updateBusiness(business.id, { trackProjects: nextTrackProjects, projectStatus: overallStatus });
  };


  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!openStatusPopover) return;
    const close = () => {
      setOpenStatusPopover(null);
      setPopoverPos(null);
    };
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openStatusPopover]);

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

  const isMemberRestricted = authRole === "member";
  const myProjects = isMemberRestricted ? filtered.filter(isProjectMine) : [];
  const otherProjects = isMemberRestricted ? filtered.filter((p) => !isProjectMine(p)) : filtered;

  const copyText = async (value: string) => {
    const safe = value.trim();
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
    } catch {
      // no-op
    }
  };

  const renderTrackStatusCell = (b: Business, track: TrackDivision) => {
    const normalized = normalizeTrackProjectsFromBusiness(b);

    if (!normalized.projectTracks.includes(track)) return <span className="text-white/25">—</span>;

    const label = normalized.trackProjects[track]?.projectStatus || "Upcoming";

    if (!canEdit) return <Badge label={label} />;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (openStatusPopover?.id === b.id && openStatusPopover?.track === track) {
            setOpenStatusPopover(null);
            setPopoverPos(null);
          } else {
            const r = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - r.bottom;
            const estimatedHeight = 220;
            const top = spaceBelow >= estimatedHeight
              ? r.bottom + 4
              : r.top - estimatedHeight - 4;
            setPopoverPos({ top, left: r.left });
            setOpenStatusPopover({ id: b.id, track });
          }
        }}
        title="Click to change status"
        className="cursor-pointer"
      >
        <Badge label={label} />
      </button>
    );
  };

  const renderTrackRow = (b: Business) => {
    const neighborhood = getNeighborhoodLabel(b);
    const derivedTracks = TRACK_ORDER.filter((t) => (b.projectTracks ?? []).includes(t));
    const servicesRequested = getServicesRequestedLabel(b);

    return (
      <tr
        id={`project-${b.id}`}
        key={b.id}
        tabIndex={0}
        aria-label={`Edit ${b.name}`}
        className="border-b border-white/5 hover:bg-white/[0.025] cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button,a,input,select")) return;
          void openEdit(b);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void openEdit(b);
          }
        }}
      >
        <td className="px-3 py-0 h-9 align-middle">
          {derivedTracks.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {derivedTracks.map((t) => (
                <span key={t} title={t} className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${TRACK_META[t].dotClass}`} />
              ))}
            </div>
          ) : <span className="text-white/20">·</span>}
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/90 align-middle overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium truncate" title={b.name}>{b.name}</span>
            {b.archived && (
              <span className="flex-shrink-0 rounded-full border border-white/15 bg-white/5 px-1.5 py-px text-[9px] font-semibold text-white/35 uppercase tracking-wide">Archived</span>
            )}
          </div>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle overflow-hidden">
          <span className="block truncate" title={neighborhood || ""}>{neighborhood || <span className="text-white/30">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/75 align-middle overflow-hidden">
          <span className="block truncate" title={b.ownerName || ""}>{b.ownerName || <span className="text-white/30">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] align-middle overflow-hidden">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.ownerEmail ? (
            <div className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <a
                href={`mailto:${b.ownerEmail}`}
                className="text-[#F6B78D]/80 hover:text-[#F6B78D] truncate block underline-offset-2 hover:underline"
                title={b.ownerEmail}
                onClick={(e) => e.stopPropagation()}
              >
                {b.ownerEmail}
              </a>
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
        <td className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle overflow-hidden">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.phone ? (
            <a
              href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
              className="block truncate text-white/75 hover:text-white"
              title={b.phone}
              onClick={(e) => e.stopPropagation()}
            >
              {formatPhone(b.phone)}
            </a>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>
        <td className="px-3 py-0 h-9 align-middle overflow-hidden">
          {renderTrackStatusCell(b, "Tech")}
        </td>
        <td className="px-3 py-0 h-9 align-middle overflow-hidden">
          {renderTrackStatusCell(b, "Marketing")}
        </td>
        <td className="px-3 py-0 h-9 align-middle overflow-hidden">
          {renderTrackStatusCell(b, "Finance")}
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle overflow-hidden">
          <span className="block truncate" title={b.referredBy || ""}>{b.referredBy || <span className="text-white/25">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle overflow-hidden">
          <span className="block truncate" title={servicesRequested}>{servicesRequested || <span className="text-white/25">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 align-middle">
          {canEdit && (
            <div className="members-row-actions">
              <span title={resolveProjectRecipients(b).emails.length === 0 ? "No assigned members to email" : undefined}>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => openProjectTeamEmailModal(b)}
                  disabled={resolveProjectRecipients(b).emails.length === 0}
                >
                  Email
                </Btn>
              </span>
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
    const servicesRequested = getServicesRequestedLabel(b);
    const fromWebsite = b.intakeSource === "website_form";
    const fromDiscovery = b.intakeSource === "discovery";
    return (
      <tr
        id={`project-${b.id}`}
        key={b.id}
        tabIndex={0}
        aria-label={`Edit ${b.name}`}
        className="border-b border-white/5 hover:bg-white/[0.025] cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button,a,input,select")) return;
          void openEdit(b);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void openEdit(b);
          }
        }}
      >
        <td className="px-3 py-0 h-9 text-[11px] text-white/90 align-middle overflow-hidden">
          <span className="font-medium truncate block" title={b.name}>{b.name}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle overflow-hidden">
          <span className="block truncate" title={neighborhood || ""}>{neighborhood || <span className="text-white/30">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/75 align-middle overflow-hidden">
          <span className="block truncate" title={b.ownerName || ""}>{b.ownerName || <span className="text-white/30">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] align-middle overflow-hidden">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.ownerEmail ? (
            <div className="inline-flex items-center gap-1 min-w-0 max-w-full">
              <a
                href={`mailto:${b.ownerEmail}`}
                className="text-[#F6B78D]/80 hover:text-[#F6B78D] truncate block underline-offset-2 hover:underline"
                title={b.ownerEmail}
                onClick={(e) => e.stopPropagation()}
              >
                {b.ownerEmail}
              </a>
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
        <td className="px-3 py-0 h-9 text-[11px] text-white/60 align-middle overflow-hidden">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.phone ? (
            <a
              href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}
              className="block truncate text-white/75 hover:text-white"
              title={b.phone}
              onClick={(e) => e.stopPropagation()}
            >
              {formatPhone(b.phone)}
            </a>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>
        <td className="px-3 py-0 h-9 text-[11px] align-middle">
          {fromWebsite ? (
            <span className="text-white/65">Website form</span>
          ) : fromDiscovery ? (
            <span className="text-white/65">Discovery</span>
          ) : (
            <span className="text-white/30">In-person</span>
          )}
        </td>
        <td className="px-3 py-0 h-9 text-[11px] align-middle">
          {fromWebsite || fromDiscovery ? (
            <span className="text-white/50">{b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : <span className="text-white/25">—</span>}</span>
          ) : (
            <input
              type="date"
              key={b.id}
              defaultValue={b.firstContactDate ?? ""}
              onBlur={(e) => { if (canEdit) void updateBusiness(b.id, { firstContactDate: e.target.value }); }}
              className="bg-transparent border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-white/70 w-full focus:outline-none focus:border-[#F6B78D]/50"
              style={{ colorScheme: "dark" }}
              disabled={!canEdit}
            />
          )}
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle overflow-hidden">
          <span className="block truncate" title={b.referredBy || ""}>{b.referredBy || <span className="text-white/25">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 text-[11px] text-white/55 align-middle overflow-hidden">
          <span className="block truncate" title={servicesRequested}>{servicesRequested || <span className="text-white/25">—</span>}</span>
        </td>
        <td className="px-3 py-0 h-9 align-middle">
          {canEdit && (
            <div className="members-row-actions">
              {(fromDiscovery || fromWebsite) && (
                <Btn
                  size="sm"
                  variant="primary"
                  onClick={() => openPromoteModal(b)}
                  title="Assign to a track and move to the Businesses tab"
                >
                  Add to Businesses
                </Btn>
              )}
              <Btn size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => void handleHardDeleteDirect(b)}>Delete</Btn>
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

  const _renderTrackProjectSection = (track: TrackDivision) => {
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
              options={(track === "Tech" ? TECH_STATUSES : track === "Marketing" ? MARKETING_STATUSES : TECH_STATUSES).map((s) => s.value)}
              emptyLabel="-"
              value={info.projectStatus ?? "Upcoming"}
              onChange={(e) => setTrackField(track, "projectStatus", e.target.value)}
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

      {/* Promote modal — assign track(s) + initial status before moving to Businesses */}
      <Modal
        open={promoteModal !== null}
        onClose={() => setPromoteModal(null)}
        title={`Add "${promoteModal?.name ?? ""}" to Businesses`}
      >
        <p className="text-sm text-white/55 font-body mb-4">
          Choose which track(s) this business will be assigned to. It will move out of Discovery and into the Businesses tab.
        </p>
        <div className="space-y-2 mb-5">
          {TRACK_ORDER.map((track) => {
            const checked = promoteModalTracks.has(track);
            const statuses = track === "Tech" ? TECH_STATUSES : track === "Marketing" ? MARKETING_STATUSES : FINANCE_STATUSES;
            return (
              <div
                key={track}
                className={`rounded-xl border p-3 transition-colors ${checked ? "border-[#F6B78D]/30 bg-[#F6B78D]/5" : "border-white/8 bg-[#0F1014]"}`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={checked}
                    onChange={() => {
                      setPromoteModalTracks((prev) => {
                        const next = new Set(prev);
                        if (next.has(track)) next.delete(track);
                        else next.add(track);
                        return next;
                      });
                    }}
                  />
                  <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${TRACK_META[track].dotClass}`} />
                  <span className="text-sm font-medium text-white/85 font-body">{TRACK_META[track].label}</span>
                </label>
                {checked && (
                  <div className="mt-2.5 pl-8">
                    <Field label="Initial status">
                      <Select
                        options={statuses.map((s) => s.value)}
                        value={(promoteModalStatuses[track] ?? "Upcoming") as string}
                        onChange={(e) => setPromoteModalStatuses((prev) => ({ ...prev, [track]: e.target.value }))}
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {promoteModalTracks.size === 0 && (
          <p className="text-xs text-white/35 font-body mb-4">Select at least one track to continue.</p>
        )}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setPromoteModal(null)}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => void handlePromote()}
            disabled={promoteModalTracks.size === 0 || promoteBusy}
          >
            {promoteBusy ? "Adding…" : "Add to Businesses"}
          </Btn>
        </div>
      </Modal>

      <SectionTabs tabs={PROJECT_GROUP_TABS} />

      <PageHeader
        title={TAB_TITLE[activeTab]}
        subtitle={activeTab === "showcase" ? "Businesses that appear on the public home and showcase pages." : undefined}
        action={
          canEdit && activeTab !== "showcase" ? (
            <div className="flex gap-2">
              <Btn
                variant="secondary"
                onClick={() => {
                  const csv = toCsv(filtered, [
                    { key: "name", label: "Name" },
                    { key: "ownerName", label: "Owner" },
                    { key: "ownerEmail", label: "Email" },
                    { key: "phone", label: "Phone" },
                    { key: "neighborhood", label: "Neighborhood" },
                    { key: "referredBy", label: "Referred By" },
                    { key: "servicesRequested", label: "Services Requested" },
                    { key: "projectStatus", label: "Status" },
                    { key: "teamLead", label: "Team Lead" },
                    { key: "firstContactDate", label: "First Contact" },
                    { key: "website", label: "Website" },
                  ]);
                  downloadCsv(dateStampedFilename(`businesses-${activeTab}`), csv);
                }}
              >
                Export CSV
              </Btn>
              <Btn variant="primary" onClick={() => openCreate(undefined, activeTab === "discovery")}>
                {activeTab === "discovery" ? "+ Add to Discovery" : "+ New Business"}
              </Btn>
            </div>
          ) : undefined
        }
      />

      {activeTab !== "showcase" && activeTab !== "discovery" && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Ongoing" value={ongoingCount} color="text-n-orange" />
          <StatCard label="Upcoming" value={upcomingCount} color="text-n-purple" />
          <StatCard label="Completed" value={completedCount} color="text-n-yellow" />
        </div>
      )}

      {activeTab !== "showcase" && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={isMemberRestricted ? "Search by business name…" : "Search by name, owner, neighborhood, or team member…"}
          />
          {activeTab === "businesses" && (
            <ViewPanel active={hasActiveFilters}>
              <ViewSection label="Track">
                <div className="space-y-1.5">
                  {TRACK_ORDER.map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                      <input
                        type="checkbox"
                        className="members-checkbox"
                        checked={filterTracks.has(t)}
                        onChange={() => setFilterTracks((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; })}
                      />
                      <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${TRACK_META[t].dotClass}`} />
                      {TRACK_META[t].label}
                    </label>
                  ))}
                </div>
              </ViewSection>
              <ViewSection label="Tech Status">
                <div className="space-y-1.5">
                  {TECH_STATUSES.map(({ value }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                      <input
                        type="checkbox"
                        className="members-checkbox"
                        checked={filterTechStatuses.has(value)}
                        onChange={() => setFilterTechStatuses((prev) => { const next = new Set(prev); if (next.has(value)) next.delete(value); else next.add(value); return next; })}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </ViewSection>
              <ViewSection label="Marketing Status">
                <div className="space-y-1.5">
                  {MARKETING_STATUSES.map(({ value }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                      <input
                        type="checkbox"
                        className="members-checkbox"
                        checked={filterMarketingStatuses.has(value)}
                        onChange={() => setFilterMarketingStatuses((prev) => { const next = new Set(prev); if (next.has(value)) next.delete(value); else next.add(value); return next; })}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </ViewSection>
              <ViewSection label="Neighborhood">
                <div className="space-y-1.5">
                  {allNeighborhoods.length === 0 ? (
                    <p className="text-xs text-white/30">No data yet.</p>
                  ) : allNeighborhoods.map((n) => (
                    <label key={n} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                      <input
                        type="checkbox"
                        className="members-checkbox"
                        checked={filterNeighborhoods.has(n)}
                        onChange={() => setFilterNeighborhoods((prev) => { const next = new Set(prev); if (next.has(n)) next.delete(n); else next.add(n); return next; })}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </ViewSection>
              <ViewSection label="Archived">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={hideArchived}
                      onChange={(e) => { setHideArchived(e.target.checked); if (e.target.checked) setShowOnlyArchived(false); }}
                    />
                    Hide archived businesses
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={showOnlyArchived}
                      onChange={(e) => { setShowOnlyArchived(e.target.checked); if (e.target.checked) setHideArchived(false); }}
                    />
                    Show only archived
                  </label>
                </div>
              </ViewSection>
            </ViewPanel>
          )}
        </div>
      )}

      {activeTab === "showcase" ? (
        <>
          {/* Add-to-showcase picker modal */}
          <Modal open={scAddOpen} onClose={() => { setScAddOpen(false); setScAddQuery(""); setScAddPickerId(""); }} title="Add Business to Showcase">
            <input
              autoFocus
              type="text"
              value={scAddQuery}
              onChange={(e) => { setScAddQuery(e.target.value); setScAddPickerId(""); }}
              placeholder="Search businesses…"
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F6B78D]/45 mb-2"
            />
            {(() => {
              const q = scAddQuery.trim().toLowerCase();
              if (!q) return <p className="text-sm text-white/35 text-center py-4">Type a business name to search…</p>;
              const options = [...businesses]
                .filter((b) => !b.showcaseEnabled)
                .filter((b) => b.name.toLowerCase().includes(q) || (b.neighborhood ?? "").toLowerCase().includes(q))
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 8);
              if (options.length === 0) {
                return <p className="text-sm text-white/35 text-center py-4">No matches.</p>;
              }
              return (
                <div className="rounded-lg border border-white/8 overflow-hidden divide-y divide-white/6 mb-4">
                  {options.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setScAddPickerId(b.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${scAddPickerId === b.id ? "bg-[#F6B78D]/15 text-white" : "text-white/75 hover:bg-white/5"}`}
                    >
                      <span className="font-medium">{b.name}</span>
                      {b.neighborhood && <span className="text-white/40 text-xs ml-2">{b.neighborhood}</span>}
                    </button>
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 pt-4 border-t border-white/8">
              <Btn variant="ghost" onClick={() => { setScAddOpen(false); setScAddQuery(""); setScAddPickerId(""); }}>Cancel</Btn>
              <Btn
                variant="primary"
                disabled={!scAddPickerId || scAddBusy}
                onClick={() => void handleScAdd()}
              >
                {scAddBusy ? "Adding…" : "Add & Edit"}
              </Btn>
            </div>
          </Modal>

          {/* Sub-tab header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-[#13161D] border border-white/10 rounded-xl p-1">
              {(["showcase", "home"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setScView(view)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${scView === view ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"}`}
                >
                  {view === "showcase" ? "Showcase" : "Home Page"}
                </button>
              ))}
            </div>
            {canEdit && (
              <Btn variant="primary" onClick={() => { setScAddOpen(true); setScAddPickerId(""); setScAddQuery(""); }}>+ Add Business</Btn>
            )}
          </div>

          {/* Drag-and-drop card preview */}
          {(() => {
            const sorted = [...businesses]
              .filter((b) => b.showcaseEnabled && (scView === "showcase" || b.showcaseFeaturedOnHome))
              .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
            const anyDragging = scDragSrcId !== null;

            const handleDragStart = (id: string) => setScDragSrcId(id);
            const handleDragOver = (e: React.DragEvent, id: string) => {
              e.preventDefault();
              if (id !== scDragSrcId) setScDragOverId(id);
            };
            const handleDrop = async (e: React.DragEvent, targetId: string) => {
              e.preventDefault();
              const srcId = scDragSrcId;
              setScDragSrcId(null);
              setScDragOverId(null);
              if (!srcId || srcId === targetId) return;
              const srcIdx = sorted.findIndex((b) => b.id === srcId);
              const tgtIdx = sorted.findIndex((b) => b.id === targetId);
              if (srcIdx === -1 || tgtIdx === -1) return;
              const reordered = [...sorted];
              const [moved] = reordered.splice(srcIdx, 1);
              reordered.splice(tgtIdx, 0, moved);
              await Promise.all(
                reordered.map((b, i) => {
                  const newIdx = (i + 1) * 1000;
                  if (newIdx !== (b.sortIndex ?? 0)) return updateBusiness(b.id, { sortIndex: newIdx });
                  return Promise.resolve();
                }),
              );
            };
            const handleDragEnd = () => { setScDragSrcId(null); setScDragOverId(null); };

            if (sorted.length === 0) {
              return (
                <Empty
                  message={scView === "showcase" ? "No businesses on the public showcase yet." : "No businesses featured on the home page yet."}
                  action={canEdit ? <Btn variant="primary" onClick={() => { setScAddOpen(true); setScAddPickerId(""); }}>+ Add Business</Btn> : undefined}
                />
              );
            }

            return (
              <MasonryGrid
                itemIds={sorted.map((b) => b.id)}
                itemWidth={290}
                gap={scView === "home" ? 20 : 24}
              >
                {sorted.map((b) => {
                  const colorSwatch = SHOWCASE_COLOR_OPTIONS.find((o) => o.value === b.showcaseColor)?.swatch ?? "#3B82F6";
                  const imgUrl = b.showcaseImageUrl || null;
                  const services = b.showcaseServices ?? [];
                  const neighborhood = (b.neighborhood ?? b.showcaseNeighborhood ?? "").trim();
                  const status = normalizeProjectStatus(b.projectStatus ?? "Upcoming");
                  const isDragging = scDragSrcId === b.id;
                  const isDragOver = scDragOverId === b.id;
                  return (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => handleDragStart(b.id)}
                      onDragOver={(e) => handleDragOver(e, b.id)}
                      onDrop={(e) => void handleDrop(e, b.id)}
                      onDragEnd={handleDragEnd}
                      className="rounded-2xl overflow-hidden flex flex-col select-none project-card"
                      style={{
                        background: "#F8F7F4",
                        border: isDragOver ? `2px solid ${colorSwatch}` : "1px solid #E4E2DC",
                        opacity: isDragging ? 0.25 : anyDragging && !isDragOver ? 0.65 : 1,
                        transform: isDragOver ? "scale(1.03)" : anyDragging && !isDragging ? "scale(0.97)" : "scale(1)",
                        cursor: isDragging ? "grabbing" : "grab",
                        boxShadow: isDragOver ? `0 0 0 3px ${colorSwatch}40` : undefined,
                        transition: "opacity 0.15s, transform 0.15s, border 0.1s, box-shadow 0.1s",
                      }}
                    >
                      {/* color bar — matches public h-2 (8px) */}
                      <div style={{ backgroundColor: colorSwatch, height: "8px", flexShrink: 0 }} />
                      {/* image — natural aspect ratio, matches public frontend */}
                      <div className="mx-4 sm:mx-7 mt-7 rounded-xl overflow-hidden" style={{ border: "1px solid #E4E2DC", background: "white" }}>
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={b.name} className="block w-full h-auto" />
                        ) : (
                          <div className="w-full flex items-center justify-center" style={{ height: "160px", color: "#C4C2BC" }}>
                            <span className="font-body text-xs uppercase tracking-wider">Project photo coming soon</span>
                          </div>
                        )}
                      </div>
                      {/* content — matches public p-7 layout exactly */}
                      <div className="p-7 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex gap-2 flex-wrap">
                            {services.map((s) => (
                              <span key={s} className="tag border" style={{ background: "#EFF6FF", borderColor: "#BFDBFE", color: "#1D4ED8" }}>{s}</span>
                            ))}
                          </div>
                          <span className={`tag text-xs flex-shrink-0 ml-2 ${status === "Completed" ? "bg-orange-100 text-orange-700" : status === "Ongoing" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                            {status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-xl mb-1" style={{ color: "#1A1A18" }}>{b.name}</h3>
                        <p className="font-body text-sm mb-3" style={{ color: "#6B6B65" }}>{b.showcaseType || "Digital & Tech"}</p>
                        {b.showcaseDescription && (
                          <p className="font-body text-sm" style={{ color: "#6B6B65" }}>{b.showcaseDescription}</p>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          {neighborhood && (
                            <p className="font-body text-xs" style={{ color: "#9B9B95" }}>📍 {neighborhood}</p>
                          )}
                          {b.showcaseUrl && (
                            <span className="font-body text-xs font-semibold" style={{ color: "#4B7A0A" }}>View live site →</span>
                          )}
                        </div>
                      </div>
                      {/* admin action buttons — sits below card content */}
                      <div
                        className="flex gap-1.5 px-3 py-2 justify-end items-center border-t"
                        style={{ borderColor: "#E4E2DC", background: "#F2F1EE" }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          title={b.showcaseFeaturedOnHome ? "Remove from home page" : "Feature on home page"}
                          onClick={(e) => { e.stopPropagation(); void handleScToggleHome(b); }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${b.showcaseFeaturedOnHome ? "bg-orange-100 border-orange-300 text-orange-700" : "bg-white/80 border-[#E4E2DC] text-[#9B9B95]"}`}
                          draggable={false}
                        >
                          {b.showcaseFeaturedOnHome ? "★ Home" : "☆ Home"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void openEdit(b); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold border bg-white/80 border-[#E4E2DC] text-[#4B4B45] hover:bg-white transition-colors"
                          draggable={false}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleScRemove(b); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-semibold border bg-white/80 border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          draggable={false}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </MasonryGrid>
            );
          })()}
        </>
      ) : activeTab === "discovery" ? (
        <div className="rounded-xl border border-white/8 bg-[#13161D] mb-6 overflow-x-auto">
          <table className="table-fixed text-left" style={{width: "100%", minWidth: "1360px"}}>
            <thead className="bg-[#0F1014]">
              <tr className="members-header-sep">
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[190px]">Business Name</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[110px]">Neighborhood</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Owner</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[210px]">Primary Email</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[110px]">Phone</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[90px]">Source</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[100px]">Date</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Referred By</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[170px]">Services Requested</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>{filtered.map(renderDiscoveryRow)}</tbody>
          </table>
          {!businessesLoaded ? (
            <div className="p-4"><SkeletonRows rows={8} cols={6} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <Empty
                message="No discovery entries yet. Website form submissions land here automatically. Use '+ Add to Discovery' to add leads manually."
                action={canEdit ? <Btn variant="primary" onClick={() => openCreate(undefined, true)}>Add to Discovery</Btn> : undefined}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {isMemberRestricted && myProjects.length > 0 && (
            <div className="mb-4">
              <h2 className="text-white/75 text-sm font-semibold uppercase tracking-wider mb-2">My Businesses</h2>
              <div className="rounded-xl border border-white/8 bg-[#13161D] overflow-x-auto">
                <table className="table-fixed text-left" style={{width: "100%", minWidth: "1721px"}}>
                  <thead className="bg-[#0F1014]">
                    <tr className="members-header-sep">
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[56px]">Track</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[200px]">Business Name</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Neighborhood</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Owner</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[210px]">Email</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Phone</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[155px]">Tech Status</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[130px]">Marketing Status</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[130px]">Finance Status</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Referred By</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[170px]">Services Requested</th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[190px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{myProjects.map((b) => renderTrackRow(b))}</tbody>
                </table>
              </div>
            </div>
          )}

          {isMemberRestricted && myProjects.length > 0 && (
            <h2 className="text-white/65 text-sm font-semibold uppercase tracking-wider mb-2">Other Businesses</h2>
          )}

          <div className="rounded-xl border border-white/8 bg-[#13161D] mb-6 overflow-x-auto">
            <table className="table-fixed text-left" style={{width: "100%", minWidth: "1721px"}}>
              <thead className="bg-[#0F1014]">
                <tr className="members-header-sep">
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[56px]">Track</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[200px]">Business Name</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Neighborhood</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Owner</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[210px]">Email</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Phone</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[155px]">Tech Status</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[130px]">Marketing Status</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[130px]">Finance Status</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[120px]">Referred By</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[170px]">Services Requested</th>
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 w-[190px]">Actions</th>
                </tr>
              </thead>
              <tbody>{otherProjects.map((b) => renderTrackRow(b))}</tbody>
            </table>
            {!businessesLoaded ? (
              <div className="p-4"><SkeletonRows rows={8} cols={8} /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6">
                <Empty
                  message="No businesses found. Create one from the '+ New Business' button above."
                  action={canEdit ? <Btn variant="primary" onClick={() => openCreate()}>Add first business</Btn> : undefined}
                />
              </div>
            ) : null}
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
                className="w-full rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 text-left hover:border-[#F6B78D]/45 transition-colors disabled:opacity-50"
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
            <Select
              value={projectEmailFrom}
              onChange={(e) => setProjectEmailFrom(e.target.value)}
            >
              {TEAM_EMAIL_FROM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
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
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingBusiness ? "Edit Business" : isDiscoveryCreate ? "Add to Discovery" : "New Business"}>
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
                <p className="text-[11px] text-[#F6B78D]/55 mt-1">Pre-filled from &ldquo;{presetNeighborhood}&rdquo; group</p>
              )}
            </Field>
          </div>

          {/* ── Status ── */}
          <div className="lg:col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Status</p>
            {(() => {
              const selectedTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []);
              const hasTracks = selectedTracks.length > 0;
              if (hasTracks) {
                const tpMap = form.trackProjects as TrackProjectMap;
                return (
                  <div className="space-y-2">
                    {selectedTracks.map((rawTrack) => {
                      const track = normalizeDivision(rawTrack);
                      const statuses = track === "Tech" ? TECH_STATUSES : track === "Marketing" ? MARKETING_STATUSES : FINANCE_STATUSES;
                      const currentStatus = tpMap?.[track]?.projectStatus ?? "Upcoming";
                      return (
                        <div key={track} className="flex items-center gap-3">
                          <span className="text-xs text-white/55 w-20 flex-shrink-0">{TRACK_META[track].label}</span>
                          <select
                            value={currentStatus}
                            onChange={(e) => setTrackField(track, "projectStatus", e.target.value)}
                            className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#F6B78D]/45"
                          >
                            {statuses.map(({ value }) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return (
                <Select
                  value={form.projectStatus ?? "Upcoming"}
                  onChange={(e) => setField("projectStatus", e.target.value)}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </Select>
              );
            })()}
          </div>

          {/* ── Tracks ── */}
          <div className="lg:col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Tracks</p>
            <div className="flex items-center gap-3">
              {TRACK_ORDER.map((t) => {
                const selected = (Array.isArray(form.projectTracks) ? form.projectTracks : []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrackSelection(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                      selected
                        ? TRACK_META[t].chipClass
                        : "border-white/15 text-white/45 hover:text-white/70 hover:border-white/25"
                    }`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${TRACK_META[t].dotClass}`} />
                    {TRACK_META[t].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Showcase ── */}
          <div className="lg:col-span-2">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-2">Public Showcase</p>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1014] px-4 py-3 cursor-pointer mb-3">
              <div>
                <p className="text-sm text-white/85 font-medium">Include in public showcase</p>
                <p className="text-[11px] text-white/40 mt-0.5">Appears on novusnyc.org/showcase and optionally the home page.</p>
              </div>
              <input
                type="checkbox"
                className="members-checkbox"
                checked={!!form.showcaseEnabled}
                onChange={(e) => setField("showcaseEnabled", e.target.checked)}
              />
            </label>
            {form.showcaseEnabled && (
              <div className="space-y-3 pl-1">
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-sm text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={!!form.showcaseFeaturedOnHome}
                    onChange={(e) => setField("showcaseFeaturedOnHome", e.target.checked)}
                  />
                  <span>Feature on home page</span>
                </label>
                <Field label="Description">
                  <TextArea
                    rows={3}
                    value={form.showcaseDescription ?? ""}
                    onChange={(e) => setField("showcaseDescription", e.target.value)}
                    placeholder="Public description shown on the showcase card…"
                  />
                </Field>
                <Field label="Website URL">
                  <Input
                    value={form.showcaseUrl ?? ""}
                    onChange={(e) => setField("showcaseUrl", e.target.value)}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Service">
                  <Select
                    value={(form.showcaseServices ?? [])[0] ?? ""}
                    onChange={(e) => setField("showcaseServices", e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">— none —</option>
                    {showcaseServiceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Card color">
                  <div className="flex flex-wrap gap-1.5">
                    {SHOWCASE_COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("showcaseColor", opt.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${form.showcaseColor === opt.value ? "border-white scale-110" : "border-white/20 hover:border-white/50"}`}
                        style={{ backgroundColor: opt.swatch }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Photo">
                  {(form.showcaseImageData || form.showcaseImageUrl) && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/10" style={{ maxHeight: 140 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.showcaseImageData || form.showcaseImageUrl || ""}
                        alt="Showcase preview"
                        className="w-full object-cover"
                        style={{ maxHeight: 140 }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {form.showcaseImageData || form.showcaseImageUrl ? "Change photo" : "Upload photo"}
                    </Btn>
                    {(form.showcaseImageData || form.showcaseImageUrl) && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => { setField("showcaseImageData", ""); setField("showcaseImageUrl", ""); }}
                      >
                        Remove
                      </Btn>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => { setField("showcaseImageData", ev.target?.result as string); };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1.5">Stored in Supabase Storage. Recommended: 16:9, under 2 MB.</p>
                </Field>
              </div>
            )}
          </div>

        </div>
        <div className="flex justify-between items-center gap-3 mt-5 pt-4 border-t border-white/8">
          <div>
            {editingBusiness && (
              <div className="flex gap-2">
                <Btn variant="danger" onClick={() => void handleArchiveFromEdit()} title={editingBusiness.archived ? "Restore to main list" : "Hide from main list (recoverable)"}>
                  {editingBusiness.archived ? "Unarchive" : "Archive"}
                </Btn>
                <Btn variant="danger" onClick={() => void handleHardDeleteFromEdit()} title="Permanently delete — cannot be undone">
                  Delete
                </Btn>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {saveError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 w-full">
                {saveError}
              </p>
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim() || saveBusy}>
                {saveBusy ? "Saving…" : editingBusiness ? "Save" : "Create"}
              </Btn>
            </div>
          </div>
        </div>
      </Modal>

      {/* Status popover — rendered at page root with position: fixed so it
          escapes ancestor overflow clipping (table cells, overflow-x-auto wraps). */}
      {openStatusPopover && popoverPos && (() => {
        const b = businesses.find((biz) => biz.id === openStatusPopover.id);
        if (!b) return null;
        const { track } = openStatusPopover;
        const normalized = normalizeTrackProjectsFromBusiness(b);
        const currentStatus = normalized.trackProjects[track]?.projectStatus ?? "Upcoming";
        const statuses = track === "Tech" ? TECH_STATUSES : track === "Marketing" ? MARKETING_STATUSES : FINANCE_STATUSES;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 1000 }}
            className="bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
          >
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-white/35">{track} Status</p>
            {statuses.map(({ value }) => {
              const isActive = currentStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => void handleQuickStatusChange(b, track, value)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors flex items-center gap-2.5 ${isActive ? "text-[#F6B78D]" : "text-white/70"}`}
                >
                  <span className="w-3 flex-shrink-0 text-[#F6B78D]">{isActive ? "✓" : ""}</span>
                  <Badge label={value} />
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Move-to popover — same fixed-positioning treatment. */}
    </MembersLayout>
  );
}
