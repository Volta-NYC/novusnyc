#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_SERVICE_ACCOUNT_PATH = "/Users/ethanzhang180/volta/secrets/firebase/volta-nyc-firebase-adminsdk-fbsvc-active.json";
const DATABASE_URL = "https://volta-nyc-default-rtdb.firebaseio.com";

const REPORT_FIRST_DRAFT_DUE = "2026-03-29";
const REPORT_FINAL_DUE = "2026-04-05";
const CASE_INTERVIEW_DUE = "2026-04-06";
const CASE_FINAL_DUE = "2026-04-13";

const REPORT_ASSIGNMENTS = [
  { member: "Angeline Chan", topic: "customer rewards and loyalty program" },
  { member: "Angelina Zvereva", topic: "digital and AI tools" },
  { member: "Yuba", topic: "how to apply for grants" },
  { member: "Ellie", topic: "city resources and BIDs" },
  { member: "Kevin", topic: "social media presence and posting" },
  { member: "Tsundruk", topic: "SEO" },
  { member: "Leena Ali", topic: "misconceptions about going digital" },
  { member: "Tiffany", topic: "how to use AI tools for repetitive tasks" },
  { member: "Shafeen", topic: "basic marketing breakdown" },
];

const CASE_STUDY_ASSIGNMENTS = [
  { teamLabel: "Stuy 1", region: "Stuyvesant", members: ["Alvin", "Bruce", "Ashley"] },
  { teamLabel: "Stuy 2", region: "Stuyvesant", members: ["Peyton", "Ryan Liu", "Melody"] },
  { teamLabel: "Stuy 3", region: "Stuyvesant", members: ["Veronika"] },
  { teamLabel: "Midwood", region: "Midwood", members: ["Tyler Tong", "Marvens Celius"] },
  { teamLabel: "Brooklyn Tech", region: "Brooklyn Tech", members: ["Chu Qi Li", "Kyra Sacheti", "Tenzin"] },
  { teamLabel: "New Jersey 1", region: "New Jersey", members: ["Rohan Guddeti", "Andrew Liu", "Kaia"] },
  { teamLabel: "Long Island", region: "Long Island", members: ["Brendon Kim"] },
  { teamLabel: "New Jersey 2", region: "New Jersey", members: ["Jay Thakkar", "Sarah Umeed", "Beverly Nguyen", "Lasyapriya Ganapathiraju"] },
  { teamLabel: "Florida", region: "Florida", members: ["Aarush Vignesh", "Aryan Katakam"] },
  { teamLabel: "Pennsylvania", region: "Pennsylvania", members: ["Shruti Sridhar"] },
  { teamLabel: "Southeast", region: "Southeast", members: ["Dallas Lewis", "Collin Bodle"] },
  { teamLabel: "California", region: "California", members: ["Kobe Wang"] },
  { teamLabel: "Virginia", region: "Virginia", members: ["Aamnah Sethi"] },
  { teamLabel: "Maryland / DC", region: "Maryland / DC", members: ["Saranya Ganti"] },
  { teamLabel: "Texas", region: "Texas", members: ["Adam Abdelmajid", "Aakanksh Ravuri"] },
  {
    teamLabel: "Manhattan Hunter",
    region: "Manhattan Hunter",
    members: ["Alaynah", "Santana", "Sarah Yagninim", "Nameera", "Leena Naji"],
  },
];

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/seedFinanceAssignments.mjs [--service-account <path>] [--dry-run|--write]",
      "",
      "Notes:",
      "  - Default mode is --dry-run",
      "  - Upserts rows into financeAssignments by seedKey",
      "  - Resolves member IDs against Team Directory names where possible",
    ].join("\n"),
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    serviceAccountPath: DEFAULT_SERVICE_ACCOUNT_PATH,
    write: false,
    dryRun: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--service-account" && args[i + 1]) {
      out.serviceAccountPath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--write") {
      out.write = true;
      out.dryRun = false;
      continue;
    }
    if (arg === "--dry-run") {
      out.write = false;
      out.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
  }

  return out;
}

function normalizeWhitespace(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeNameKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const text = value.replace(/\s+/g, "");
  if (text.length < 2) return [text];
  const out = [];
  for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
  return out;
}

function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  const counts = new Map();
  for (const gram of aBigrams) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  let overlap = 0;
  for (const gram of bBigrams) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      counts.set(gram, count - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

function similarityScore(rawKey, candidateKey) {
  if (!rawKey || !candidateKey) return 0;
  if (rawKey === candidateKey) return 1;
  if (candidateKey.includes(rawKey) || rawKey.includes(candidateKey)) return 0.95;
  return diceSimilarity(rawKey, candidateKey);
}

function shallowEqualAssignment(a, b) {
  const keys = [
    "seedKey",
    "type",
    "title",
    "topic",
    "teamLabel",
    "region",
    "deadline",
    "interviewDueDate",
    "firstDraftDueDate",
    "finalDueDate",
    "deliverableUrl",
    "status",
    "notes",
  ];
  for (const key of keys) {
    if (String(a?.[key] ?? "") !== String(b?.[key] ?? "")) return false;
  }

  const aNames = Array.isArray(a?.assignedMemberNames) ? a.assignedMemberNames : [];
  const bNames = Array.isArray(b?.assignedMemberNames) ? b.assignedMemberNames : [];
  if (aNames.length !== bNames.length) return false;
  for (let i = 0; i < aNames.length; i += 1) {
    if (String(aNames[i] ?? "") !== String(bNames[i] ?? "")) return false;
  }

  const aIds = Array.isArray(a?.assignedMemberIds) ? a.assignedMemberIds : [];
  const bIds = Array.isArray(b?.assignedMemberIds) ? b.assignedMemberIds : [];
  if (aIds.length !== bIds.length) return false;
  for (let i = 0; i < aIds.length; i += 1) {
    if (String(aIds[i] ?? "") !== String(bIds[i] ?? "")) return false;
  }

  return true;
}

function buildSeedAssignments() {
  const reports = REPORT_ASSIGNMENTS.map((entry, index) => ({
    seedKey: `report:${index + 1}:${normalizeNameKey(entry.member)}`,
    type: "Report",
    title: `Report — ${normalizeWhitespace(entry.topic)}`,
    topic: normalizeWhitespace(entry.topic),
    teamLabel: "Reports",
    region: "",
    assignedMemberNames: [normalizeWhitespace(entry.member)],
    deadline: REPORT_FINAL_DUE,
    interviewDueDate: "",
    firstDraftDueDate: REPORT_FIRST_DRAFT_DUE,
    finalDueDate: REPORT_FINAL_DUE,
    deliverableUrl: "",
    status: "Upcoming",
    notes: "Website practical guide assignment.",
  }));

  const caseStudies = CASE_STUDY_ASSIGNMENTS.map((entry, index) => ({
    seedKey: `case:${index + 1}:${normalizeNameKey(entry.teamLabel)}`,
    type: "Case Study",
    title: `Case Study — ${normalizeWhitespace(entry.teamLabel)}`,
    topic: "Field interview + local small-business case study report.",
    teamLabel: normalizeWhitespace(entry.teamLabel),
    region: normalizeWhitespace(entry.region),
    assignedMemberNames: (entry.members ?? []).map((name) => normalizeWhitespace(name)).filter(Boolean),
    deadline: CASE_FINAL_DUE,
    interviewDueDate: CASE_INTERVIEW_DUE,
    firstDraftDueDate: "",
    finalDueDate: CASE_FINAL_DUE,
    deliverableUrl: "",
    status: "Upcoming",
    notes: "3–4 week research field project.",
  }));

  return [...reports, ...caseStudies];
}

async function main() {
  const { serviceAccountPath, write, dryRun } = parseArgs();

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"));
  } catch (err) {
    console.error("Could not read service account JSON:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const app = getApps()[0] || initializeApp(
    { credential: cert(serviceAccount), databaseURL: DATABASE_URL },
    "seed-finance-assignments",
  );

  try {
    const db = getDatabase(app);
    const [teamSnap, applicationsSnap, assignmentsSnap] = await Promise.all([
      db.ref("team").get(),
      db.ref("applications").get(),
      db.ref("financeAssignments").get(),
    ]);

    const team = teamSnap.val() ?? {};
    const applications = applicationsSnap.val() ?? {};
    const existingAssignments = assignmentsSnap.val() ?? {};

    const teamCandidates = Object.entries(team)
      .map(([id, row]) => ({
        id,
        name: normalizeWhitespace(row?.name ?? ""),
        key: normalizeNameKey(row?.name ?? ""),
        source: "team",
      }))
      .filter((row) => row.name && row.key);

    const applicationCandidates = Object.values(applications)
      .map((row) => ({
        id: "",
        name: normalizeWhitespace(row?.fullName ?? ""),
        key: normalizeNameKey(row?.fullName ?? ""),
        source: "application",
      }))
      .filter((row) => row.name && row.key);

    const allCandidates = [...teamCandidates, ...applicationCandidates];

    const exactNameMap = new Map(allCandidates.map((row) => [row.key, row]));
    const aliasMap = new Map([
      ["yuba", "yuba bhatta"],
      ["ellie", "ellie"],
      ["kevin", "kevin"],
      ["tsundruk", "tsundruk"],
      ["tiffany", "tiffany"],
      ["shafeen", "shafeen"],
      ["alaynah", "alaynah chowdhury"],
      ["santana", "santana harm"],
      ["nameera", "nameera guffer"],
      ["brendon kim", "brendon xie"],
      ["kaia", "kaia"],
      ["tenzin", "tenzin"],
      ["veronika", "veronika"],
      ["melody", "melody"],
      ["alvin", "alvin"],
      ["bruce", "bruce"],
      ["ashley", "ashley"],
      ["peyton", "peyton"],
    ]);

    const unresolvedMembers = [];

    function resolveMember(memberName, assignmentSeedKey) {
      const raw = normalizeWhitespace(memberName);
      const rawKey = normalizeNameKey(raw);
      if (!rawKey) return null;

      const exact = exactNameMap.get(rawKey);
      if (exact) return exact;

      const aliasKey = normalizeNameKey(aliasMap.get(rawKey) ?? "");
      if (aliasKey && exactNameMap.has(aliasKey)) {
        return exactNameMap.get(aliasKey);
      }

      let best = null;
      for (const candidate of allCandidates) {
        const score = similarityScore(rawKey, candidate.key);
        if (!best || score > best.score) {
          best = { ...candidate, score };
        }
      }

      if (best && best.score >= 0.78) return best;

      unresolvedMembers.push({
        assignmentSeedKey,
        rawName: raw,
      });
      return null;
    }

    const seedAssignments = buildSeedAssignments().map((item) => {
      const resolvedMembers = item.assignedMemberNames
        .map((name) => resolveMember(name, item.seedKey))
        .filter(Boolean);
      return {
        ...item,
        assignedMemberIds: Array.from(new Set(resolvedMembers.map((member) => member.id).filter(Boolean))),
      };
    });

    const existingBySeedKey = new Map();
    for (const [id, row] of Object.entries(existingAssignments)) {
      const seedKey = normalizeWhitespace(row?.seedKey ?? "");
      if (!seedKey) continue;
      existingBySeedKey.set(seedKey, { id, row });
    }

    const report = {
      mode: dryRun ? "dry-run" : "write",
      seedAssignments: seedAssignments.length,
      existingFinanceAssignments: Object.keys(existingAssignments).length,
      toCreate: 0,
      toUpdate: 0,
      unchanged: 0,
      unresolvedMembers,
      writes: [],
    };

    for (const nextAssignment of seedAssignments) {
      const existing = existingBySeedKey.get(nextAssignment.seedKey);
      const payload = {
        ...nextAssignment,
        assignedMemberNames: nextAssignment.assignedMemberNames,
        assignedMemberIds: nextAssignment.assignedMemberIds,
        updatedAt: new Date().toISOString(),
      };

      if (!existing) {
        report.toCreate += 1;
        report.writes.push({ action: "create", seedKey: nextAssignment.seedKey, title: nextAssignment.title });
        if (write) {
          const createdRef = db.ref("financeAssignments").push();
          await createdRef.set({
            ...payload,
            createdAt: new Date().toISOString(),
          });
        }
        continue;
      }

      if (shallowEqualAssignment(payload, existing.row)) {
        report.unchanged += 1;
        continue;
      }

      report.toUpdate += 1;
      report.writes.push({
        action: "update",
        id: existing.id,
        seedKey: nextAssignment.seedKey,
        title: nextAssignment.title,
      });
      if (write) {
        await db.ref(`financeAssignments/${existing.id}`).update(payload);
      }
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await deleteApp(app);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
