// Class-of-YYYY is the student's high-school graduation year.

const currentYear = new Date().getFullYear();
export const CLASS_GRADE_OPTIONS = Array.from(
  { length: 10 },
  (_, index) => `Class of ${currentYear - 4 + index}`,
);

// A grade label only means a graduation year relative to the school year it was
// given in, so derive it rather than pinning it. A US school year starting in
// August means a senior in autumn 2026 graduates in 2027.
function graduationYearFor(yearsRemaining: number, now = new Date()): number {
  const schoolYearEnd = now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();  // getMonth() is 0-based: 7 is August
  return schoolYearEnd + yearsRemaining;
}

const YEARS_REMAINING: Record<string, number> = {
  freshman: 3,
  sophomore: 2,
  junior: 1,
  senior: 0,
  "high school freshman": 3,
  "high school sophomore": 2,
  "high school junior": 1,
  "high school senior": 0,
  "9": 3,
  "10": 2,
  "11": 1,
  "12": 0,
};

export function gradeToClassOf(
  value: string | null | undefined,
  referenceDate?: string | Date | null,
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const remaining = YEARS_REMAINING[raw.toLowerCase()];
  if (remaining === undefined) return raw;
  const anchor = referenceDate instanceof Date ? referenceDate : referenceDate ? new Date(referenceDate) : new Date();
  return `Class of ${graduationYearFor(remaining, Number.isNaN(anchor.getTime()) ? new Date() : anchor)}`;
}
