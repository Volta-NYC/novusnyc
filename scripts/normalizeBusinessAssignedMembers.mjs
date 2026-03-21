#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_SERVICE_ACCOUNT_PATH = "/Users/ethanzhang180/volta/secrets/firebase/volta-nyc-firebase-adminsdk-fbsvc-active.json";
const DATABASE_URL = "https://volta-nyc-default-rtdb.firebaseio.com";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/normalizeBusinessAssignedMembers.mjs [--service-account <path>] [--dry-run|--write]",
      "",
      "Notes:",
      "  - Default mode is --dry-run",
      "  - Updates only businesses/<id>/teamMembers",
      "  - Resolves entries to closest Team Directory names",
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

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhitespace(value) {
  return trimText(value).replace(/\s+/g, " ");
}

function normalizeNameKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmailKey(value) {
  return trimText(value).toLowerCase();
}

function parseDecoratedEmail(value) {
  const match = value.match(/\(([^()]*@[^()]+)\)\s*$/);
  return match ? normalizeEmailKey(match[1]) : "";
}

function stripDecoratedSuffix(value) {
  return value.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function splitLegacyMemberCell(value) {
  const text = normalizeWhitespace(value);
  if (!text) return [];

  if (text.includes("@")) return [text];

  return text
    .replace(/\s+\band\b\s+/gi, ",")
    .split(/[,;|/]+/g)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function toTokenList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitLegacyMemberCell(String(entry ?? "")));
  }
  if (typeof value === "string") return splitLegacyMemberCell(value);
  return [];
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

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }

  return prev[b.length];
}

function tokenJaccard(a, b) {
  const aSet = new Set(a.split(" ").filter(Boolean));
  const bSet = new Set(b.split(" ").filter(Boolean));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersection += 1;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union > 0 ? intersection / union : 0;
}

function similarityScore(rawKey, candidateKey) {
  if (!rawKey || !candidateKey) return 0;
  if (rawKey === candidateKey) return 1;
  if (rawKey.length >= 4 && (candidateKey.includes(rawKey) || rawKey.includes(candidateKey))) return 0.93;

  const dice = diceSimilarity(rawKey, candidateKey);
  const editDistance = levenshteinDistance(rawKey, candidateKey);
  const levRatio = 1 - (editDistance / Math.max(rawKey.length, candidateKey.length, 1));
  const jaccard = tokenJaccard(rawKey, candidateKey);

  return (0.45 * dice) + (0.35 * levRatio) + (0.2 * jaccard);
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
    "normalize-business-assigned-members",
  );
  const db = getDatabase(app);

  const [teamSnap, businessSnap] = await Promise.all([
    db.ref("team").get(),
    db.ref("businesses").get(),
  ]);

  const team = teamSnap.val() ?? {};
  const businesses = businessSnap.val() ?? {};

  const members = Object.values(team)
    .map((row) => ({
      name: normalizeWhitespace(row?.name ?? ""),
      email: normalizeEmailKey(row?.email ?? ""),
    }))
    .filter((row) => row.name);

  const nameByExactKey = new Map();
  const nameByEmail = new Map();
  const memberNameKeys = [];

  for (const member of members) {
    const key = normalizeNameKey(member.name);
    if (key && !nameByExactKey.has(key)) nameByExactKey.set(key, member.name);
    if (member.email) nameByEmail.set(member.email, member.name);
    if (key) memberNameKeys.push({ key, name: member.name });
  }

  const resolveTokenToMember = (token) => {
    const raw = normalizeWhitespace(token);
    if (!raw) return null;

    const directEmail = raw.includes("@") ? normalizeEmailKey(raw.replace(/[<>]/g, "")) : "";
    if (directEmail && nameByEmail.has(directEmail)) return { name: nameByEmail.get(directEmail), method: "email_exact", score: 1 };

    const decoratedEmail = parseDecoratedEmail(raw);
    if (decoratedEmail && nameByEmail.has(decoratedEmail)) return { name: nameByEmail.get(decoratedEmail), method: "email_decorated", score: 1 };

    const baseName = stripDecoratedSuffix(raw);
    const nameKey = normalizeNameKey(baseName);
    if (nameKey && nameByExactKey.has(nameKey)) return { name: nameByExactKey.get(nameKey), method: "name_exact", score: 1 };

    let best = null;
    for (const candidate of memberNameKeys) {
      const score = similarityScore(nameKey, candidate.key);
      if (!best || score > best.score) {
        best = { name: candidate.name, score };
      }
    }

    if (!best) return null;
    return { name: best.name, method: "name_fuzzy", score: Number(best.score.toFixed(3)) };
  };

  const report = {
    mode: dryRun ? "dry-run" : "write",
    businessesTotal: Object.keys(businesses).length,
    businessesWithAssignments: 0,
    membersTotal: members.length,
    updatedBusinesses: 0,
    unchangedBusinesses: 0,
    unresolvedTokens: [],
    changes: [],
  };

  for (const [businessId, row] of Object.entries(businesses)) {
    const originalTokens = toTokenList(row?.teamMembers);
    if (originalTokens.length === 0) {
      report.unchangedBusinesses += 1;
      continue;
    }
    report.businessesWithAssignments += 1;

    const nextMembers = [];
    const resolutionLog = [];

    for (const token of originalTokens) {
      const resolved = resolveTokenToMember(token);
      if (!resolved?.name) {
        report.unresolvedTokens.push({
          businessId,
          businessName: normalizeWhitespace(row?.name ?? ""),
          token,
        });
        continue;
      }
      nextMembers.push(resolved.name);
      resolutionLog.push({
        token,
        mappedTo: resolved.name,
        method: resolved.method,
        score: resolved.score,
      });
    }

    const deduped = Array.from(new Set(nextMembers));
    const currentCanonical = Array.from(new Set(originalTokens.map((token) => normalizeWhitespace(token))));
    const nextCanonical = Array.from(new Set(deduped.map((token) => normalizeWhitespace(token))));
    const changed = currentCanonical.length !== nextCanonical.length
      || currentCanonical.some((entry, idx) => entry !== nextCanonical[idx]);

    if (!changed) {
      report.unchangedBusinesses += 1;
      continue;
    }

    report.updatedBusinesses += 1;
    report.changes.push({
      businessId,
      businessName: normalizeWhitespace(row?.name ?? ""),
      before: currentCanonical,
      after: nextCanonical,
      resolutionLog,
    });

    if (write) {
      // eslint-disable-next-line no-await-in-loop
      await db.ref(`businesses/${businessId}`).update({ teamMembers: deduped });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  await deleteApp(app);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
