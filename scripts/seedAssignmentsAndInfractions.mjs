#!/usr/bin/env node
/**
 * seedAssignmentsAndInfractions.mjs
 * ──────────────────────────────────
 * Upserts all assignment catalog entries and infractions.
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/seedAssignmentsAndInfractions.mjs
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
// Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeAssignment({ title, credits, creditsMax, creditsNote, minRole, description, primaryTrack }) {
  return {
    id: crypto.randomUUID(),
    title,
    description: description ?? '',
    primary_track: primaryTrack,
    visible_tracks: [primaryTrack],
    credits,
    credits_max: creditsMax ?? null,
    credits_note: creditsNote ?? '',
    difficulty: 'Standard',
    estimated_hours: 0,
    min_role: minRole,
    capacity: 999,
    deadline: null,
    status: 'open',
    cycle_id: 'global',
    business_id: null,
    created_at: now,
    updated_at: now,
    created_by: 'system',
  };
}

// ---------------------------------------------------------------------------
// Assignment data
// ---------------------------------------------------------------------------

// General track
const generalAssignments = [
  { title: 'Refer a New Member to Novus',      credits: 2, creditsMax: null, creditsNote: '+1 credit for Senior Analyst, +3 credit for Associate', minRole: 'Analyst' },
  { title: 'Refer a Member from a Target City', credits: 4, creditsMax: null, creditsNote: 'Applies if referral is from Boston, Philadelphia, Washington D.C., or Chicago', minRole: 'Analyst' },
  { title: 'Refer a Business to Novus',         credits: 3, creditsMax: null, creditsNote: '', minRole: 'Analyst' },
  { title: 'Follow Novus on Instagram',          credits: 1, creditsMax: null, creditsNote: '', minRole: 'Analyst' },
  { title: 'Follow Novus on LinkedIn',           credits: 1, creditsMax: null, creditsNote: '', minRole: 'Analyst' },
].map(a => makeAssignment({ ...a, primaryTrack: 'General' }));

// Tech track
const techAssignments = [
  { title: 'Support Work Following Clear Instructions',              credits: 0,  creditsMax: null, creditsNote: 'Starting-level task', minRole: 'Analyst' },
  { title: 'Bug Testing and Feedback',                               credits: 2,  creditsMax: null, creditsNote: 'Must suggest at least 3 improvements. Can earn more credits for a genuine UI/UX report with specific technical recommendations.', minRole: 'Analyst' },
  { title: 'Find Images for Client Website',                         credits: 2,  creditsMax: null, creditsNote: 'Menu items, storefront photos, or other images for the client\'s website', minRole: 'Analyst' },
  { title: 'Independent Website Project',                            credits: 5,  creditsMax: 20,   creditsNote: 'Find a business, build a full website (no template), create a slide deck, and submit. 5 credits if not accepted; 20 credits if built, accepted, and feedback implemented.', minRole: 'Analyst' },
  { title: 'Set Up or Claim a Google Business Profile',              credits: 1,  creditsMax: null, creditsNote: 'Must follow the provided checklist', minRole: 'Analyst' },
  { title: 'Submit Sitemaps to Google Search Console',               credits: 2,  creditsMax: null, creditsNote: '', minRole: 'Analyst' },
  { title: 'Implement a Contact Form',                               credits: 3,  creditsMax: null, creditsNote: 'Must coordinate with the business owner', minRole: 'Senior Analyst' },
  { title: 'Connect Domains and Deploy Site',                        credits: 2,  creditsMax: null, creditsNote: 'Configure DNS records and deploy the site, coordinating with the business', minRole: 'Senior Analyst' },
  { title: 'Update Website Placeholder Content',                     credits: 2,  creditsMax: 5,    creditsNote: 'Update outdated or placeholder info on a client website with accurate new information', minRole: 'Senior Analyst' },
  { title: 'Make Basic CSS Tweaks Under Feedback',                   credits: 2,  creditsMax: null, creditsNote: 'Font sizes, colors, spacing adjustments. Must be done on a branch.', minRole: 'Senior Analyst' },
  { title: 'Run Lighthouse Audits and Fix Accessibility Issues',     credits: 3,  creditsMax: null, creditsNote: '', minRole: 'Senior Analyst' },
  { title: 'Implement On-Page SEO',                                  credits: 3,  creditsMax: null, creditsNote: 'Meta tags, heading hierarchy, and schema markup', minRole: 'Senior Analyst' },
  { title: 'Design and Build a Full Responsive Website',             credits: 10, creditsMax: null, creditsNote: 'Frontend only, from scratch', minRole: 'Associate' },
  { title: 'Write and Send Outreach Emails',                         credits: 5,  creditsMax: null, creditsNote: 'Associates can author and send outreach emails for leads sourced by lower-role members', minRole: 'Associate' },
  { title: 'Rebuild or Redesign Underperforming Client Website',     credits: 6,  creditsMax: 10,   creditsNote: '', minRole: 'Associate' },
  { title: 'Implement Animations and Scroll Effects',                credits: 4,  creditsMax: null, creditsNote: 'Must be clean and accessible', minRole: 'Associate' },
  { title: 'Set Up End-to-End E-Commerce Store',                     credits: 15, creditsMax: null, creditsNote: 'Using platforms like Shopify or Square Online', minRole: 'Associate' },
  { title: 'Build Custom Form with Logic and Database Storage',       credits: 3,  creditsMax: null, creditsNote: 'Must include conditional logic and validation', minRole: 'Associate' },
  { title: 'Review a Pull Request',                                  credits: 1,  creditsMax: null, creditsNote: '1 credit per PR reviewed', minRole: 'Associate' },
].map(a => makeAssignment({ ...a, primaryTrack: 'Tech' }));

// Finance track
const financeAssignments = [
  { title: 'Collect Business Leads for Outreach',                credits: 2,  creditsMax: null, creditsNote: '~10 businesses per submission with name, address, and contact info in a Google Doc. 2 credits per successful lead.', minRole: 'Analyst' },
  { title: 'Interview a Business Owner and Write a Report',       credits: 5,  creditsMax: null, creditsNote: 'Short article/report exploring and presenting information from the interview', minRole: 'Analyst' },
  { title: 'Build or Update the Master Contact Spreadsheet',      credits: 5,  creditsMax: null, creditsNote: 'Consolidate multiple Google Docs worth of business info from submitted leads', minRole: 'Senior Analyst' },
  { title: 'Review and Edit Analyst Reports',                     credits: 5,  creditsMax: null, creditsNote: 'Check for AI usage and quality issues', minRole: 'Senior Analyst' },
  { title: 'Assemble the Biweekly Report',                       credits: 10, creditsMax: null, creditsNote: 'Be part of the team that assembles the biweekly (every 2 weeks) report', minRole: 'Senior Analyst' },
  { title: 'Manage Communications for 5 Businesses',             credits: 3,  creditsMax: null, creditsNote: '3 credits per two-week period', minRole: 'Associate' },
  { title: 'Manage Communications for 1 Organization',           credits: 3,  creditsMax: null, creditsNote: '3 credits per two-week period', minRole: 'Associate' },
  { title: 'Lead a Project Team at Your School',                 credits: 5,  creditsMax: null, creditsNote: '5 base credits', minRole: 'Associate' },
  { title: 'Coordinate a Business Tour or Neighborhood Visit',   credits: 10, creditsMax: null, creditsNote: 'Excluding BIDs. 10 credits + 2 per business acquired.', minRole: 'Associate' },
].map(a => makeAssignment({ ...a, primaryTrack: 'Finance' }));

const allAssignments = [...generalAssignments, ...techAssignments, ...financeAssignments];

// ---------------------------------------------------------------------------
// Infraction data
// ---------------------------------------------------------------------------
const infractions = [
  { name: 'No Email Response Within 72 Hours',         description: 'Member did not respond to an email within 72 hours', points: 1 },
  { name: 'Missed Deadline Without Communication',     description: 'Member missed a deadline without notifying the team. 1 point per day.', points: 1 },
  { name: 'Lack of Progress Report on Longer Project', description: 'Member failed to provide progress updates or communication on an extended project', points: 2 },
  { name: 'Unprofessional Email Etiquette',            description: 'Member sent an email that did not meet professional standards. 1 point per email.', points: 1 },
  { name: 'Broken Website Update (404 or Form Error)', description: 'Member pushed a website update that caused a 404 error or broke a contact form', points: 3 },
  { name: 'Bad or Undetailed Pull Request',            description: 'Member submitted a pull request that was insufficiently described or poorly structured', points: 1 },
  { name: 'AI Misuse in Report or Case Study',         description: 'Member used AI inappropriately to write a report or case study without genuine contribution', points: 3 },
].map(inf => ({
  id: crypto.randomUUID(),
  name: inf.name,
  description: inf.description,
  points: inf.points,
  created_at: now,
  updated_at: now,
}));

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------
console.log('=== Seeding Assignments and Infractions ===\n');

// Assignments: upsert on title + primary_track + min_role
console.log(`Upserting ${allAssignments.length} assignments into assignment_catalog...`);
const { error: assignErr } = await supabase
  .from('assignment_catalog')
  .upsert(allAssignments, { onConflict: 'title,primary_track,min_role' });

if (assignErr) {
  console.error('ERROR upserting assignments:', assignErr.message);
  console.log('\nIf the conflict constraint does not exist, you may need to add a unique index:');
  console.log('  CREATE UNIQUE INDEX IF NOT EXISTS assignment_catalog_title_track_role_idx');
  console.log('    ON assignment_catalog (title, primary_track, min_role);');
  console.log('\nFalling back to individual inserts with id conflict...');

  // Fallback: upsert on id
  const { error: fallbackErr } = await supabase
    .from('assignment_catalog')
    .upsert(allAssignments, { onConflict: 'id' });

  if (fallbackErr) {
    console.error('ERROR on fallback upsert:', fallbackErr.message);
    process.exit(1);
  } else {
    console.log('Fallback upsert succeeded (by id).');
  }
} else {
  console.log(`Done: ${allAssignments.length} assignments upserted.`);
}

// Infractions: upsert on name
console.log(`\nUpserting ${infractions.length} infractions...`);
const { error: infErr } = await supabase
  .from('infractions')
  .upsert(infractions, { onConflict: 'name' });

if (infErr) {
  console.error('ERROR upserting infractions:', infErr.message);
  console.log('\nFalling back to upsert by id...');
  const { error: fallbackErr } = await supabase
    .from('infractions')
    .upsert(infractions, { onConflict: 'id' });
  if (fallbackErr) {
    console.error('ERROR on fallback upsert:', fallbackErr.message);
    process.exit(1);
  } else {
    console.log('Fallback upsert succeeded (by id).');
  }
} else {
  console.log(`Done: ${infractions.length} infractions upserted.`);
}

console.log('\nSeed complete.');
process.exit(0);
