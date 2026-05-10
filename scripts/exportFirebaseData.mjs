#!/usr/bin/env node
/**
 * exportFirebaseData.mjs
 * ----------------------
 * Exports every Firebase Realtime Database collection to
 * scripts/firebase-export/<collection>.json
 *
 * Idempotent – re-running overwrites local export files only.
 * Never touches Firebase data.
 *
 * Usage:
 *   node scripts/exportFirebaseData.mjs [--collections businesses,team,...]
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; })
);

// ---------------------------------------------------------------------------
// Init Firebase Admin
// ---------------------------------------------------------------------------
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey:  env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

const db = getDatabase();

// ---------------------------------------------------------------------------
// Collections to export
// ---------------------------------------------------------------------------
const ALL_COLLECTIONS = [
  'businesses',
  'businessImages',
  'bids',
  'team',
  'applications',
  'projects',
  'financeAssignments',
  'assignmentCatalog',
  'assignmentClaims',
  'memberStrikes',
  'memberCreditAdjustments',
  'cycles',
  'infractions',
  'emailTemplates',
  'userProfiles',
  'auditLogs',
  'inviteCodes',
  'calendarEvents',
  'interviewInvites',
  'interviewSlots',
  'interviewSettings',
  'inquiries',
  'abuseGuards',
];

const args = process.argv.slice(2);
const flagIdx = args.indexOf('--collections');
const collections = flagIdx !== -1
  ? args[flagIdx + 1].split(',').map(s => s.trim())
  : ALL_COLLECTIONS;

// ---------------------------------------------------------------------------
// Output dir
// ---------------------------------------------------------------------------
const OUT_DIR = join(__dirname, 'firebase-export');
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
let totalRecords = 0;

for (const collection of collections) {
  process.stdout.write(`Exporting ${collection}... `);
  try {
    const snap = await db.ref(collection).get();
    const val = snap.val();

    if (val === null) {
      console.log('(empty)');
      writeFileSync(join(OUT_DIR, `${collection}.json`), '{}', 'utf8');
      continue;
    }

    const out = typeof val === 'object' ? val : { _value: val };
    const count = Object.keys(out).length;
    totalRecords += count;
    writeFileSync(join(OUT_DIR, `${collection}.json`), JSON.stringify(out, null, 2), 'utf8');
    console.log(`${count} records`);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
}

console.log(`\nExport complete. ${totalRecords} total records written to scripts/firebase-export/`);
process.exit(0);
