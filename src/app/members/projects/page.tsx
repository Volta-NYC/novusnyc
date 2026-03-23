"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, AutocompleteInput, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBusinesses, subscribeTeam, createBusiness, updateBusiness, deleteBusiness, type Business, type TeamMember,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES  = ["Upcoming", "Ongoing", "Completed"] as const;
const DIVISIONS = ["Tech", "Marketing", "Finance"] as const;
type TrackDivision = (typeof DIVISIONS)[number];
type ProjectStatusValue = (typeof STATUSES)[number];
const DIVISION_PUBLIC_LABEL: Record<string, string> = {
  Tech: "Digital & Tech",
  Marketing: "Marketing & Strategy",
  Finance: "Finance & Operations",
};
const TRACK_META: Record<TrackDivision, { label: string; chipClass: string; dotClass: string }> = {
  Tech: {
    label: "Tech",
    chipClass: "bg-blue-100 text-blue-700 border-blue-300",
    dotClass: "bg-blue-500 border-blue-300",
  },
  Marketing: {
    label: "Marketing",
    chipClass: "bg-lime-100 text-lime-700 border-lime-300",
    dotClass: "bg-lime-500 border-lime-300",
  },
  Finance: {
    label: "Finance",
    chipClass: "bg-amber-100 text-amber-700 border-amber-300",
    dotClass: "bg-amber-500 border-amber-300",
  },
};
const TRACK_ORDER: TrackDivision[] = ["Tech", "Marketing", "Finance"];
type TrackProjectInfo = {
  projectStatus: ProjectStatusValue;
  teamMembers: string[];
  notes: string;
};
type TrackProjectMap = Partial<Record<TrackDivision, TrackProjectInfo>>;
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
    const fallbackTrack: TrackDivision = legacyMembers.length > 0 ? "Tech" : normalizeDivision(business.division);
    projectTracks = [fallbackTrack];
    normalizedMap[fallbackTrack] = {
      projectStatus: normalizeProjectStatus(business.projectStatus),
      teamMembers: legacyMembers,
      notes: String(business.notes ?? "").trim(),
    };
  }

  for (const track of projectTracks) {
    if (!normalizedMap[track]) {
      normalizedMap[track] = {
        projectStatus: normalizeProjectStatus(business.projectStatus),
        teamMembers: [],
        notes: "",
      };
    }
  }

  return { projectTracks, trackProjects: normalizedMap };
}

function deriveOverallStatus(trackProjects: TrackProjectMap, projectTracks: TrackDivision[]): ProjectStatusValue {
  const statuses = projectTracks.map((track) => trackProjects[track]?.projectStatus ?? "Upcoming");
  if (statuses.includes("Ongoing")) return "Ongoing";
  if (statuses.includes("Upcoming")) return "Upcoming";
  return "Completed";
}

function derivePrimaryDivision(projectTracks: TrackDivision[]): TrackDivision {
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

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function toExportString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join(" | ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type BusinessExportRow = {
  id: string;
  name: string;
  projectTracks: string[];
  trackProjects: string;
  projectStatus: string;
  division: string;
  bidId: string;
  ownerName: string;
  ownerEmail: string;
  ownerAlternateEmail: string;
  phone: string;
  alternatePhone: string;
  address: string;
  neighborhood: string;
  website: string;
  teamLead: string;
  teamMembers: string[];
  intakeSource: string;
  notes: string;
  lat: number | "";
  lng: number | "";
  showcaseEnabled: boolean;
  showcaseFeaturedOnHome: boolean;
  showcaseName: string;
  showcaseType: string;
  showcaseServices: string[];
  showcaseDescription: string;
  showcaseUrl: string;
  showcaseImageUrl: string;
  hasUploadedShowcaseImage: boolean;
  uploadedShowcaseImageBytes: number;
  createdAt: string;
  updatedAt: string;
};

const BUSINESS_EXPORT_HEADERS: Array<keyof BusinessExportRow> = [
  "id",
  "name",
  "projectTracks",
  "trackProjects",
  "projectStatus",
  "division",
  "bidId",
  "ownerName",
  "ownerEmail",
  "ownerAlternateEmail",
  "phone",
  "alternatePhone",
  "address",
  "neighborhood",
  "website",
  "teamLead",
  "teamMembers",
  "intakeSource",
  "notes",
  "lat",
  "lng",
  "showcaseEnabled",
  "showcaseFeaturedOnHome",
  "showcaseName",
  "showcaseType",
  "showcaseServices",
  "showcaseDescription",
  "showcaseUrl",
  "showcaseImageUrl",
  "hasUploadedShowcaseImage",
  "uploadedShowcaseImageBytes",
  "createdAt",
  "updatedAt",
];

function toBusinessExportRow(business: Business): BusinessExportRow {
  const imageData = (business.showcaseImageData ?? "").trim();
  const { projectTracks, trackProjects } = normalizeTrackProjectsFromBusiness(business);
  const serializedTrackProjects = TRACK_ORDER.reduce<Record<string, { projectStatus: ProjectStatusValue; teamMembers: string[]; notes: string }>>((acc, track) => {
    const info = trackProjects[track];
    if (!info) return acc;
    acc[track] = {
      projectStatus: info.projectStatus,
      teamMembers: info.teamMembers,
      notes: info.notes,
    };
    return acc;
  }, {});
  const overallStatus = deriveOverallStatus(trackProjects, projectTracks);
  const primaryDivision = derivePrimaryDivision(projectTracks);
  return {
    id: business.id,
    name: business.name ?? "",
    projectTracks,
    trackProjects: JSON.stringify(serializedTrackProjects),
    projectStatus: overallStatus,
    division: primaryDivision,
    bidId: business.bidId ?? "",
    ownerName: business.ownerName ?? "",
    ownerEmail: business.ownerEmail ?? "",
    ownerAlternateEmail: business.ownerAlternateEmail ?? "",
    phone: business.phone ?? "",
    alternatePhone: business.alternatePhone ?? "",
    address: business.address ?? "",
    neighborhood: business.neighborhood ?? business.showcaseNeighborhood ?? "",
    website: business.website ?? "",
    teamLead: business.teamLead ?? "",
    teamMembers: TRACK_ORDER.flatMap((track) => (trackProjects[track]?.teamMembers ?? [])),
    intakeSource: business.intakeSource ?? "",
    notes: business.notes ?? "",
    lat: typeof business.lat === "number" ? business.lat : "",
    lng: typeof business.lng === "number" ? business.lng : "",
    showcaseEnabled: !!business.showcaseEnabled,
    showcaseFeaturedOnHome: !!business.showcaseFeaturedOnHome,
    showcaseName: business.showcaseName ?? "",
    showcaseType: business.showcaseType ?? "",
    showcaseServices: business.showcaseServices ?? [],
    showcaseDescription: business.showcaseDescription ?? "",
    showcaseUrl: business.showcaseUrl ?? "",
    showcaseImageUrl: business.showcaseImageUrl ?? "",
    hasUploadedShowcaseImage: imageData.length > 0,
    uploadedShowcaseImageBytes: imageData.length,
    createdAt: business.createdAt ?? "",
    updatedAt: business.updatedAt ?? "",
  };
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
  projectTracks: ["Tech"],
  trackProjects: {
    Tech: {
      projectStatus: "Upcoming",
      teamMembers: [],
      notes: "",
    },
  },
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

export default function BusinessesPage() {
  const [businesses, setBusinesses]           = useState<Business[]>([]);
  const [team, setTeam]                       = useState<TeamMember[]>([]);
  const [search, setSearch]                   = useState("");
  const [filterDiv, setFilterDiv]             = useState("");
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
  const [projectEmailSubject, setProjectEmailSubject] = useState("");
  const [projectEmailMessage, setProjectEmailMessage] = useState("");
  const [projectEmailFrom, setProjectEmailFrom] = useState("info@voltanyc.org");
  const [projectEmailMode, setProjectEmailMode] = useState<"plain" | "html">("plain");
  const [projectEmailSending, setProjectEmailSending] = useState(false);
  const [projectEmailStatus, setProjectEmailStatus] = useState<string | null>(null);
  const [projectEmailRecipientOverride, setProjectEmailRecipientOverride] = useState<string[] | null>(null);
  const [projectEmailRecipientLabel, setProjectEmailRecipientLabel] = useState<string | null>(null);
  const normalizedLegacyColorsRef = useRef(false);
  const normalizedLegacyTracksRef = useRef(false);

  const { ask, Dialog } = useConfirm();
  const { authRole, user, userProfile } = useAuth();
  const canEdit = authRole === "admin";

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

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const selectedTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : [])
      .map((track) => normalizeDivision(track))
      .filter((track, index, arr) => arr.indexOf(track) === index);
    if (selectedTracks.length === 0) return;

    const nextTrackProjects: TrackProjectMap = {};
    for (const track of selectedTracks) {
      const info = normalizeTrackProjectInfo(form.trackProjects?.[track]);
      nextTrackProjects[track] = info ?? {
        projectStatus: "Upcoming",
        teamMembers: [],
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

  const getNeighborhoodGroupLabel = (project: Business) => {
    const neighborhood = (project.neighborhood ?? project.showcaseNeighborhood ?? "").trim();
    return neighborhood || "Unspecified location";
  };

  const compareNeighborhoodLabels = (a: string, b: string) => {
    const aUnspecified = a.toLowerCase() === "unspecified location";
    const bUnspecified = b.toLowerCase() === "unspecified location";
    if (aUnspecified !== bUnspecified) return aUnspecified ? 1 : -1;
    return a.localeCompare(b);
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

  const sortBusinesses = (list: Business[]) => {
    return [...list].sort((a, b) => {
      const neighborhoodA = getNeighborhoodGroupLabel(a);
      const neighborhoodB = getNeighborhoodGroupLabel(b);
      if (neighborhoodA !== neighborhoodB) return compareNeighborhoodLabels(neighborhoodA, neighborhoodB);
      const statusDelta = PROJECT_STATUS_SORT_ORDER[normalizeProjectStatus(a.projectStatus)] - PROJECT_STATUS_SORT_ORDER[normalizeProjectStatus(b.projectStatus)];
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    });
  };

  const divisionScoped = businesses.filter((business) => {
    if (!filterDiv) return true;
    const normalized = normalizeTrackProjectsFromBusiness(business);
    return normalized.projectTracks.includes(normalizeDivision(filterDiv));
  });
  const filtered = sortBusinesses(divisionScoped.filter(matchesSearch));

  const exportBusinessesJson = () => {
    const payload = businesses.map(toBusinessExportRow);
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(
      `volta-projects-${date}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const exportBusinessesCsv = () => {
    const rows = businesses.map(toBusinessExportRow);
    const headers = BUSINESS_EXPORT_HEADERS;
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => csvEscape(toExportString(row[header]))).join(",")
      ),
    ];

    const date = new Date().toISOString().slice(0, 10);
    downloadFile(
      `volta-projects-${date}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8",
    );
  };

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

  const resolveProjectRecipients = (project: Business): { emails: string[]; unresolved: string[] } => {
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

    const assigned = getTrackAssignments(project)
      .flatMap((assignment) => assignment.members)
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

  const baseProjectEmailRecipients = emailModalProject ? resolveProjectRecipients(emailModalProject) : { emails: [], unresolved: [] };
  const projectEmailRecipients = projectEmailRecipientOverride
    ? { emails: projectEmailRecipientOverride, unresolved: [] as string[] }
    : baseProjectEmailRecipients;

  const closeProjectEmailModal = () => {
    setEmailModalProject(null);
    setProjectEmailRecipientOverride(null);
    setProjectEmailRecipientLabel(null);
    setProjectEmailStatus(null);
  };

  const openProjectEmailModal = (project: Business) => {
    setEmailModalProject(project);
    setProjectEmailRecipientOverride(null);
    setProjectEmailRecipientLabel(null);
    setProjectEmailFrom("info@voltanyc.org");
    setProjectEmailMode("plain");
    setProjectEmailSubject(`${project.name} — Project Update`);
    setProjectEmailMessage("");
    setProjectEmailStatus(null);
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

  const ongoingCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Ongoing").length;
  const upcomingCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Upcoming").length;
  const completedCount = businesses.filter((b) => normalizeProjectStatus(b.projectStatus) === "Completed").length;

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
  const groupProjectsByNeighborhood = (list: Business[]) => {
    const grouped = new Map<string, Business[]>();
    for (const project of list) {
      const label = getNeighborhoodGroupLabel(project);
      const current = grouped.get(label) ?? [];
      current.push(project);
      grouped.set(label, current);
    }
    return Array.from(grouped.entries())
      .sort(([labelA], [labelB]) => compareNeighborhoodLabels(labelA, labelB))
      .map(([label, items]) => ({ label, items }));
  };
  const groupedMyProjects = groupProjectsByNeighborhood(myProjects);
  const groupedOtherProjects = groupProjectsByNeighborhood(otherProjects);

  const copyText = async (value: string) => {
    const safe = value.trim();
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
    } catch {
      // no-op
    }
  };

  const renderProjectCompactRow = (b: Business) => {
    const normalizedStatus = normalizeProjectStatus(b.projectStatus);
    const trackAssignments = getTrackAssignments(b);

    return (
      <tr id={`project-${b.id}`} key={b.id} className="border-b border-white/8 hover:bg-white/[0.03]">
        <td className="px-2 py-1.5 text-[11px] text-white/90 whitespace-nowrap max-w-[220px] truncate" title={b.name}>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1">
              {trackAssignments.map((assignment) => (
                <span
                  key={`${b.id}-${assignment.track}`}
                  className={`inline-block h-2.5 w-2.5 rounded-full border ${TRACK_META[assignment.track].dotClass}`}
                  title={TRACK_META[assignment.track].label}
                />
              ))}
            </span>
            <span>{b.name}</span>
          </span>
          {b.intakeSource === "website_form" && <span className="text-amber-300 ml-1">★</span>}
          {b.showcaseEnabled && <span className="text-blue-300 ml-1">◆</span>}
        </td>
        <td className="px-2 py-1.5 text-[11px] text-white/80 whitespace-nowrap max-w-[150px] truncate" title={b.ownerName || "—"}>
          {b.ownerName || "—"}
        </td>
        <td className="px-2 py-1.5 text-[11px] whitespace-nowrap">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.ownerEmail ? (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[#85CC17]/80 max-w-[160px] truncate" title={b.ownerEmail}>{b.ownerEmail}</span>
              <button
                type="button"
                className="members-copy-btn"
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
            <span className="text-white/40">—</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-[11px] whitespace-nowrap">
          {isMemberRestricted ? (
            <span className="text-white/40">—</span>
          ) : b.phone ? (
            <div className="inline-flex items-center gap-1.5">
              <span className="text-white/75 max-w-[120px] truncate" title={b.phone}>{b.phone}</span>
              <button
                type="button"
                className="members-copy-btn"
                onClick={() => void copyText(b.phone)}
                title="Copy primary phone number"
                aria-label="Copy primary phone number"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="text-white/40">—</span>
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap">
          <Badge label={normalizedStatus} />
        </td>
        <td className="px-2 py-1.5 text-[11px] text-white/80 max-w-[260px]" title={trackAssignments.map((assignment) => `${formatTrackTeamLabel(assignment.track)}: ${assignment.members.join(", ") || "—"}`).join(" · ")}>
          {trackAssignments.every((assignment) => assignment.members.length === 0) ? (
            <span className="text-white/40">—</span>
          ) : (
            <div className="space-y-0.5">
              {trackAssignments.map((assignment) => (
                <div key={`${b.id}-${assignment.track}`} className="truncate">
                  <span className="text-white/55">{formatTrackTeamLabel(assignment.track)}:</span>{" "}
                  {assignment.members.length === 0 ? (
                    <span className="text-white/40">—</span>
                  ) : assignment.members.map((memberName, idx) => (
                    <span key={`${b.id}-${assignment.track}-${memberName}-${idx}`}>
                      {idx > 0 && <span className="text-white/40">, </span>}
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
              ))}
            </div>
          )}
        </td>
        <td className="px-2 py-1.5 whitespace-nowrap text-right w-[160px]">
          {canEdit && (
            <div className="inline-flex gap-1.5">
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
          )}
        </td>
      </tr>
    );
  };

  const toggleTrackSelection = (track: TrackDivision) => {
    const currentTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []).map((item) => normalizeDivision(item));
    const formTrackProjects = normalizedFormTrackProjects();
    const hasTrack = currentTracks.includes(track);
    if (hasTrack && currentTracks.length === 1) return;

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
        notes: "",
      },
    };
    setField("projectTracks", nextTracks);
    setField("trackProjects", nextTrackProjects);
  };

  const setTrackField = (track: TrackDivision, key: keyof TrackProjectInfo, value: string | string[]) => {
    const formTrackProjects = normalizedFormTrackProjects();
    const current = formTrackProjects[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
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

  const renderTrackProjectSection = (track: TrackDivision) => {
    const info = normalizedFormTrackProjects()[track] ?? {
      projectStatus: "Upcoming",
      teamMembers: [],
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
                          className="h-7 w-7 rounded-md border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 hover:border-red-300/60 transition-colors flex items-center justify-center"
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
        title="Projects"
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={exportBusinessesCsv}>Export CSV</Btn>
              <Btn variant="secondary" onClick={exportBusinessesJson}>Export JSON</Btn>
              <Btn variant="primary" onClick={openCreate}>+ New Project</Btn>
            </div>
          ) : undefined
        }
      />
      <p className="text-xs text-white/45 mb-4">
        <span className="text-amber-300 font-semibold">★</span> Submitted via website business interest form.
        <span className="mx-2">·</span>
        <span className="text-blue-300 font-semibold">◆</span> Visible on public home/showcase.
        <span className="mx-2">·</span>
        <span className="inline-flex items-center gap-1 align-middle">
          <span className={`inline-block h-2.5 w-2.5 rounded-full border ${TRACK_META.Tech.dotClass}`} />
          <span className={`inline-block h-2.5 w-2.5 rounded-full border ${TRACK_META.Marketing.dotClass}`} />
          <span className={`inline-block h-2.5 w-2.5 rounded-full border ${TRACK_META.Finance.dotClass}`} />
        </span>{" "}
        Track assignments (Tech / Marketing / Finance).
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Ongoing" value={ongoingCount} color="text-green-400" />
        <StatCard label="Upcoming" value={upcomingCount} color="text-blue-400" />
        <StatCard label="Completed" value={completedCount} color="text-violet-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder={isMemberRestricted ? "Search business names…" : "Search businesses, owners, leads…"} />
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl pl-3 pr-11 py-2.5 text-sm text-white/70 focus:outline-none appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff66' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
        >
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {isNonAdminMember && myProjects.length > 0 && (
        <div className="mb-4">
          <h2 className="text-white/75 text-sm font-semibold uppercase tracking-wider mb-2">My Projects</h2>
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed text-left">
              <thead className="bg-[#0F1014] border-b border-white/8">
                <tr>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[22%]">Business Name</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Owner Name</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[16%]">Primary Email</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Primary Phone</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[11%]">Status</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Track Teams</th>
                  <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 text-right w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedMyProjects.map((group) => (
                  <Fragment key={`my-${group.label}`}>
                    <tr className="bg-[#12151B] border-b border-white/8">
                      <td colSpan={7} className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-[#85CC17]">
                        {group.label} · {group.items.length}
                      </td>
                    </tr>
                    {group.items.map(renderProjectCompactRow)}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isNonAdminMember && myProjects.length > 0 && (
        <h2 className="text-white/65 text-sm font-semibold uppercase tracking-wider mb-2">Other Projects</h2>
      )}

      <div className="bg-[#1C1F26] border border-white/8 rounded-xl overflow-x-auto mb-6">
        <table className="w-full min-w-[920px] table-fixed text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[22%]">Business Name</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[14%]">Owner Name</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[16%]">Primary Email</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[12%]">Primary Phone</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[11%]">Status</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Track Teams</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 text-right w-[160px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedOtherProjects.map((group) => (
              <Fragment key={`all-${group.label}`}>
                <tr className="bg-[#12151B] border-b border-white/8">
                  <td colSpan={7} className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-[#85CC17]">
                    {group.label} · {group.items.length}
                  </td>
                </tr>
                {group.items.map(renderProjectCompactRow)}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-4">
            <Empty
              message="No projects found."
              action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first project</Btn> : undefined}
            />
          </div>
        )}
      </div>

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
                  className="h-8 w-8 rounded-md border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 hover:border-red-300/60 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
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
                  className="h-8 w-8 rounded-md border border-red-400/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 hover:border-red-300/60 transition-colors flex items-center justify-center text-base leading-none flex-shrink-0"
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
              <Input
                value={form.neighborhood ?? ""}
                onChange={e => setField("neighborhood", e.target.value)}
                placeholder="e.g. Flushing, Queens"
              />
            </Field>
          </div>

          {/* ── Project Info ── */}
          <div className="lg:col-span-2 mt-2 pt-2 border-t border-white/8">
            <p className="text-white/30 text-xs uppercase tracking-wider font-body mb-1">Project Info</p>
            <p className="text-white/45 text-xs font-body">Select one or more tracks, then configure each track project below.</p>
          </div>
          <div className="lg:col-span-2">
            <Field label="Tracks" required>
              <div className="flex flex-wrap gap-2">
                {TRACK_ORDER.map((track) => {
                  const selectedTracks = (Array.isArray(form.projectTracks) ? form.projectTracks : []).map((item) => normalizeDivision(item));
                  const selected = selectedTracks.includes(track);
                  return (
                    <button
                      key={`track-toggle-${track}`}
                      type="button"
                      onClick={() => toggleTrackSelection(track)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? TRACK_META[track].chipClass
                          : "border-white/20 text-white/65 bg-[#11141A] hover:border-white/35"
                      }`}
                    >
                      <span className={`inline-block h-2.5 w-2.5 rounded-full border ${TRACK_META[track].dotClass}`} />
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
                  if (!checked) setField("showcaseFeaturedOnHome", false);
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
