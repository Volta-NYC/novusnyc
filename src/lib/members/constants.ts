// Shared constants for the members portal.
// Import from here rather than redefining per-page.

import type { CycleTrack } from "@/lib/members/storage";

// ── TRACK STYLING ─────────────────────────────────────────────────────────────
// Chip + dot styles for Tech / Marketing / Finance / General.
//
// Hues match how the tracks are coloured on the public site: purple for
// Digital & Tech, peach for Marketing, yellow for Finance & Operations. The
// brand tokens are used rather than Tailwind's 500-weight equivalents, which
// read as neon beside the rest of the palette.
//
// Pastels are fills, so chips pair them with n-ink text rather than a tinted
// one. Dots carry no text and can use the pastel straight.

export type TrackDivision = "Tech" | "Marketing" | "Finance";

export const TRACK_ORDER: TrackDivision[] = ["Tech", "Marketing", "Finance"];

export const TRACK_META: Record<TrackDivision, {
  label: string;
  chipClass: string;   // bordered pill — light bg + colored text
  dotClass: string;    // filled dot or small badge
}> = {
  Tech:      { label: "Tech",      chipClass: "bg-n-purple/30 text-n-ink border-n-purple/60", dotClass: "bg-n-purple" },
  Marketing: { label: "Marketing", chipClass: "bg-n-orange/30 text-n-ink border-n-orange/60", dotClass: "bg-n-orange" },
  Finance:   { label: "Finance",   chipClass: "bg-n-yellow/40 text-n-ink border-n-yellow/70", dotClass: "bg-n-yellow" },
};

// Includes "General" for assignment-marketplace contexts.
export const TRACK_DOT: Record<CycleTrack, string> = {
  Tech:      "bg-n-purple",
  Marketing: "bg-n-orange",
  Finance:   "bg-n-yellow",
  General:   "bg-gray-400",
};

export const TRACK_PILL: Record<CycleTrack, string> = {
  Tech:      "bg-n-purple/30 text-n-ink border-n-purple/50",
  Marketing: "bg-n-orange/30 text-n-ink border-n-orange/50",
  Finance:   "bg-n-yellow/40 text-n-ink border-n-yellow/60",
  General:   "bg-gray-100 text-gray-700 border-gray-200",
};

// bg + text only — use when the border is applied separately (e.g. filter chips).
// All four tracks use a solid filled background so selected vs. unselected is
// clearly distinguishable. General uses gray-200 (not gray-100) for sufficient
// contrast against the white unselected pill.
export const TRACK_PILL_BASE: Record<CycleTrack, string> = {
  Tech:      "bg-n-purple/30 text-n-ink",
  Marketing: "bg-n-orange/30 text-n-ink",
  Finance:   "bg-n-yellow/40 text-n-ink",
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
