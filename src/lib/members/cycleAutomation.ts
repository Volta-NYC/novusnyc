// Automation sweep for the credit/strike system. Runs whenever an admin loads
// the team directory: walks every active member, computes their dot color,
// and sends the non-demerit cycle reminders. Automatic demerit warnings and
// auto-pace strikes are additionally gated by AUTOMATIC_DEMERITS_ENABLED.
// Uses lastWarningCycleId / lastAutoStrikeCycleId flags on the member record
// to ensure at most one of each per cycle when that system is enabled.
//
// This is *client-side* automation: trusted because it only runs in an
// authenticated admin's browser. A server-side cron is a future improvement.

import {
  createMemberStrike, updateTeamMember,
  type Assignment, type AssignmentClaim, type AutomationConfig, type Cycle,
  type EmailTemplate, type Infraction, type MemberCreditAdjustment,
  type MemberStrike, type TeamMember,
} from "@/lib/members/storage";
import {
  classifyMember, computeCreditLedger, computeDot, lookupCreditTarget, pickPrimaryTrack,
} from "@/lib/members/cycleCompute";
import { AUTOMATIC_DEMERITS_ENABLED } from "@/lib/members/automaticDemerits";
import { dispatchTemplatedEmail } from "@/lib/members/emailDispatch";

export interface SweepInput {
  team: TeamMember[];
  cycles: Cycle[];
  assignments: Assignment[];
  claims: AssignmentClaim[];
  strikes: MemberStrike[];
  adjustments: MemberCreditAdjustment[];
  templates: EmailTemplate[];
  automationConfigs: AutomationConfig[];
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

function findAutoPaceInfraction(infractions: Infraction[]): Infraction | null {
  const paceMatch = infractions.find((i) => /pace/i.test(i.name) || /pace/i.test(i.description));
  if (paceMatch) return paceMatch;
  return [...infractions].sort((a, b) => b.points - a.points)[0] ?? null;
}

export async function runCycleSweep(input: SweepInput): Promise<SweepReport> {
  const report: SweepReport = { warningsSent: 0, strikesIssued: 0, biweeklyEmailsSent: 0, errors: [] };
  const cycle = input.cycles.find((c) => c.active);
  if (!cycle) return report;

  const startMs = Date.parse(cycle.startDate);
  const now = input.now ?? new Date();
  const daysSinceStart = Number.isFinite(startMs)
    ? Math.max(0, Math.floor((now.getTime() - startMs) / (1000 * 60 * 60 * 24)))
    : 0;
  const currentBiweeklyMark = Math.floor(daysSinceStart / 14);

  const credits = new Map<string, number>();
  for (const a of input.assignments) credits.set(a.id, a.credits);

  const autoPaceInfraction = AUTOMATIC_DEMERITS_ENABLED
    ? findAutoPaceInfraction(input.infractions)
    : null;

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

    const memberMark = member.lastBiweeklyCheckinCycleId === cycle.id
      ? (member.lastBiweeklyCheckinMark ?? -1)
      : -1;
    if (currentBiweeklyMark > 0 && currentBiweeklyMark > memberMark) {
      const result = await dispatchTemplatedEmail({
        automationId: "cycle_biweekly",
        automationConfigs: input.automationConfigs,
        templates: input.templates,
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
      } else if (result.error && result.error !== "automation_disabled" && result.error !== "no_template") {
        report.errors.push(`biweekly ${member.name}: ${result.error}`);
      }
    }

    if (!AUTOMATIC_DEMERITS_ENABLED) continue;

    if (dot.color === "orange" && member.lastWarningCycleId !== cycle.id) {
      const result = await dispatchTemplatedEmail({
        automationId: "cycle_warning",
        automationConfigs: input.automationConfigs,
        templates: input.templates,
        toEmail: member.email,
        variables,
        idToken: input.idToken,
      });
      if (result.ok) {
        await updateTeamMember(member.id, { lastWarningCycleId: cycle.id });
        report.warningsSent += 1;
      } else if (result.error && result.error !== "automation_disabled" && result.error !== "no_template") {
        report.errors.push(`warn ${member.name}: ${result.error}`);
      }
    }

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
        automationId: "cycle_strike",
        automationConfigs: input.automationConfigs,
        templates: input.templates,
        toEmail: member.email,
        variables,
        idToken: input.idToken,
      });
      if (!result.ok && result.error && result.error !== "automation_disabled" && result.error !== "no_template") {
        report.errors.push(`strike ${member.name}: ${result.error}`);
      }
      await updateTeamMember(member.id, { lastAutoStrikeCycleId: cycle.id });
    }
  }

  return report;
}
