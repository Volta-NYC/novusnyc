import { type TeamMember } from "@/lib/members/storage";

// The track badge was written twice — once here, once on the email page — and
// the two drifted: the email copy still used generic blue/amber/green while the
// directory moved to the Novus palette. One copy now, so they cannot disagree.

export type TrackKey = "Tech" | "Marketing" | "Finance" | "Other" | "—";

export function getMemberTrack(member: TeamMember): TrackKey {
  const divisions = member.divisions ?? [];
  if (divisions.includes("Tech")) return "Tech";
  if (divisions.includes("Marketing")) return "Marketing";
  if (divisions.includes("Finance")) return "Finance";
  if (divisions.includes("Other") || divisions.includes("Outreach")) return "Other";
  return "—";
}

export const TRACK_SORT_ORDER: Record<TrackKey, number> = {
  Tech: 0,
  Marketing: 1,
  Finance: 2,
  Other: 3,
  "—": 4,
};

export function getTrackAvatarClasses(track: TrackKey): { bgClass: string; textClass: string } {
  switch (track) {
    // Hues follow the public site: purple Tech, peach Marketing, yellow Finance.
    case "Tech":      return { bgClass: "bg-n-purple/30",  textClass: "text-n-ink" };
    case "Marketing": return { bgClass: "bg-n-orange/30",  textClass: "text-n-ink" };
    case "Finance":   return { bgClass: "bg-n-yellow/40",  textClass: "text-n-ink" };
    case "Other":     return { bgClass: "bg-gray-100",     textClass: "text-gray-700" };
    default:          return { bgClass: "bg-[#F6B78D]/15", textClass: "text-[#F6B78D]" };
  }
}

export function TrackAvatarIcon({ track }: { track: TrackKey }) {
  if (track === "Tech") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 8L3 12L8 16" />
        <path d="M16 8L21 12L16 16" />
      </svg>
    );
  }
  if (track === "Marketing") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20l4.5-1.2L19 8.3a1.6 1.6 0 0 0 0-2.2l-1.1-1.1a1.6 1.6 0 0 0-2.2 0L5.2 15.5L4 20z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    );
  }
  if (track === "Finance") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M7 16v-4" />
        <path d="M12 16V9" />
        <path d="M17 16v-10" />
      </svg>
    );
  }
  return (
    <span className="text-[11px] font-semibold leading-none" aria-hidden="true">
      –
    </span>
  );
}

export default function TrackAvatar({ track }: { track: TrackKey }) {
  const { bgClass, textClass } = getTrackAvatarClasses(track);
  return (
    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${textClass}`}>
      <TrackAvatarIcon track={track} />
    </span>
  );
}
