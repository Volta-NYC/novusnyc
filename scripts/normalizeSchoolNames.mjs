#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_SERVICE_ACCOUNT_PATH = "/Users/ethanzhang180/volta/secrets/firebase/volta-nyc-firebase-adminsdk-fbsvc-active.json";
const DATABASE_URL = "https://volta-nyc-default-rtdb.firebaseio.com";

function normalizeKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

function cleanWhitespace(value) {
  return value.trim().replace(/\s+/g, " ");
}

function titleCaseWords(value) {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (word.length <= 2 && word === word.toUpperCase()) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function canonicalSchoolName(raw) {
  const cleaned = cleanWhitespace(raw);
  if (!cleaned) return "";

  const key = normalizeKey(cleaned);

  if ([
    "stuyvesant",
    "stuyvesant hs",
    "stuyvesant high school",
    "stuyvesant highschool",
    "stayvesand hih skool",
  ].includes(key)) {
    return "Stuyvesant High School";
  }

  if ([
    "csihs",
    "csi high school",
    "csi high school for intentional studies",
    "csi high school for international studies",
  ].includes(key)) {
    return "CSI High School for International Studies";
  }

  if ([
    "manhattan hunter science",
    "manhattan hunter science high school",
    "manhattan hunter science highschool",
    "manhattan / hunter science high school",
    "manhattan/hunter science high school",
  ].includes(key)) {
    return "Manhattan/Hunter Science High School";
  }

  if ([
    "brooklyn technical high school",
    "brooklyn technical highschool",
    "brooklyn technical high school",
    "brooklyn tech",
  ].includes(key)) {
    return "Brooklyn Technical High School";
  }

  if (key === "midwood highschool") return "Midwood High School";
  if (key === "staten island technical highschool") return "Staten Island Technical High School";
  if (key === "virtual virginia academy") return "Virtual Virginia Academy";
  if (key === "bard highschool early college") return "Bard High School Early College";
  if (key === "bronx science") return "Bronx High School of Science";

  if (["new jersey institute of technology", "new jersey institute of technology newark", "new jersey institute of technology hackensack"].includes(key)) {
    return "New Jersey Institute of Technology";
  }

  if (["rochester institute of technology", "rochester institute of technology rochester"].includes(key)) {
    return "Rochester Institute of Technology";
  }

  if (key === "the city college of new york") return "The City College of New York";
  if (key === "stevens institute of technology - hoboken" || key === "stevens institute of technology hoboken") {
    return "Stevens Institute of Technology";
  }

  if (key === "binghamton university") return "Binghamton University";
  if (key === "brooklyn college") return "Brooklyn College";
  if (key === "queens college") return "Queens College";
  if (key === "queens college cuny" || key === "cuny queens college") return "Queens College";
  if (key === "hunter college" || key === "cuny hunter college") return "Hunter College";
  if (key === "baruch college cuny") return "Baruch College";
  if (key === "lehman college") return "Lehman College";
  if (key === "borough of manhattan community college") return "Borough of Manhattan Community College";
  if (key === "queensborough community college") return "Queensborough Community College";

  if (/^penn state/.test(key)) return "Penn State University";

  if (cleaned !== raw) return cleaned;

  // Keep unknown values as-is, but normalize obvious all-caps accidental entries.
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 4) {
    return titleCaseWords(cleaned);
  }

  return cleaned;
}

function shouldNormalizeFieldKey(key) {
  return key === "school" || key === "schoolName";
}

function walkObject(node, currentPath, updates, stats) {
  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node)) {
    const nextPath = currentPath ? `${currentPath}/${key}` : key;

    if (shouldNormalizeFieldKey(key) && typeof value === "string") {
      const normalized = canonicalSchoolName(value);
      if (normalized && normalized !== value) {
        updates[nextPath] = normalized;
        stats.changed += 1;
      }
      stats.seen += 1;
      continue;
    }

    if (value && typeof value === "object") {
      walkObject(value, nextPath, updates, stats);
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    serviceAccountPath: DEFAULT_SERVICE_ACCOUNT_PATH,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--service-account" && args[i + 1]) {
      out.serviceAccountPath = args[i + 1];
      i += 1;
    }
  }

  return out;
}

async function main() {
  const { serviceAccountPath, dryRun } = parseArgs();

  let serviceAccount;
  try {
    const abs = resolve(serviceAccountPath);
    serviceAccount = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    console.error("Could not read service account JSON:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const app = getApps()[0] || initializeApp(
    {
      credential: cert(serviceAccount),
      databaseURL: DATABASE_URL,
    },
    "school-normalizer",
  );
  const db = getDatabase(app);

  const rootSnap = await db.ref("/").get();
  const root = rootSnap.val() ?? {};

  const updates = {};
  const stats = { seen: 0, changed: 0 };
  walkObject(root, "", updates, stats);

  const updateEntries = Object.entries(updates);
  console.log(`School fields scanned: ${stats.seen}`);
  console.log(`School fields normalized: ${stats.changed}`);

  if (updateEntries.length === 0) {
    console.log("No school name changes needed.");
    return;
  }

  const preview = updateEntries.slice(0, 25);
  console.log("Preview (first 25 updates):");
  for (const [path, value] of preview) {
    console.log(`- ${path} -> ${value}`);
  }

  if (dryRun) {
    console.log("Dry run only. No database writes applied.");
    return;
  }

  await db.ref("/").update(updates);
  console.log(`Applied ${updateEntries.length} updates.`);
}

main().catch((err) => {
  console.error("Normalization failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
