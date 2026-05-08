// Class-of-YYYY (college graduation year) replaces the legacy grade taxonomy
// (Freshman/Sophomore/Junior/Senior). Storing the graduating-class year keeps
// the value stable as a student progresses, so records don't drift each fall.
//
// The legacy → class-of mapping below is anchored to the 2025-26 academic year
// (today the user reset the taxonomy in May 2026). High-school freshmen now
// graduate college in 2033; high-school seniors in 2030. College-year labels
// map analogously. Each year a new freshman class arrives, append a new entry
// to CLASS_GRADE_OPTIONS — existing records continue to be correct as-is.

export const CLASS_GRADE_OPTIONS = [
  "Class of 2026",
  "Class of 2027",
  "Class of 2028",
  "Class of 2029",
  "Class of 2030",
  "Class of 2031",
  "Class of 2032",
  "Class of 2033",
  "Class of 2034",
] as const;

const LEGACY_GRADE_TO_CLASS: Record<string, string> = {
  freshman: "Class of 2033",
  sophomore: "Class of 2032",
  junior: "Class of 2031",
  senior: "Class of 2030",
  "college freshman": "Class of 2029",
  "college sophomore": "Class of 2028",
  "college junior": "Class of 2027",
  "college senior": "Class of 2026",
};

// Convert a stored grade string to its class-of-YYYY equivalent. Already-converted
// values pass through unchanged; unknown values (including the bare "College")
// are returned as-is so we don't silently wipe data.
export function gradeToClassOf(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("class of ")) return raw;
  const mapped = LEGACY_GRADE_TO_CLASS[raw.toLowerCase()];
  return mapped ?? raw;
}

// True iff the stored grade is a legacy label that has a known class-of mapping.
// Used by one-time migrations to decide whether to write through.
export function isLegacyGrade(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw in LEGACY_GRADE_TO_CLASS;
}
