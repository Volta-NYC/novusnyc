// Shared constants for the members portal.
// Import from here rather than redefining per-page.

import type { CycleTrack } from "@/lib/members/storage";

// ── TRACK STYLING ─────────────────────────────────────────────────────────────
// Light-theme chip + dot styles for Tech / Marketing / Finance / General.
// Used in: projects, work marketplace, assignment catalog, team page.

export type TrackDivision = "Tech" | "Marketing" | "Finance";

export const TRACK_ORDER: TrackDivision[] = ["Tech", "Marketing", "Finance"];

export const TRACK_META: Record<TrackDivision, {
  label: string;
  chipClass: string;   // bordered pill — light bg + colored text
  dotClass: string;    // filled dot or small badge
}> = {
  Tech:      { label: "Tech",      chipClass: "bg-blue-100 text-blue-700 border-blue-300",   dotClass: "bg-blue-500" },
  Marketing: { label: "Marketing", chipClass: "bg-lime-100 text-lime-700 border-lime-300",   dotClass: "bg-lime-500" },
  Finance:   { label: "Finance",   chipClass: "bg-amber-100 text-amber-700 border-amber-300", dotClass: "bg-amber-500" },
};

// Includes "General" for assignment-marketplace contexts.
export const TRACK_DOT: Record<CycleTrack, string> = {
  Tech:      "bg-blue-500",
  Marketing: "bg-lime-500",
  Finance:   "bg-amber-500",
  General:   "bg-gray-400",
};

export const TRACK_PILL: Record<CycleTrack, string> = {
  Tech:      "bg-blue-100 text-blue-800 border-blue-200",
  Marketing: "bg-lime-100 text-lime-900 border-lime-200",
  Finance:   "bg-amber-100 text-amber-900 border-amber-200",
  General:   "bg-gray-100 text-gray-700 border-gray-200",
};

export const ALL_TRACKS: CycleTrack[] = ["Tech", "Marketing", "Finance", "General"];

// ── DIVISION LABELS ───────────────────────────────────────────────────────────
// Human-readable labels for public-facing track names.

export const DIVISION_PUBLIC_LABEL: Record<string, string> = {
  Tech:      "Digital & Tech",
  Marketing: "Marketing & Strategy",
  Finance:   "Finance & Operations",
};

// ── SERVICES ──────────────────────────────────────────────────────────────────
// Active service options for businesses. Must match CLAUDE.md.

export const BUSINESS_SERVICES = [
  "Website",
  "SEO",
  "Social Media",
  "Graphic Design",
  "Grants",
] as const;

export type BusinessService = (typeof BUSINESS_SERVICES)[number];

// ── ROLES ─────────────────────────────────────────────────────────────────────

export const AUTH_ROLES = ["owner", "admin", "member"] as const;

export const CYCLE_ROLES = ["Analyst", "Senior Analyst", "Associate"] as const;
