// Class-of-YYYY is the student's high-school graduation year. Earlier versions
// stored projected college graduation year. Callers that know a record is
// legacy can convert those values by subtracting four years.

export const CLASS_GRADE_OPTIONS = [
  "Class of 2022",
  "Class of 2023",
  "Class of 2024",
  "Class of 2025",
  "Class of 2026",
  "Class of 2027",
  "Class of 2028",
  "Class of 2029",
  "Class of 2030",
] as const;

const LEGACY_GRADE_TO_CLASS: Record<string, string> = {
  freshman: "Class of 2029",
  sophomore: "Class of 2028",
  junior: "Class of 2027",
  senior: "Class of 2026",
  "high school freshman": "Class of 2029",
  "high school sophomore": "Class of 2028",
  "high school junior": "Class of 2027",
  "high school senior": "Class of 2026",
  "college freshman": "Class of 2025",
  "college sophomore": "Class of 2024",
  "college junior": "Class of 2023",
  "college senior": "Class of 2022",
};

function classYearFromValue(value: string): number | null {
  const match = value.match(/^class of\s+(\d{4})$/i);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

// Convert any stored grade string to high-school class-of-YYYY. Unknown values
// pass through so we do not silently wipe data.
export function gradeToClassOf(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const mapped = LEGACY_GRADE_TO_CLASS[raw.toLowerCase()];
  if (mapped) return mapped;
  const classYear = classYearFromValue(raw);
  if (classYear && classYear > 2030) return `Class of ${classYear - 4}`;
  return raw;
}

export function collegeClassToHighSchoolClass(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  const classYear = classYearFromValue(raw);
  return classYear ? `Class of ${classYear - 4}` : gradeToClassOf(raw);
}

// True iff the stored grade should be rewritten to high-school class-of-YYYY.
// Used by one-time migrations to decide whether to write through.
export function isLegacyGrade(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw in LEGACY_GRADE_TO_CLASS) return true;
  const classYear = classYearFromValue(raw);
  return !!classYear && classYear >= 2026 && classYear <= 2034;
}
