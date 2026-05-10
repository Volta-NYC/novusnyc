#!/usr/bin/env node
/**
 * verifySupabaseMigration.mjs
 * ---------------------------
 * Compares Firebase export files with Supabase row counts,
 * spot-checks key referential links, and verifies image availability.
 *
 * Exits 0 if all checks pass, 1 if any fail.
 *
 * Usage:
 *   node scripts/verifySupabaseMigration.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const EXPORT_DIR = join(__dirname, 'firebase-export');

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail = '') {
  console.log(`  ✗  ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count;
}

function countExport(file) {
  const p = join(EXPORT_DIR, `${file}.json`);
  if (!existsSync(p)) return null;
  const d = JSON.parse(readFileSync(p, 'utf8'));
  return Object.keys(d).length;
}

// ---------------------------------------------------------------------------
// 1. Row count checks
// ---------------------------------------------------------------------------
console.log('\n── Row counts ──────────────────────────────────────────────────');

const COUNT_CHECKS = [
  { firebase: 'businesses',              table: 'businesses' },
  { firebase: 'bids',                    table: 'bids' },
  { firebase: 'team',                    table: 'team' },
  { firebase: 'applications',            table: 'applications' },
  { firebase: 'projects',                table: 'projects' },
  { firebase: 'financeAssignments',      table: 'finance_assignments' },
  { firebase: 'assignmentCatalog',       table: 'assignment_catalog' },
  { firebase: 'assignmentClaims',        table: 'assignment_claims' },
  { firebase: 'cycles',                  table: 'cycles' },
  { firebase: 'infractions',             table: 'infractions' },
  { firebase: 'memberStrikes',           table: 'member_strikes' },
  { firebase: 'memberCreditAdjustments', table: 'member_credit_adjustments' },
  { firebase: 'emailTemplates',          table: 'email_templates' },
  { firebase: 'userProfiles',            table: 'user_profiles' },
  { firebase: 'inviteCodes',             table: 'invite_codes' },
  { firebase: 'calendarEvents',          table: 'calendar_events' },
  { firebase: 'interviewInvites',        table: 'interview_invites' },
  { firebase: 'interviewSlots',          table: 'interview_slots' },
  { firebase: 'inquiries',               table: 'inquiries' },
];

for (const { firebase, table } of COUNT_CHECKS) {
  const fbCount = countExport(firebase);
  if (fbCount === null) { console.log(`  –  ${table}: no export file`); continue; }

  const sbCount = await countTable(table);

  if (sbCount >= fbCount) {
    ok(`${table}: ${sbCount} rows (Firebase had ${fbCount})`);
  } else {
    fail(`${table}: ${sbCount} rows — expected ${fbCount} (missing ${fbCount - sbCount})`);
  }
}

// ---------------------------------------------------------------------------
// 2. Audit logs (large collection — just compare counts)
// ---------------------------------------------------------------------------
console.log('\n── Audit logs ──────────────────────────────────────────────────');
{
  const fbCount = countExport('auditLogs');
  if (fbCount !== null) {
    const sbCount = await countTable('audit_logs');
    if (sbCount >= fbCount) ok(`audit_logs: ${sbCount} rows`);
    else fail(`audit_logs: ${sbCount}/${fbCount} rows`);
  }
}

// ---------------------------------------------------------------------------
// 3. Referential spot-checks
// ---------------------------------------------------------------------------
console.log('\n── Referential integrity ───────────────────────────────────────');

// projects.business_id → businesses.id
{
  const { data, error } = await supabase
    .from('projects')
    .select('id, business_id')
    .not('business_id', 'is', null)
    .limit(50);
  if (!error && data?.length) {
    const ids = data.map(r => r.business_id);
    const { data: matched } = await supabase.from('businesses').select('id').in('id', ids);
    const matchedIds = new Set(matched?.map(r => r.id));
    const dangling = ids.filter(id => !matchedIds.has(id));
    if (dangling.length === 0) ok(`projects.business_id refs all resolve (checked ${ids.length})`);
    else fail(`projects.business_id: ${dangling.length} dangling refs`, dangling.slice(0, 3).join(', '));
  }
}

// assignment_claims.assignment_id → assignment_catalog.id
{
  const { data, error } = await supabase
    .from('assignment_claims')
    .select('id, assignment_id')
    .not('assignment_id', 'is', null)
    .limit(50);
  if (!error && data?.length) {
    const ids = data.map(r => r.assignment_id);
    const { data: matched } = await supabase.from('assignment_catalog').select('id').in('id', ids);
    const matchedIds = new Set(matched?.map(r => r.id));
    const dangling = ids.filter(id => !matchedIds.has(id));
    if (dangling.length === 0) ok(`assignment_claims.assignment_id refs all resolve (checked ${ids.length})`);
    else fail(`assignment_claims.assignment_id: ${dangling.length} dangling refs`);
  }
}

// ---------------------------------------------------------------------------
// 4. Sample record spot-checks
// ---------------------------------------------------------------------------
console.log('\n── Sample records ──────────────────────────────────────────────');

async function sampleCheck(table, requiredFields) {
  const { data, error } = await supabase.from(table).select('*').limit(3);
  if (error) { fail(`${table}: query error — ${error.message}`); return; }
  if (!data?.length) {
    // skip if table is legitimately empty (matches Firebase export)
    const fbCount = countExport(table) ?? countExport(
      // map snake_case back to camelCase collection name for lookup
      table.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    );
    if (fbCount === 0 || fbCount === null) { console.log(`  –  ${table}: empty (expected)`); return; }
    fail(`${table}: no rows returned`); return;
  }

  const row = data[0];
  const missing = requiredFields.filter(f => !(f in row));
  if (missing.length === 0) ok(`${table}: sample row has expected fields`);
  else fail(`${table}: sample row missing fields`, missing.join(', '));
}

await sampleCheck('businesses',    ['id', 'name', 'owner_email']);
await sampleCheck('team',          ['id', 'name', 'email', 'role']);
await sampleCheck('applications',  ['id', 'full_name', 'email', 'status']);
await sampleCheck('cycles',        ['id', 'name', 'active']);
await sampleCheck('email_templates', ['id', 'key', 'subject', 'body']);

// ---------------------------------------------------------------------------
// 5. Business images in Supabase Storage
// ---------------------------------------------------------------------------
console.log('\n── Business images (Supabase Storage) ─────────────────────────');
{
  const { data, error } = await supabase
    .from('businesses')
    .select('id, showcase_image_path, showcase_image_url')
    .not('showcase_image_path', 'is', null)
    .limit(5);

  if (error) {
    fail('business image check', error.message);
  } else if (!data?.length) {
    console.log('  –  No businesses have showcase_image_path set yet');
  } else {
    let reachable = 0;
    for (const biz of data) {
      if (biz.showcase_image_url) {
        try {
          const res = await fetch(biz.showcase_image_url, { method: 'HEAD' });
          if (res.ok) reachable++;
        } catch (_) { /* network error */ }
      }
    }
    if (reachable === data.length) ok(`${reachable}/${data.length} sampled business images reachable`);
    else fail(`only ${reachable}/${data.length} sampled business images reachable`);
  }
}

// ---------------------------------------------------------------------------
// 6. interview_settings singleton
// ---------------------------------------------------------------------------
console.log('\n── Singletons ──────────────────────────────────────────────────');
{
  const { data } = await supabase.from('interview_settings').select('id').eq('id', 'singleton');
  if (data?.length) ok('interview_settings singleton row exists');
  else fail('interview_settings singleton row missing');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n════════════════════════════════════════════════════════════════`);
console.log(`  Passed: ${passed}   Failed: ${failed}`);
if (failed === 0) {
  console.log('  ✓ Migration verification PASSED');
} else {
  console.log('  ✗ Migration verification FAILED — see failures above');
}
console.log('');

process.exit(failed > 0 ? 1 : 0);
