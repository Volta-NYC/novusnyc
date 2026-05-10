#!/usr/bin/env node
/**
 * migrateHandbookAndCatalog.mjs
 * ─────────────────────────────
 * Creates the handbook_pages and member_acknowledgments tables, and adds
 * credits_max / credits_note columns to assignment_catalog.
 *
 * Since the Supabase JS client doesn't support raw DDL, this script prints
 * the SQL that must be run in the Supabase Dashboard SQL editor, then
 * verifies the tables can be queried via the JS client.
 *
 * Usage:
 *   node scripts/migrateHandbookAndCatalog.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
// Supabase client (service role)
// ---------------------------------------------------------------------------
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------------
// Print migration SQL
// ---------------------------------------------------------------------------
const sqlPath = join(__dirname, 'handbook_migration.sql');
const sql = readFileSync(sqlPath, 'utf8');

console.log('=== Handbook & Catalog Migration ===\n');
console.log('The Supabase JS client does not support raw DDL statements.');
console.log('Please run the following SQL in the Supabase Dashboard SQL editor:');
console.log('  https://supabase.com/dashboard → SQL Editor\n');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));
console.log('\nOnce the SQL above has been executed, the tables will be available.');

// ---------------------------------------------------------------------------
// Verify tables exist by attempting a select (returns empty data if table exists)
// ---------------------------------------------------------------------------
console.log('\nChecking table availability via JS client...\n');

async function checkTable(table) {
  const { error } = await supabase.from(table).select('id').limit(1);
  if (error) {
    console.log(`  ✗ ${table}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${table}: OK`);
  return true;
}

const handbookOk = await checkTable('handbook_pages');
const acksOk = await checkTable('member_acknowledgments');

// Check assignment_catalog columns (just do a select with the new columns)
const { error: catErr } = await supabase
  .from('assignment_catalog')
  .select('id, credits_max, credits_note')
  .limit(1);

if (catErr) {
  console.log(`  ✗ assignment_catalog (credits_max, credits_note): ${catErr.message}`);
} else {
  console.log(`  ✓ assignment_catalog (credits_max, credits_note): OK`);
}

if (!handbookOk || !acksOk) {
  console.log('\nSome tables are not yet available. Please run the SQL above in the Supabase Dashboard.');
  process.exit(1);
}

console.log('\nAll tables ready.');
process.exit(0);
