#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

function usage() {
  console.error("Usage: node scripts/clearAvailableInterviewSlots.mjs <service-account-json-path>");
}

const jsonPath = process.argv[2];
if (!jsonPath) {
  usage();
  process.exit(1);
}

let serviceAccount;
try {
  const abs = resolve(jsonPath);
  serviceAccount = JSON.parse(readFileSync(abs, "utf8"));
} catch (err) {
  console.error("Could not read service account JSON:", err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const databaseURL = "https://volta-nyc-default-rtdb.firebaseio.com";
const app = getApps()[0] || initializeApp(
  {
    credential: cert(serviceAccount),
    databaseURL,
  },
  "cleanup-script",
);
const db = getDatabase(app);

const snap = await db.ref("interviewSlots").get();
const slots = snap.val() ?? {};
const ids = Object.keys(slots);

let availableUnbookedCount = 0;
let bookedCount = 0;

for (const id of ids) {
  const slot = slots[id];
  if (!slot || typeof slot !== "object") continue;
  if (slot.bookedBy) bookedCount += 1;
  if (slot.available === true && !slot.bookedBy) availableUnbookedCount += 1;
}

console.log(`Found ${ids.length} total interview slots.`);
console.log(`Booked slots preserved: ${bookedCount}.`);
console.log(`Available + unbooked slots to delete: ${availableUnbookedCount}.`);

if (availableUnbookedCount === 0) {
  console.log("No matching slots to delete.");
  process.exit(0);
}

const updates = {};
for (const id of ids) {
  const slot = slots[id];
  if (slot && typeof slot === "object" && slot.available === true && !slot.bookedBy) {
    updates[id] = null;
  }
}

await db.ref("interviewSlots").update(updates);

const verifySnap = await db.ref("interviewSlots").get();
const verifySlots = verifySnap.val() ?? {};
let remainingAvailableUnbooked = 0;
for (const id of Object.keys(verifySlots)) {
  const slot = verifySlots[id];
  if (slot && typeof slot === "object" && slot.available === true && !slot.bookedBy) {
    remainingAvailableUnbooked += 1;
  }
}

console.log("Deletion complete.");
console.log(`Remaining available + unbooked slots: ${remainingAvailableUnbooked}.`);
