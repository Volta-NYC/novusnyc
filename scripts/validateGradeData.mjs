#!/usr/bin/env node
/**
 * validateGradeData.mjs
 * --------------------
 * Script to identify and correct grade data that's off by 4 years
 * (confusing college vs high school graduation years)
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
// Supabase client (service role for write operations)
// ---------------------------------------------------------------------------
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CURRENT_YEAR = 2026;
const VALID_HS_GRADUATION_YEARS = [2026, 2027, 2028, 2029, 2030];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
function normalizeProjectStatus(value) {
  const raw = String(value ?? '').trim();
  if (['Ongoing', 'Upcoming', 'Completed', 'Not Started', 'Discovery', 'Active', 'On Hold', 'Complete'].includes(raw)) {
    return raw;
  }
  if (raw === 'Active') return 'Ongoing';
  if (raw === 'Complete') return 'Completed';
  if (raw === 'On Hold' || raw === 'Not Started' || raw === 'Discovery') return 'Upcoming';
  return 'Upcoming';
}

async function getTeamMembersList() {
  const { data, error } = await supabase.from('team').select('*');
  if (error) throw error;
  return data || [];
}

async function updateTeamMember(id, updates) {
  const { error } = await supabase
    .from('team')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Main validation logic
// ---------------------------------------------------------------------------
async function validateGradeData() {
  console.log('🔍 Validating grade data for 4-year offset errors...');

  const team = await getTeamMembersList();

  const suspiciousMembers = [];
  const validMembers = [];

  for (const member of team) {
    const gradeStr = member.grade ?? '';
    if (!gradeStr) continue;

    // Extract year from formats like "Class of 2026" or just "2026"
    const yearMatch = gradeStr.match(/(?:Class of )?(\d{4})/);
    if (!yearMatch) continue;

    const year = parseInt(yearMatch[1], 10);

    // Check if year is outside valid HS graduation range
    if (!VALID_HS_GRADUATION_YEARS.includes(year)) {
      suspiciousMembers.push({
        id: member.id,
        name: member.name,
        grade: member.grade,
        year,
        reason: `Year ${year} is outside valid HS graduation range (${VALID_HS_GRADUATION_YEARS.join(', ')})`
      });
    } else {
      validMembers.push(member);
    }
  }

  console.log(`\n📊 Analysis Results:`);
  console.log(`Total members: ${team.length}`);
  console.log(`Valid grade data: ${validMembers.length}`);
  console.log(`Suspicious grade data: ${suspiciousMembers.length}`);

  if (suspiciousMembers.length > 0) {
    console.log(`\n⚠️  Suspicious entries (likely 4-year offset errors):`);
    for (const member of suspiciousMembers) {
      console.log(`  - ${member.name}: "${member.grade}" (year ${member.year})`);
      console.log(`    Reason: ${member.reason}`);

      // Suggest correction - subtract 4 years if it's likely a college year
      const suggestedYear = member.year - 4;
      if (VALID_HS_GRADUATION_YEARS.includes(suggestedYear)) {
        console.log(`    Suggested correction: "Class of ${suggestedYear}"`);
      }
      console.log('');
    }

    // Ask if user wants to apply corrections
    const { createInterface } = await import('node:readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\n🤔 Do you want to apply the suggested corrections? (y/N): ', resolve);
      rl.close();
    });

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await applyCorrections(suspiciousMembers);
    } else {
      console.log('📝 No corrections applied. Review the suspicious entries above.');
    }
  } else {
    console.log('\n✅ All grade data looks valid!');
  }
}

async function applyCorrections(suspiciousMembers) {
  console.log('\n🔧 Applying corrections...');

  let correctedCount = 0;
  let failedCount = 0;

  for (const memberData of suspiciousMembers) {
    const yearMatch = memberData.grade.match(/(?:Class of )?(\d{4})/);
    if (!yearMatch) continue;

    const originalYear = parseInt(yearMatch[1], 10);
    const correctedYear = originalYear - 4;
    const correctedGrade = `Class of ${correctedYear}`;

    try {
      await updateTeamMember(memberData.id, { grade: correctedGrade });
      console.log(`✅ ${memberData.name}: "${memberData.grade}" → "${correctedGrade}"`);
      correctedCount++;
    } catch (error) {
      console.error(`❌ Failed to update ${memberData.name}:`, error.message);
      failedCount++;
    }
  }

  console.log(`\n📋 Correction Summary:`);
  console.log(`Successfully corrected: ${correctedCount}`);
  console.log(`Failed corrections: ${failedCount}`);
}

// Run validation
validateGradeData().catch(console.error);