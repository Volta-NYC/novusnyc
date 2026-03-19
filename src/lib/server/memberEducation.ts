import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getAdminDB } from "@/lib/firebaseAdmin";

export interface EducationSnapshot {
  memberCount: number;
  highSchools: string[];
  colleges: string[];
  highSchoolCount: number;
  collegeCount: number;
  states: string[];
  stateCount: number;
}

type SchoolGroup = {
  highSchools: string[];
  colleges: string[];
};

const SCHOOL_NORMALIZATION: Record<string, string> = {
  cornell: "Cornell University",
  "brooklyn technical highschool": "Brooklyn Technical High School",
  "brooklyn technical high school": "Brooklyn Technical High School",
  "csi high school": "CSI High School for International Studies",
  "manhattan hunter science": "Manhattan Hunter Science High School",
  "manhattan hunter science highschool": "Manhattan Hunter Science High School",
  "manhattan / hunter science high school": "Manhattan Hunter Science High School",
  "manhattan hunter science high school": "Manhattan Hunter Science High School",
  "marriotts ridge high school": "Marriott's Ridge High School",
  "round rock highschool": "Round Rock High School",
  "spain park": "Spain Park High School",
  "staten island technical highschool": "Staten Island Technical High School",
  stuyvesant: "Stuyvesant High School",
  "virtual virginia academy": "Virtual Virginia Academy",
};

const EXPLICIT_COLLEGES = new Set<string>([
  "bard college",
  "cornell university",
  "new jersey institute of technology",
]);

const EXPLICIT_HIGH_SCHOOLS = new Set<string>([
  "brighton college abu dhabi",
  "bard high school early college",
  "bard highschool early college",
  "daly college",
  "high school of american studies at lehman college",
  "international academy east",
  "ps 184 shuang wen",
  "seattle voctech",
  "academy of greatness and excellence",
  "manhattan center for science and mathematics",
]);

const SCHOOL_STATE: Record<string, string> = {
  "Academy of Greatness and Excellence": "NJ",
  "Bard College": "NY",
  "Cornell University": "NY",
  "Briar Woods High School": "VA",
  "Bronx High School of Science": "NY",
  "Brooklyn Technical High School": "NY",
  "Brunswick High School": "NJ",
  "Burlingame High School": "CA",
  "Cherry Hill East High School": "NJ",
  "Coppell High School": "TX",
  "CSI High School for International Studies": "NY",
  "Garnet Valley High School": "PA",
  "Great Neck South High School": "NY",
  "Independence High School": "VA",
  "International Academy East": "MI",
  "James Madison High School": "NY",
  "Leon M. Goldstein High School for the Sciences": "NY",
  "Manhattan Center for Science and Mathematics": "NY",
  "Manhattan Hunter Science High School": "NY",
  "Marriott's Ridge High School": "MD",
  "Marvin Ridge High School": "NC",
  "Midwood High School": "NY",
  "Millburn High School": "NJ",
  "New Jersey Institute of Technology": "NJ",
  "PS 184 Shuang Wen": "NY",
  "Robbinsville High School": "NJ",
  "Round Rock High School": "TX",
  "Rouse High School": "TX",
  "Seminole High School": "FL",
  "Skyline High School": "UT",
  "South Brunswick High School": "NJ",
  "Spain Park High School": "AL",
  "Staten Island Technical High School": "NY",
  "Stuyvesant High School": "NY",
  "Syosset High School": "NY",
  "The Brooklyn Latin School": "NY",
  "Virtual Virginia Academy": "VA",
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function schoolKey(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeSchoolName(raw: string): string {
  const trimmed = normalizeWhitespace(raw);
  if (!trimmed) return "";
  if (trimmed.includes("@")) return "";

  const mapped = SCHOOL_NORMALIZATION[schoolKey(trimmed)];
  if (mapped) return mapped;

  return trimmed
    .replace(/\bhighschool\b/gi, "High School")
    .replace(/\bvoctech\b/gi, "VocTech")
    .replace(/\s+,/g, ",")
    .trim();
}

function dedupeSort(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = schoolKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function isCollegeSchool(name: string): boolean {
  const key = schoolKey(name);
  if (!key) return false;
  if (EXPLICIT_HIGH_SCHOOLS.has(key)) return false;
  if (EXPLICIT_COLLEGES.has(key)) return true;
  return /(university|college|institute of technology|community college)/i.test(name);
}

function splitSchoolTypes(schools: string[]): SchoolGroup {
  const highSchools: string[] = [];
  const colleges: string[] = [];

  for (const school of schools) {
    if (isCollegeSchool(school)) colleges.push(school);
    else highSchools.push(school);
  }

  return {
    highSchools: dedupeSort(highSchools),
    colleges: dedupeSort(colleges),
  };
}

function inferState(school: string): string {
  const mapped = SCHOOL_STATE[school];
  if (mapped) return mapped;

  const key = schoolKey(school);
  if (/(brooklyn|manhattan|bronx|queens|staten island|stuyvesant|syosset|midwood)/.test(key)) return "NY";
  return "";
}

function parseSchoolsMarkdown(markdown: string): SchoolGroup {
  const highSchools: string[] = [];
  const colleges: string[] = [];
  let section: "high" | "college" | "" = "";

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "## High Schools") {
      section = "high";
      continue;
    }
    if (trimmed === "## Colleges & Universities") {
      section = "college";
      continue;
    }
    if (!trimmed.startsWith("- ")) continue;
    const school = normalizeSchoolName(trimmed.slice(2));
    if (!school) continue;
    if (section === "college") colleges.push(school);
    else highSchools.push(school);
  }

  return {
    highSchools: dedupeSort(highSchools),
    colleges: dedupeSort(colleges),
  };
}

function buildSnapshot(memberCount: number, schools: string[]): EducationSnapshot {
  const normalized = schools
    .map(normalizeSchoolName)
    .filter(Boolean);
  const grouped = splitSchoolTypes(normalized);
  const states = dedupeSort(
    [...grouped.highSchools, ...grouped.colleges]
      .map(inferState)
      .filter(Boolean),
  );

  return {
    memberCount,
    highSchools: grouped.highSchools,
    colleges: grouped.colleges,
    highSchoolCount: grouped.highSchools.length,
    collegeCount: grouped.colleges.length,
    states,
    stateCount: states.length,
  };
}

function fallbackSnapshot(): EducationSnapshot {
  const markdown = fs.readFileSync(path.join(process.cwd(), "src/data/schools.md"), "utf8");
  const grouped = parseSchoolsMarkdown(markdown);
  const states = dedupeSort(
    [...grouped.highSchools, ...grouped.colleges]
      .map(inferState)
      .filter(Boolean),
  );

  return {
    memberCount: 0,
    highSchools: grouped.highSchools,
    colleges: grouped.colleges,
    highSchoolCount: grouped.highSchools.length,
    collegeCount: grouped.colleges.length,
    states,
    stateCount: states.length,
  };
}

export async function getMemberEducationSnapshot(): Promise<EducationSnapshot> {
  const db = getAdminDB();
  if (!db) return fallbackSnapshot();

  try {
    const [teamSnap, applicationSnap] = await Promise.all([
      db.ref("team").get(),
      db.ref("applications").get(),
    ]);
    if (!teamSnap.exists() && !applicationSnap.exists()) return fallbackSnapshot();

    const teamRows = Object.values((teamSnap.val() ?? {}) as Record<string, Record<string, unknown>>);
    const applicationRows = Object.values((applicationSnap.val() ?? {}) as Record<string, Record<string, unknown>>);

    const schools = [
      ...teamRows.map((row) => asText(row.school)),
      ...applicationRows.map((row) => asText(row.schoolName) || asText(row.school)),
    ];

    return buildSnapshot(teamRows.length, schools);
  } catch {
    return fallbackSnapshot();
  }
}
