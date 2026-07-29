// Force-disabled, and deliberately no longer env-controlled. On 2026-06-24 the
// pace sweep wrote 385 strikes across 223 members inside one 5.5-minute window:
// runCycleSweep holds no lock across tabs or admins, so concurrent runs
// double-struck 162 of them, and findAutoPaceInfraction billed every strike to
// the highest-point infraction in the catalog because no entry matches /pace/.
// Setting NEXT_PUBLIC_ENABLE_AUTOMATIC_DEMERITS=true will NOT switch this back
// on — that is the point. Both defects must be fixed and this flipped by hand.
// Typed as boolean so the disabled branches still type-check as reachable.
export const AUTOMATIC_DEMERITS_ENABLED: boolean = false;

const AUTOMATIC_DEMERIT_AUTOMATION_IDS = new Set<string>([
  "cycle_warning",
  "cycle_strike",
]);

export function isAutomaticDemeritAutomation(automationId: string): boolean {
  return AUTOMATIC_DEMERIT_AUTOMATION_IDS.has(automationId);
}
