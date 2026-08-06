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
  Tech:      { label: "Tech",      chipClass: "bg-violet-100 text-violet-700 border-violet-300",   dotClass: "bg-violet-500" },
  Marketing: { label: "Marketing", chipClass: "bg-orange-100 text-orange-700 border-orange-300",   dotClass: "bg-orange-500" },
  Finance:   { label: "Finance",   chipClass: "bg-amber-100 text-amber-700 border-amber-300", dotClass: "bg-amber-500" },
};

// Includes "General" for assignment-marketplace contexts.
export const TRACK_DOT: Record<CycleTrack, string> = {
  Tech:      "bg-violet-500",
  Marketing: "bg-orange-500",
  Finance:   "bg-amber-500",
  General:   "bg-gray-400",
};

export const TRACK_PILL: Record<CycleTrack, string> = {
  Tech:      "bg-violet-100 text-violet-800 border-violet-200",
  Marketing: "bg-orange-100 text-orange-900 border-orange-200",
  Finance:   "bg-amber-100 text-amber-900 border-amber-200",
  General:   "bg-gray-100 text-gray-700 border-gray-200",
};

// bg + text only — use when the border is applied separately (e.g. filter chips).
// All four tracks use a solid filled background so selected vs. unselected is
// clearly distinguishable. General uses gray-200 (not gray-100) for sufficient
// contrast against the white unselected pill.
export const TRACK_PILL_BASE: Record<CycleTrack, string> = {
  Tech:      "bg-violet-100 text-violet-800",
  Marketing: "bg-orange-100 text-orange-900",
  Finance:   "bg-amber-100 text-amber-900",
  General:   "bg-gray-200 text-gray-800",
};

export const ALL_TRACKS: CycleTrack[] = ["General", "Tech", "Marketing", "Finance"];

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
