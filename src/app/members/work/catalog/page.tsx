"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeAssignments, subscribeAssignmentClaims, subscribeBusinesses,
  subscribeCycles, subscribeTeam,
  type Assignment, type AssignmentClaim, type Business, type Cycle, type CycleRole, type CycleTrack, type TeamMember,
} from "@/lib/members/storage";
import { classifyMember, pickPrimaryTrack } from "@/lib/members/cycleCompute";
import { ALL_TRACKS, TRACK_DOT, CYCLE_ROLES } from "@/lib/members/constants";

// ── Track SVG icons ───────────────────────────────────────────────────────────

function TrackIcon({ track, className = "w-4 h-4" }: { track: CycleTrack; className?: string }) {
  if (track === "Tech") return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 6L3 10l4 4M13 6l4 4-4 4M11.5 4.5l-3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (track === "Marketing") return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4.5v11M15 4.5C12 4.5 9 6.5 6 6.5H5a2.5 2.5 0 000 5h1c3 0 6 2 9 2M6 11.5v3.5a1 1 0 001 1h1a1 1 0 001-1v-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (track === "Finance") return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 14l4-4.5 3.5 3 4-5.5 2.5 2M3 17h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  // General — stylized Volta lightning bolt
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 2L5.5 10.5H9.5L7 18l8.5-9.5H11.5L14 2H11z" fill="currentColor"/>
    </svg>
  );
}

const TRACK_COLOR: Record<CycleTrack, string> = {
  Tech:      "text-blue-400",
  Marketing: "text-lime-400",
  Finance:   "text-amber-400",
  General:   "text-[#85CC17]",
};

const TRACK_ICON_BG: Record<CycleTrack, string> = {
  Tech:      "bg-blue-500/10 border-blue-500/20",
  Marketing: "bg-lime-500/10 border-lime-500/20",
  Finance:   "bg-amber-500/10 border-amber-500/20",
  General:   "bg-[#85CC17]/10 border-[#85CC17]/20",
};

const TRACK_PILL_DARK: Record<CycleTrack, string> = {
  Tech:      "border-blue-400/30 bg-blue-400/10 text-blue-300",
  Marketing: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  Finance:   "border-amber-400/30 bg-amber-400/10 text-amber-300",
  General:   "border-[#85CC17]/30 bg-[#85CC17]/10 text-[#9BE22B]",
};

// ── Assignment card ───────────────────────────────────────────────────────────

interface CardProps {
  assignment: Assignment;
  taken: number;
  alreadyClaimed: boolean;
  claimStatus?: string;
  onClick: () => void;
}

function AssignmentCard({ assignment: a, taken, alreadyClaimed, claimStatus, onClick }: CardProps) {
  const track      = (a.track ?? a.primaryTrack ?? "General") as CycleTrack;
  const isUnlimited = a.capacity === 0;
  const isFull      = !isUnlimited && taken >= a.capacity;
  const pct         = isUnlimited ? 0 : Math.min(taken / a.capacity, 1);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-2xl border bg-[#13161D] flex flex-col transition-all duration-200 overflow-hidden
        ${isFull
          ? "opacity-45 border-white/5 cursor-default"
          : a.priority
            ? "border-l-4 border-l-amber-400 border-t-amber-400/20 border-r-amber-400/20 border-b-amber-400/20 hover:border-l-amber-400 hover:bg-[#151A1E] hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
            : "border-white/8 hover:border-[#85CC17]/35 hover:bg-[#151A1E] hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5"
        }`}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Track icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${TRACK_ICON_BG[track]}`}>
            <TrackIcon track={track} className={`w-4 h-4 ${TRACK_COLOR[track]}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-[13px] font-bold leading-snug ${isFull ? "text-white/40" : "text-white/90 group-hover:text-white"} transition-colors`}>
              {a.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL_DARK[track]}`}>
                {track}
              </span>
              {a.priority && !isFull && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  ⚡ Priority
                </span>
              )}
              {a.requiresApproval === false && (
                <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  ✓ Auto-approved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Credits badge */}
        <div className={`flex-shrink-0 text-right ${isFull ? "opacity-40" : ""}`}>
          <p className="text-[17px] font-bold text-[#85CC17] leading-none tabular-nums">+{a.credits}</p>
          <p className="text-[9px] text-[#85CC17]/60 uppercase tracking-wider mt-0.5">
            {a.recurringEnabled ? "/ check-in" : a.credits === 1 ? "credit" : "credits"}
          </p>
        </div>
      </div>

      {/* Description */}
      {a.description && (
        <div className="px-4 pb-3">
          <p className={`text-[11px] leading-relaxed line-clamp-2 ${isFull ? "text-white/25" : "text-white/45"}`}>
            {a.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-4 pb-4 space-y-2.5">
        {/* Capacity bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-medium ${isFull ? "text-white/25" : "text-white/40"}`}>
              {isUnlimited
                ? "Open to all"
                : isFull
                  ? "Full"
                  : `${taken} / ${a.capacity} claimed`}
            </span>
            {alreadyClaimed && !isFull && (
              <span className="text-[10px] font-semibold text-[#85CC17]/80">
                {claimStatus === "Submitted" ? "✓ Submitted" : claimStatus === "Approved" ? "✓ Done" : "✓ In Progress"}
              </span>
            )}
            {isFull && (
              <span className="text-[10px] font-semibold text-white/30">Closed</span>
            )}
          </div>
          {!isUnlimited && (
            <div className="h-1 rounded-full bg-white/8 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-white/20" : "bg-[#85CC17]"}`}
                style={{ width: `${Math.max(pct * 100, isFull ? 100 : 0)}%` }}
              />
            </div>
          )}
        </div>

        {/* Deadline / recurring */}
        <div className="flex items-center gap-2 flex-wrap">
          {a.recurringEnabled && a.checkinIntervalDays && (
            <span className="text-[10px] text-amber-400/70">↻ Every {a.checkinIntervalDays}d</span>
          )}
          {!a.recurringEnabled && (() => {
            const d = a.deadlines?.[0]?.date ?? a.deadline ?? "";
            if (!d) return null;
            const days = Math.round((Date.parse(d) - Date.now()) / 86400000);
            return (
              <span className={`text-[10px] ${days <= 3 ? "text-orange-400/80" : "text-white/30"}`}>
                {days <= 0 ? "Overdue" : `Due in ${days}d`}
              </span>
            );
          })()}
          {a.applicationRequired && (
            <span className="text-[10px] text-blue-400/70">✉ Apply first</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Slide-over drawer ─────────────────────────────────────────────────────────

interface DrawerProps {
  assignment: Assignment | null;
  claimList: AssignmentClaim[];
  business: Business | undefined;
  me: TeamMember | null;
  open: boolean;
  onClose: () => void;
}

function AssignmentDrawer({ assignment: a, claimList, business, me, open, onClose }: DrawerProps) {
  const track = ((a?.track ?? a?.primaryTrack ?? "General") as CycleTrack);
  const activeClaims = claimList.filter((c) => c.status !== "rejected");
  const taken = activeClaims.length;
  const isUnlimited = !a || a.capacity === 0;
  const isFull = !isUnlimited && taken >= (a?.capacity ?? 0);
  const pct = (a && !isUnlimited) ? Math.min(taken / a.capacity, 1) : 0;
  const myClaim = a ? claimList.find((c) => c.memberId === me?.id && c.status !== "rejected") : null;
  const alreadyClaimed = !!myClaim;

  const deadline = a ? (a.deadlines?.[0]?.date ?? a.deadline ?? "") : "";
  const deadlineDays = deadline ? Math.round((Date.parse(deadline) - Date.now()) / 86400000) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-[#0F1117] border-l border-white/8 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {!a ? null : (
          <>
            {/* Drawer header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${TRACK_ICON_BG[track]}`}>
                  <TrackIcon track={track} className={`w-5 h-5 ${TRACK_COLOR[track]}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TRACK_PILL_DARK[track]}`}>{track}</span>
                    {a.priority && <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">⚡ Priority</span>}
                    {a.recurringEnabled && <span className="inline-flex items-center rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">↻ Recurring</span>}
                  </div>
                  <h2 className="text-[15px] font-bold text-white/95 leading-snug">{a.title}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 flex items-center justify-center transition-colors mt-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Business */}
              {business && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/40">Project:</span>
                  <span className="text-white/85 font-medium">{business.name}</span>
                  {business.neighborhood && <span className="text-white/35">· {business.neighborhood}</span>}
                </div>
              )}

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {a.requiresApproval === false && (
                  <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/8 px-3 py-1 text-[11px] font-semibold text-emerald-300">✓ Auto-approved — no review needed</span>
                )}
                {a.applicationRequired && (
                  <span className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-400/8 px-3 py-1 text-[11px] font-semibold text-blue-300">✉ Pre-approval required</span>
                )}
                {a.allowMultipleCompletions && (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/50">Repeatable</span>
                )}
              </div>

              {/* Description */}
              {a.description && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Description</p>
                  <div
                    className="text-[13px] text-white/65 leading-relaxed prose-invert"
                    dangerouslySetInnerHTML={{ __html: a.description }}
                  />
                </div>
              )}

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-1">Credits</p>
                  <p className="text-[22px] font-bold text-[#85CC17] leading-none tabular-nums">+{a.credits}</p>
                  {a.recurringEnabled && <p className="text-[10px] text-[#85CC17]/55 mt-0.5">per check-in</p>}
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-1">Min Role</p>
                  <p className="text-[14px] font-semibold text-white/80">{a.minRole}</p>
                </div>
                {a.estimatedHours > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-1">Est. Time</p>
                    <p className="text-[14px] font-semibold text-white/80">~{a.estimatedHours}h</p>
                  </div>
                )}
                {deadline && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-1">Deadline</p>
                    <p className={`text-[13px] font-semibold ${deadlineDays != null && deadlineDays <= 3 ? "text-orange-400" : "text-white/80"}`}>
                      {new Date(deadline + (deadline.includes("T") ? "" : "T00:00:00")).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                    {deadlineDays != null && (
                      <p className={`text-[10px] mt-0.5 ${deadlineDays <= 0 ? "text-red-400" : deadlineDays <= 3 ? "text-orange-400/70" : "text-white/30"}`}>
                        {deadlineDays <= 0 ? `${Math.abs(deadlineDays)}d overdue` : `${deadlineDays}d left`}
                      </p>
                    )}
                  </div>
                )}
                {a.recurringEnabled && a.checkinIntervalDays && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-1">Check-in</p>
                    <p className="text-[14px] font-semibold text-amber-400">Every {a.checkinIntervalDays}d</p>
                  </div>
                )}
              </div>

              {/* Capacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Capacity</p>
                  <p className={`text-[11px] font-medium ${isFull ? "text-white/40" : "text-white/55"}`}>
                    {isUnlimited ? "Unlimited — open to all" : `${taken} / ${a.capacity} claimed`}
                  </p>
                </div>
                {!isUnlimited && (
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? "bg-white/25" : "bg-[#85CC17]"}`}
                      style={{ width: `${Math.max(pct * 100, isFull ? 100 : 0)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Current claimants */}
              {activeClaims.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
                    Current Claimants · {activeClaims.length}
                  </p>
                  <div className="space-y-1.5">
                    {activeClaims.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/6 px-3 py-2">
                        <span className="text-[12px] text-white/70 font-medium">{c.memberName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          c.status === "Submitted" ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" :
                          c.status === "Approved"  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
                          "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                        }`}>
                          {c.status === "claimed" ? "In Progress" : c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* CTA footer */}
            <div className="px-6 py-5 border-t border-white/8 space-y-2">
              {alreadyClaimed ? (
                <Link
                  href={`/members/work/${a.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#85CC17]/15 border border-[#85CC17]/30 text-[#9BE22B] font-semibold py-3 text-sm hover:bg-[#85CC17]/25 transition-colors"
                >
                  View My Submission →
                </Link>
              ) : isFull ? (
                <div className="flex items-center justify-center w-full rounded-xl bg-white/5 border border-white/10 text-white/30 font-semibold py-3 text-sm cursor-not-allowed">
                  Assignment Full
                </div>
              ) : (
                <Link
                  href={`/members/work/${a.id}`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#85CC17] text-[#0D0D0D] font-bold py-3 text-sm hover:bg-[#96D920] transition-colors"
                >
                  Claim Assignment →
                </Link>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-full text-[12px] text-white/30 hover:text-white/55 transition-colors py-1"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label, sub, count }: { label: string; sub: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-[15px] font-bold text-white/85">{label}</h2>
      {sub && <span className="text-[12px] text-white/35">{sub}</span>}
      <span className="ml-auto text-[11px] text-white/30 font-medium tabular-nums">
        {count} assignment{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Mock data (development preview) ──────────────────────────────────────────

const MOCK: Assignment[] = [
  {
    id: "mock-1", title: "SEO Audit & Keyword Strategy", track: "Marketing" as CycleTrack,
    credits: 3, status: "Open", minRole: "Analyst", capacity: 2, priority: false,
    requiresApproval: true, applicationRequired: false, allowMultipleCompletions: false,
    recurringEnabled: false, description: "<p>Conduct a full SEO audit of the business website and deliver a prioritized keyword strategy with actionable recommendations for on-page improvements.</p>",
    cycleId: "", createdBy: "mock", createdAt: "", updatedAt: "", notes: "", estimatedHours: 4,
    deadlines: [], deadlineType: "hard", difficulty: "Standard",
  },
  {
    id: "mock-2", title: "Financial Model & Projections", track: "Finance" as CycleTrack,
    credits: 5, status: "Open", minRole: "Senior Analyst", capacity: 1, priority: true,
    requiresApproval: true, applicationRequired: false, allowMultipleCompletions: false,
    recurringEnabled: false, description: "<p>Build a 3-year financial model with revenue projections, cost structure, and unit economics. Deliver in Google Sheets with an executive summary.</p>",
    cycleId: "", createdBy: "mock", createdAt: "", updatedAt: "", notes: "", estimatedHours: 8,
    deadlines: [], deadlineType: "hard", difficulty: "Standard",
  },
  {
    id: "mock-3", title: "Website Redesign Mockup", track: "Tech" as CycleTrack,
    credits: 4, status: "Active", minRole: "Analyst", capacity: 1, priority: false,
    requiresApproval: false, applicationRequired: false, allowMultipleCompletions: false,
    recurringEnabled: false, description: "<p>Create high-fidelity Figma mockups for a redesigned homepage and product page based on the brand guidelines provided.</p>",
    cycleId: "", createdBy: "mock", createdAt: "", updatedAt: "", notes: "", estimatedHours: 6,
    deadlines: [], deadlineType: "hard", difficulty: "Standard",
  },
  {
    id: "mock-4", title: "Monthly Social Media Calendar", track: "Marketing" as CycleTrack,
    credits: 2, status: "Open", minRole: "Analyst", capacity: 0, priority: false,
    requiresApproval: false, applicationRequired: false, allowMultipleCompletions: true,
    recurringEnabled: true, checkinIntervalDays: 30,
    description: "<p>Plan and schedule one month of social media content across Instagram and LinkedIn. Includes copy, creative direction, and posting schedule.</p>",
    cycleId: "", createdBy: "mock", createdAt: "", updatedAt: "", notes: "", estimatedHours: 3,
    deadlines: [], deadlineType: "hard", difficulty: "Standard",
  },
  {
    id: "mock-5", title: "Grant Research & Applications", track: "Finance" as CycleTrack,
    credits: 4, status: "Open", minRole: "Associate", capacity: 2, priority: false,
    requiresApproval: true, applicationRequired: true, allowMultipleCompletions: false,
    recurringEnabled: false, description: "<p>Identify 3–5 relevant grant opportunities and draft at least one application. Contact the board before claiming — coordination required.</p>",
    cycleId: "", createdBy: "mock", createdAt: "", updatedAt: "", notes: "", estimatedHours: 10,
    deadlines: [], deadlineType: "hard", difficulty: "Standard",
  },
];

// ── Main page ─────────────────────────────────────────────────────────────────

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

interface AssignmentGroup {
  key: string;
  label: string;
  sub: string;
  all: Assignment[];
  available: Assignment[];
  full: Assignment[];
}

export default function CatalogPage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [cycles, setCycles]         = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [claims, setClaims]         = useState<AssignmentClaim[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [search, setSearch]           = useState("");
  const [trackFilters, setTrackFilters] = useState<Set<CycleTrack>>(new Set());
  const [roleFilters, setRoleFilters]   = useState<Set<CycleRole>>(new Set());
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const trackInitRef = useRef(false);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => {
    const u1 = subscribeCycles(setCycles);
    const u2 = subscribeAssignments(setAssignments);
    const u3 = subscribeAssignmentClaims(setClaims);
    const u4 = subscribeBusinesses(setBusinesses);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  const activeCycle   = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);
  const primaryTrack  = me ? pickPrimaryTrack(me) : null;
  const classification = me ? classifyMember(me) : null;
  const businessById  = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);

  // Pre-select primary track on first load
  useEffect(() => {
    if (trackInitRef.current || !primaryTrack) return;
    trackInitRef.current = true;
    setTrackFilters(new Set([primaryTrack, "General" as CycleTrack]));
  }, [primaryTrack]);

  const claimsByAssignment = useMemo(() => {
    const map = new Map<string, AssignmentClaim[]>();
    for (const c of claims) {
      const list = map.get(c.assignmentId) ?? [];
      list.push(c);
      map.set(c.assignmentId, list);
    }
    return map;
  }, [claims]);

  const myApprovedAssignmentIds = useMemo(() => {
    if (!me) return new Set<string>();
    return new Set(claims.filter((c) => c.memberId === me.id && c.status === "Approved").map((c) => c.assignmentId));
  }, [claims, me]);

  const myClaimedIds = useMemo(() => {
    if (!me) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const c of claims) {
      if (c.memberId === me.id && c.status !== "rejected") map.set(c.assignmentId, c.status);
    }
    return map;
  }, [claims, me]);

  const toggleTrack = useCallback((t: CycleTrack) => {
    setTrackFilters((p) => { const n = new Set(p); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  }, []);

  const toggleRole = useCallback((r: CycleRole) => {
    setRoleFilters((p) => { const n = new Set(p); if (n.has(r)) n.delete(r); else n.add(r); return n; });
  }, []);

  // Base candidates (status + cycle + completion filters — NOT search or track)
  const candidates = useMemo(() => {
    return assignments
      .filter((a) => !activeCycle || !a.cycleId || a.cycleId === activeCycle.id)
      .filter((a) => a.status === "Open" || a.status === "Active")
      .filter((a) => !myApprovedAssignmentIds.has(a.id) || a.allowMultipleCompletions === true);
  }, [assignments, activeCycle, myApprovedAssignmentIds]);

  // Build all groups (before search filter, so search operates at group level)
  const allGroups = useMemo((): AssignmentGroup[] => {
    const map = new Map<string, AssignmentGroup>();

    for (const a of candidates) {
      // Per-assignment track + role filter
      if (trackFilters.size > 0 && !trackFilters.has((a.track ?? a.primaryTrack ?? "General") as CycleTrack)) continue;
      if (roleFilters.size > 0 && !roleFilters.has(a.minRole as CycleRole)) continue;

      const key = a.businessId ?? "volta";
      if (!map.has(key)) {
        const biz = a.businessId ? businessById.get(a.businessId) : undefined;
        map.set(key, {
          key,
          label: biz?.name ?? "Volta Internal",
          sub: biz?.neighborhood ?? "",
          all: [],
          available: [],
          full: [],
        });
      }
      const g = map.get(key)!;
      g.all.push(a);
      const taken = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
      const isUnlimited = a.capacity === 0;
      const isFull = !isUnlimited && taken >= a.capacity;
      if (isFull) g.full.push(a); else g.available.push(a);
    }

    return [...map.values()].sort((a, b) => {
      if (a.key === "volta") return -1;
      if (b.key === "volta") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [candidates, trackFilters, roleFilters, businessById, claimsByAssignment]);

  // Search filters at GROUP level — shows all assignments in matching groups
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter(
      (g) => g.label.toLowerCase().includes(q) || g.sub.toLowerCase().includes(q),
    );
  }, [allGroups, search]);

  const totalCount = groups.reduce((s, g) => s + g.all.length, 0);
  const isLeadership = classification?.status === "leadership";
  const isReserve    = classification?.status === "reserve";

  // Use live data, fall back to mock when no assignments are loaded yet
  const displayGroups = assignments.length === 0
    ? [{
        key: "mock", label: "Sample Project", sub: "East Village", all: MOCK,
        available: MOCK.filter((a) => a.capacity === 0 || 0 < a.capacity),
        full: [],
      }]
    : groups;

  const selectedBusiness = selectedAssignment?.businessId
    ? businessById.get(selectedAssignment.businessId)
    : undefined;
  const selectedClaims = selectedAssignment ? (claimsByAssignment.get(selectedAssignment.id) ?? []) : [];

  return (
    <MembersLayout>
      {/* ── Command Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-[#0D0F14]/95 backdrop-blur-md border-b border-white/6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full bg-white/[0.05] border border-white/8 rounded-lg pl-8 pr-3 py-2 text-[13px] text-white/85 placeholder-white/25 focus:outline-none focus:border-[#85CC17]/40 focus:bg-white/[0.07]"
            />
          </div>

          {/* Track filters */}
          <div className="flex items-center gap-1.5">
            {ALL_TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTrack(t)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  trackFilters.has(t)
                    ? `${TRACK_PILL_DARK[t]} border-opacity-60`
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/65 hover:border-white/20"
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${TRACK_DOT[t]}`} />
                {t}
              </button>
            ))}
          </div>

          {/* Role filters */}
          <div className="flex items-center gap-1.5">
            {(CYCLE_ROLES as readonly CycleRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  roleFilters.has(r)
                    ? "border-violet-400/40 bg-violet-400/10 text-violet-300"
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/65 hover:border-white/20"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Active filter summary */}
        {(trackFilters.size > 0 || roleFilters.size > 0 || search) && (
          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-white/35">
            <span>{totalCount} assignment{totalCount !== 1 ? "s" : ""} across {groups.length} project{groups.length !== 1 ? "s" : ""}</span>
            {(trackFilters.size > 0 || roleFilters.size > 0 || search) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setTrackFilters(new Set()); setRoleFilters(new Set()); }}
                className="text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-10">

        {(isLeadership || isReserve) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300/80">
            {isLeadership
              ? "You're on leadership — assignments are read-only for you."
              : "Your account isn't active in the credit system — claiming is disabled."}
          </div>
        )}

        {displayGroups.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#13161D] p-10 text-center">
            <p className="text-sm text-white/35">
              {search ? `No projects match "${search}".` : "No assignments available right now."}
            </p>
          </div>
        ) : (
          displayGroups.map((group) => (
            <section key={group.key}>
              <GroupHeader label={group.label} sub={group.sub} count={group.all.length} />

              {/* Available cards */}
              {group.available.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                  {group.available.map((a) => {
                    const taken   = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
                    const status  = myClaimedIds.get(a.id);
                    return (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        taken={taken}
                        alreadyClaimed={myClaimedIds.has(a.id)}
                        claimStatus={status}
                        onClick={() => setSelectedAssignment(a)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Full / closed cards pushed to the bottom */}
              {group.full.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.full.map((a) => {
                    const taken = (claimsByAssignment.get(a.id) ?? []).filter((c) => c.status !== "rejected").length;
                    return (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        taken={taken}
                        alreadyClaimed={false}
                        onClick={() => setSelectedAssignment(a)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      {/* ── Slide-over drawer ───────────────────────────────────────────── */}
      <AssignmentDrawer
        assignment={selectedAssignment}
        claimList={selectedClaims}
        business={selectedBusiness}
        me={me}
        open={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </MembersLayout>
  );
}
