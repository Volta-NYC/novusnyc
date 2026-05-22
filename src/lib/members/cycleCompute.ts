// Pure-function helpers for the credit/strike system. Anything that takes
// cycle + ledger inputs and produces a number, a color, or a status decision
// belongs here so UI components stay thin and the rules are testable.

import type {
  AssignmentClaim,
  Cycle,
  CycleRole,
  CycleTrack,
  MemberCreditAdjustment,
  MemberStrike,
  TeamMember,
} from "@/lib/members/storage";

// ── Role mapping ──────────────────────────────────────────────────────────────
// TeamMember.role is a free-form string (legacy + admin-editable taxonomy).
// Map it to a CycleRole bucket for credit-target lookup. Sr Associate / Board
// are *not* CycleRoles — they don't participate in the credit system.

export type ParticipationStatus =
  | "participant"   // Analyst / Sr Analyst / Associate
  | "leadership"    // Senior Associate / Board — outside the system
  | "reserve"       // status === Reserve / Inactive / Alumni / On Leave
  | "unmapped";     // role string we can't classify

export function classifyMember(member: TeamMember): {
  status: ParticipationStatus;
  cycleRole: CycleRole | null;
} {
  const status = String(member.status ?? "").trim().toLowerCase();
  if (status === "reserve" || status === "inactive" || status === "alumni" || status === "on leave") {
    return { status: "reserve", cycleRole: null };
  }
  const role = String(member.role ?? "").trim().toLowerCase();
  if (role === "analyst") return { status: "participant", cycleRole: "Analyst" };
  if (role === "senior analyst") return { status: "participant", cycleRole: "Senior Analyst" };
  if (role === "associate") return { status: "participant", cycleRole: "Associate" };
  if (role === "senior associate" || role === "board") return { status: "leadership", cycleRole: null };
  return { status: "unmapped", cycleRole: null };
}

// ── Track mapping ─────────────────────────────────────────────────────────────
// TeamMember.divisions is a string array; pick a primary track for credit-target
// lookup. Defaults to Tech if no recognizable division is present.

export function pickPrimaryTrack(member: TeamMember): CycleTrack {
  const list = (member.divisions ?? []).map((d) => String(d ?? "").trim().toLowerCase());
  if (list.includes("tech")) return "Tech";
  if (list.includes("marketing")) return "Marketing";
  if (list.includes("finance")) return "Finance";
  if (list.includes("digital & tech") || list.includes("digital and tech")) return "Tech";
  if (list.includes("marketing & strategy")) return "Marketing";
  if (list.includes("finance & operations")) return "Finance";
  return "Tech";
}

export function lookupCreditTarget(cycle: Cycle, track: CycleTrack, role: CycleRole): number {
  // CycleCreditTargets only has Tech/Marketing/Finance; General assignments
  // don't have a per-cycle credit target.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targets = cycle.creditTargets as any;
  return (targets[track]?.[role] as number | undefined) ?? 0;
}

// ── Credit ledger ─────────────────────────────────────────────────────────────

export interface CreditLedger {
  approved: number;          // sum of approved-claim creditsAwarded
  pending: number;           // sum of submitted-claim assignment.credits
  adjustments: number;       // sum of manual ± adjustments
  total: number;             // approved + adjustments (what counts toward target)
}

export function computeCreditLedger(input: {
  claims: AssignmentClaim[];
  adjustments: MemberCreditAdjustment[];
  // Map of assignmentId → credits, used to value pending claims (claims store
  // creditsAwarded only on approval).
  assignmentCredits: Map<string, number>;
}): CreditLedger {
  let approved = 0;
  let pending = 0;
  for (const claim of input.claims) {
    if (claim.status === "Approved") {
      approved += claim.creditsAwarded ?? input.assignmentCredits.get(claim.assignmentId) ?? 0;
    } else if (claim.status === "Submitted") {
      pending += input.assignmentCredits.get(claim.assignmentId) ?? 0;
    } else if (claim.status === "In Progress" && (claim.creditsAwarded ?? 0) > 0) {
      // Recurring check-in: credits accumulate on claim while it stays In Progress.
      // creditsAwarded is updated to the running total after each approved check-in.
      approved += claim.creditsAwarded!;
    }
  }
  let adjustments = 0;
  for (const adj of input.adjustments) adjustments += adj.points || 0;
  return { approved, pending, adjustments, total: approved + adjustments };
}

// ── Strike points ─────────────────────────────────────────────────────────────

export function computeStrikePoints(strikes: MemberStrike[]): number {
  return strikes.reduce((sum, s) => sum + (s.points || 0), 0);
}

export function computeStrikeCount(points: number, cycle: Cycle): 0 | 1 | 2 | 3 {
  if (points >= cycle.strikeThresholds.reserve) return 3;
  if (points >= cycle.strikeThresholds.demotion) return 2;
  if (points >= cycle.strikeThresholds.warning) return 1;
  return 0;
}

// ── Cycle pacing & dot color ──────────────────────────────────────────────────

export type DotColor = "green" | "yellow" | "orange" | "red" | "gray";

export interface DotComputeInput {
  cycle: Cycle | null;
  member: TeamMember;
  earnedCredits: number;       // typically ledger.total
  targetCredits: number;       // from cycle creditTargets
  hasAnyClaims: boolean;       // for the "zero activity past day 28" rule
  now?: Date;
}

export interface DotResult {
  color: DotColor;
  label: string;               // e.g. "On pace" / "1 check-in behind"
  checkInsExpected: number;    // 0..6
  checkInsBehind: number;      // 0..N (capped reasonably)
  expectedPercent: number;     // 0..100
  earnedPercent: number;       // 0..100
}

export function computeDot(input: DotComputeInput): DotResult {
  const now = input.now ?? new Date();
  const statusLower = String(input.member.status ?? "").trim().toLowerCase();
  const reserveStatus = statusLower === "reserve"
    || statusLower === "inactive"
    || statusLower === "alumni"
    || statusLower === "on leave";
  if (reserveStatus) {
    return {
      color: "gray",
      label: statusLower === "reserve" ? "Reserve" : String(input.member.status),
      checkInsExpected: 0,
      checkInsBehind: 0,
      expectedPercent: 0,
      earnedPercent: 0,
    };
  }

  if (!input.cycle) {
    return {
      color: "green",
      label: "No active cycle",
      checkInsExpected: 0,
      checkInsBehind: 0,
      expectedPercent: 0,
      earnedPercent: 0,
    };
  }

  const startMs = Date.parse(input.cycle.startDate);
  const endMs = Date.parse(input.cycle.endDate);
  const validRange = Number.isFinite(startMs) && Number.isFinite(endMs);
  const nowMs = now.getTime();

  // Before cycle start, default to green.
  if (validRange && nowMs < startMs) {
    return {
      color: "green",
      label: "Cycle hasn't started yet",
      checkInsExpected: 0,
      checkInsBehind: 0,
      expectedPercent: 0,
      earnedPercent: 0,
    };
  }

  const daysSinceStart = validRange ? Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24))) : 0;
  const checkInsExpected = Math.floor(daysSinceStart / 14);
  const pacingPct = Math.max(1, input.cycle.pacingPercentPerCheckin || 20);
  const expectedPercent = Math.min(100, checkInsExpected * pacingPct);
  const earnedPercent = input.targetCredits > 0
    ? (input.earnedCredits / input.targetCredits) * 100
    : 0;

  const rawBehind = (expectedPercent - earnedPercent) / pacingPct;
  const checkInsBehind = Math.max(0, Math.floor(rawBehind));

  // Auto-red trigger #2: past day 28, zero activity.
  const zeroActivityRed = daysSinceStart >= 28 && input.earnedCredits === 0 && !input.hasAnyClaims;

  let color: DotColor;
  let label: string;
  if (zeroActivityRed) {
    color = "red";
    label = "No activity since cycle start";
  } else if (checkInsBehind === 0) {
    color = "green";
    label = earnedPercent >= 100 ? "Target met" : "On pace";
  } else if (checkInsBehind === 1) {
    color = "yellow";
    label = "1 check-in behind";
  } else if (checkInsBehind <= 3) {
    color = "orange";
    label = `${checkInsBehind} check-ins behind`;
  } else {
    color = "red";
    label = `${checkInsBehind} check-ins behind`;
  }

  return { color, label, checkInsExpected, checkInsBehind, expectedPercent, earnedPercent };
}

// ── Role demotion path ────────────────────────────────────────────────────────
// Returns the next state when a member is auto-demoted on the demotion threshold.

export function demotionTarget(currentRole: CycleRole): { kind: "role"; role: CycleRole } | { kind: "reserve" } {
  if (currentRole === "Associate") return { kind: "role", role: "Senior Analyst" };
  if (currentRole === "Senior Analyst") return { kind: "role", role: "Analyst" };
  return { kind: "reserve" };
}

// ── Variable substitution for email templates ─────────────────────────────────
// Same {{token}} syntax used in the admin email-templates editor; substitution
// is applied to subject + body at send time.

export function substituteEmailTokens(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => data[name] ?? "");
}
