export const AUTOMATIC_DEMERITS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AUTOMATIC_DEMERITS === "true";

const AUTOMATIC_DEMERIT_AUTOMATION_IDS = new Set<string>([
  "cycle_warning",
  "cycle_strike",
]);

export function isAutomaticDemeritAutomation(automationId: string): boolean {
  return AUTOMATIC_DEMERIT_AUTOMATION_IDS.has(automationId);
}
