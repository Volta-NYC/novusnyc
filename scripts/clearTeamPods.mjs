#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const DEFAULT_SERVICE_ACCOUNT_PATH = "/Users/ethanzhang180/volta/secrets/firebase/volta-nyc-firebase-adminsdk-fbsvc-active.json";
const DATABASE_URL = "https://volta-nyc-default-rtdb.firebaseio.com";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    serviceAccountPath: DEFAULT_SERVICE_ACCOUNT_PATH,
    write: false,
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
      continue;
    }
  }

  return out;
}

async function main() {
  const { serviceAccountPath, write } = parseArgs();
  const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"));

  const app = getApps()[0] || initializeApp(
    { credential: cert(serviceAccount), databaseURL: DATABASE_URL },
    "clear-team-pods",
  );
  const db = getDatabase(app);

  const teamSnap = await db.ref("team").get();
  const team = teamSnap.val() ?? {};

  const updates = {};
  const impacted = [];
  for (const [id, row] of Object.entries(team)) {
    const pod = typeof row?.pod === "string" ? row.pod.trim() : "";
    if (!pod) continue;
    updates[`team/${id}/pod`] = null;
    impacted.push({ id, name: String(row?.name ?? "").trim(), pod });
  }

  const result = {
    mode: write ? "write" : "dry-run",
    totalTeamRows: Object.keys(team).length,
    podsFound: impacted.length,
    sample: impacted.slice(0, 30),
  };

  if (write && impacted.length > 0) {
    await db.ref().update(updates);
  }

  console.log(JSON.stringify(result, null, 2));
  await deleteApp(app);
}

main().catch((err) => {
  console.error(JSON.stringify({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  }, null, 2));
  process.exit(1);
});

