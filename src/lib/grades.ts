// Class-of-YYYY is the student's high-school graduation year.

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

const GRADE_LABEL_TO_CLASS: Record<string, string> = {
  freshman: "Class of 2029",
  sophomore: "Class of 2028",
  junior: "Class of 2027",
  senior: "Class of 2026",
  "high school freshman": "Class of 2029",
  "high school sophomore": "Class of 2028",
  "high school junior": "Class of 2027",
  "high school senior": "Class of 2026",
  "9": "Class of 2029",
  "10": "Class of 2028",
  "11": "Class of 2027",
  "12": "Class of 2026",
};

export function gradeToClassOf(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return GRADE_LABEL_TO_CLASS[raw.toLowerCase()] ?? raw;
}
