#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_SERVICE_ACCOUNT_PATH = "/Users/ethanzhang180/volta/secrets/firebase/volta-nyc-firebase-adminsdk-fbsvc-active.json";
const DATABASE_URL = "https://volta-nyc-default-rtdb.firebaseio.com";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/backfillAddressSingleField.mjs --csv <path> [--service-account <path>] [--dry-run|--write]",
      "",
      "Notes:",
      "  - Default mode is --dry-run",
      "  - Writes only businesses/<id>/address and bids/<id>/address",
    ].join("\n"),
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    csvPath: "",
    serviceAccountPath: DEFAULT_SERVICE_ACCOUNT_PATH,
    write: false,
    dryRun: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--csv" && args[i + 1]) {
      out.csvPath = args[i + 1];
      i += 1;
      continue;
    }
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
  }

  return out;
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAddress(value) {
  const text = trimText(value);
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "n/a" || lower === "na" || lower === "none" || lower === "null") return "";
  return text;
}

function normalizeCollectionType(value) {
  const key = trimText(value).toLowerCase();
  if (!key) return null;
  if (["project_business", "project", "projects", "business", "businesses"].includes(key)) return "businesses";
  if (["bid_tracking", "bid", "bids"].includes(key)) return "bids";
  return "invalid";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((c) => trimText(c)))
    .filter((r) => r.some((c) => c.length > 0));
}

function headerIndex(headers, candidates) {
  const normalized = headers.map((h) => h.toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

function indexByTrimmedName(records) {
  const out = new Map();
  for (const [id, row] of Object.entries(records ?? {})) {
    const name = trimText(row?.name);
    if (!name) continue;
    const current = out.get(name) ?? [];
    current.push({ id, row });
    out.set(name, current);
  }
  return out;
}

async function main() {
  const { csvPath, serviceAccountPath, write, dryRun } = parseArgs();
  if (!csvPath) {
    usage();
    process.exit(1);
  }

  let csvText = "";
  try {
    csvText = readFileSync(resolve(csvPath), "utf8");
  } catch (err) {
    console.error("Could not read CSV file:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"));
  } catch (err) {
    console.error("Could not read service account JSON:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    console.error("CSV must include headers and at least one data row.");
    process.exit(1);
  }

  const headers = rows[0];
  const nameIdx = headerIndex(headers, ["name"]);
  const addressIdx = headerIndex(headers, ["address"]);
  const typeIdx = headerIndex(headers, ["database_type", "collection", "type"]);

  if (nameIdx === -1 || addressIdx === -1) {
    console.error(`CSV missing required headers. Found headers: ${headers.join(", ")}`);
    process.exit(1);
  }

  const app = getApps()[0] || initializeApp(
    {
      credential: cert(serviceAccount),
      databaseURL: DATABASE_URL,
    },
    "address-backfill",
  );

  try {
    const db = getDatabase(app);

    const [businessSnap, bidSnap] = await Promise.all([
      db.ref("businesses").get(),
      db.ref("bids").get(),
    ]);

    const businesses = businessSnap.val() ?? {};
    const bids = bidSnap.val() ?? {};
    const businessByName = indexByTrimmedName(businesses);
    const bidByName = indexByTrimmedName(bids);

    const report = {
      mode: dryRun ? "dry-run" : "write",
      csvPath: resolve(csvPath),
      collections: {
        businesses: { plannedUpdates: 0, unchanged: 0 },
        bids: { plannedUpdates: 0, unchanged: 0 },
      },
      unmatchedCsvRows: [],
      duplicateDbMatches: [],
      unchangedRows: [],
      updatePlan: [],
    };

    for (let i = 1; i < rows.length; i += 1) {
      const r = rows[i];
      const csvRowNumber = i + 1;
      const name = trimText(r[nameIdx]);
      const nextAddress = normalizeAddress(r[addressIdx]);
      const rawType = typeIdx === -1 ? "" : trimText(r[typeIdx]);
      const normalizedType = normalizeCollectionType(rawType);

      if (!name) {
        report.unmatchedCsvRows.push({
          csvRowNumber,
          reason: "missing_name",
          rawType,
        });
        continue;
      }

      const collectionsToCheck = (() => {
        if (normalizedType === "businesses") return ["businesses"];
        if (normalizedType === "bids") return ["bids"];
        if (normalizedType === "invalid") return [];
        return ["businesses", "bids"];
      })();

      if (collectionsToCheck.length === 0) {
        report.unmatchedCsvRows.push({
          csvRowNumber,
          name,
          reason: "invalid_database_type",
          rawType,
        });
        continue;
      }

      const businessMatches = collectionsToCheck.includes("businesses")
        ? (businessByName.get(name) ?? []).map((m) => ({ collection: "businesses", ...m }))
        : [];
      const bidMatches = collectionsToCheck.includes("bids")
        ? (bidByName.get(name) ?? []).map((m) => ({ collection: "bids", ...m }))
        : [];
      const matches = [...businessMatches, ...bidMatches];

      if (matches.length === 0) {
        report.unmatchedCsvRows.push({
          csvRowNumber,
          name,
          reason: "no_db_match",
          target: normalizedType || "auto",
        });
        continue;
      }

      if (matches.length > 1) {
        report.duplicateDbMatches.push({
          csvRowNumber,
          name,
          target: normalizedType || "auto",
          matches: matches.map((m) => ({ collection: m.collection, id: m.id })),
        });
        continue;
      }

      const [match] = matches;
      const currentAddress = normalizeAddress(match.row?.address);

      if (currentAddress === nextAddress) {
        report.unchangedRows.push({
          csvRowNumber,
          name,
          collection: match.collection,
          id: match.id,
          address: currentAddress,
        });
        report.collections[match.collection].unchanged += 1;
        continue;
      }

      report.updatePlan.push({
        csvRowNumber,
        name,
        collection: match.collection,
        id: match.id,
        fromAddress: currentAddress,
        toAddress: nextAddress,
      });
      report.collections[match.collection].plannedUpdates += 1;
    }

    const summary = {
      mode: report.mode,
      csvRows: rows.length - 1,
      updatesByCollection: report.collections,
      unmatchedCsvRows: report.unmatchedCsvRows.length,
      duplicateDbMatches: report.duplicateDbMatches.length,
      unchangedRows: report.unchangedRows.length,
      plannedUpdates: report.updatePlan.length,
    };

    console.log(JSON.stringify({ summary, detail: report }, null, 2));

    if (!write) {
      console.log("Dry run only. No writes applied.");
      return;
    }

    if (report.updatePlan.length === 0) {
      console.log("Write mode requested, but there are no planned updates.");
      return;
    }

    const updates = {};
    for (const row of report.updatePlan) {
      updates[`${row.collection}/${row.id}/address`] = row.toAddress;
    }

    await db.ref("/").update(updates);
    console.log(`Applied ${report.updatePlan.length} address updates.`);
  } finally {
    await app.delete();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
