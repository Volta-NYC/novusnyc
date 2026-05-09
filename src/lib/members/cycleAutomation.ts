// Automation sweep for the credit/strike system. Runs whenever an admin loads
// the team directory: walks every active member, computes their dot color,
// fires the matching email template, and (for red) issues a one-shot auto-pace
// strike scoped to the cycle. Uses lastWarningCycleId / lastAutoStrikeCycleId
// flags on the member record to ensure at most one of each per cycle.
//
// This is *client-side* automation: trusted because it only runs in an
// authenticated admin's browser. A server-side cron is a future improvement.

import {
  createMemberStrike, updateTeamMember,
  type Assignment, type AssignmentClaim, type Cycle, type EmailTemplate,
  type Infraction, type MemberCreditAdjustment, type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeDot, lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";

// Reasonable defaults that match the email-templates page seed copy.
const DEFAULT_WARNING = {
  subject: "Heads up — you're behind pace on {{cycleName}}",
  body: "<p>Hey {{memberName}},</p><p>You're at {{creditsEarned}} of {{creditsTarget}} credits for {{cycleName}}, which puts you {{checkInsBehind}} check-ins behind pace. Please claim something from the marketplace soon.</p>",
};
const DEFAULT_STRIKE = {
  subject: "Strike issued — {{cycleName}}",
  body: "<p>Hi {{memberName}},</p><p>An automatic strike was issued: <strong>{{strikeReason}}</strong>.</p><p>Current standing: {{creditsEarned}} of {{creditsTarget}} credits, {{strikeCount}} strikes total.</p>",
};
const DEFAULT_BIWEEKLY = {
  subject: "{{cycleName}} — biweekly check-in",
  body: "<p>Hey {{memberName}},</p><p>Quick biweekly check-in for {{cycleName}}. You're currently at <strong>{{creditsEarned}} of {{creditsTarget}}</strong> credits.</p><p>Aim for ~{{pacingPercent}}% of your target every two weeks. Browse the marketplace on the portal for available work.</p>",
};

export interface SweepInput {
  team: TeamMember[];
  cycles: Cycle[];
  assignments: Assignment[];
  claims: AssignmentClaim[];
  strikes: MemberStrike[];
  adjustments: MemberCreditAdjustment[];
  templates: EmailTemplate[];
  infractions: Infraction[];
  idToken: string;
  reviewerLabel: string;        // e.g. "system (auto)"
  now?: Date;
}

export interface SweepReport {
  warningsSent: number;
  strikesIssued: number;
  biweeklyEmailsSent: number;
  errors: string[];
}

// Find an infraction in the catalog whose name suggests it's the auto-pace
// trigger. We match leniently on common substrings; admins can rename the
// infraction without breaking automation as long as it's still tagged active.
function findAutoPaceInfraction(infractions: Infraction[]): Infraction | null {
  // Prefer one that explicitly mentions "pace"
  const paceMatch = infractions.find((i) => /pace/i.test(i.name) || /pace/i.test(i.description));
  if (paceMatch) return paceMatch;
  // Fall back to the highest-severity infraction (max points = most severe)
  return [...infractions].sort((a, b) => b.points - a.points)[0] ?? null;
}

export async function runCycleSweep(input: SweepInput): Promise<SweepReport> {
  const report: SweepReport = { warningsSent: 0, strikesIssued: 0, biweeklyEmailsSent: 0, errors: [] };
  const cycle = input.cycles.find((c) => c.active);
  if (!cycle) return report;

  // Compute the current biweekly mark (0 = days 0–13, 1 = 14–27, …) so the
  // sweep can fire reminders exactly once per mark per member.
  const startMs = Date.parse(cycle.startDate);
  const now = input.now ?? new Date();
  const daysSinceStart = Number.isFinite(startMs)
    ? Math.max(0, Math.floor((now.getTime() - startMs) / (1000 * 60 * 60 * 24)))
    : 0;
  const currentBiweeklyMark = Math.floor(daysSinceStart / 14);

  const credits = new Map<string, number>();
  for (const a of input.assignments) credits.set(a.id, a.credits);

  const autoPaceInfraction = findAutoPaceInfraction(input.infractions);

  for (const member of input.team) {
    const classification = classifyMember(member);
    if (classification.status !== "participant") continue;
    if (!member.email) continue;

    const memberClaims = input.claims.filter((c) => c.memberId === member.id && c.cycleId === cycle.id);
    const memberAdjustments = input.adjustments.filter((a) => a.memberId === member.id && a.cycleId === cycle.id);
    const memberStrikes = input.strikes.filter((s) => s.memberId === member.id && s.cycleId === cycle.id);

    const ledger = computeCreditLedger({ claims: memberClaims, adjustments: memberAdjustments, assignmentCredits: credits });
    const primaryTrack = pickPrimaryTrack(member);
    const target = classification.cycleRole ? lookupCreditTarget(cycle, primaryTrack, classification.cycleRole) : 0;
    const dot = computeDot({
      cycle,
      member,
      earnedCredits: ledger.total,
      targetCredits: target,
      hasAnyClaims: memberClaims.length > 0,
      now: input.now,
    });

    const strikeCount = memberStrikes.length;
    const variables: Record<string, string> = {
      memberName: member.name,
      cycleName: cycle.name,
      creditsEarned: String(ledger.total),
      creditsTarget: String(target),
      checkInsBehind: String(dot.checkInsBehind),
      daysRemaining: "—",
      strikeReason: dot.label,
      strikeCount: String(strikeCount + 1),
    };

    // Biweekly check-in reminder — fires exactly once per 14-day mark per
    // member, and resets when the cycle changes. Skipped at mark 0 since the
    // cycle-start announcement covers that window.
    const memberMark = member.lastBiweeklyCheckinCycleId === cycle.id
      ? (member.lastBiweeklyCheckinMark ?? -1)
      : -1;
    if (currentBiweeklyMark > 0 && currentBiweeklyMark > memberMark) {
      const result = await dispatchTemplatedEmail({
        templates: input.templates,
        templateKey: "biweekly_checkin",
        fallback: DEFAULT_BIWEEKLY,
        toEmail: member.email,
        variables: {
          ...variables,
          pacingPercent: String(cycle.pacingPercentPerCheckin),
        },
        idToken: input.idToken,
      });
      if (result.ok) {
        await updateTeamMember(member.id, {
          lastBiweeklyCheckinMark: currentBiweeklyMark,
          lastBiweeklyCheckinCycleId: cycle.id,
        });
        report.biweeklyEmailsSent += 1;
      } else if (result.error) {
        report.errors.push(`biweekly ${member.name}: ${result.error}`);
      }
    }

    // Orange → warning email, once per cycle
    if (dot.color === "orange" && member.lastWarningCycleId !== cycle.id) {
      const result = await dispatchTemplatedEmail({
        templates: input.templates,
        templateKey: "orange_pace_warning",
        fallback: DEFAULT_WARNING,
        toEmail: member.email,
        variables,
        idToken: input.idToken,
      });
      if (result.ok) {
        await updateTeamMember(member.id, { lastWarningCycleId: cycle.id });
        report.warningsSent += 1;
      } else if (result.error) {
        report.errors.push(`warn ${member.name}: ${result.error}`);
      }
    }

    // Red → auto-pace strike + email, once per cycle
    if (dot.color === "red" && member.lastAutoStrikeCycleId !== cycle.id) {
      if (autoPaceInfraction) {
        await createMemberStrike({
          memberId: member.id,
          memberName: member.name,
          cycleId: cycle.id,
          infractionId: autoPaceInfraction.id,
          infractionName: autoPaceInfraction.name,
          points: autoPaceInfraction.points,
          issuedBy: input.reviewerLabel,
          note: dot.label,
          source: "auto_pace",
        });
        report.strikesIssued += 1;
      }
      const result = await dispatchTemplatedEmail({
        templates: input.templates,
        templateKey: "red_pace_strike",
        fallback: DEFAULT_STRIKE,
        toEmail: member.email,
        variables,
        idToken: input.idToken,
      });
      if (!result.ok && result.error) {
        report.errors.push(`strike ${member.name}: ${result.error}`);
      }
      await updateTeamMember(member.id, { lastAutoStrikeCycleId: cycle.id });
    }
  }

  return report;
}
