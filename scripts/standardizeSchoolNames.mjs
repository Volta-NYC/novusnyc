#!/usr/bin/env node
/**
 * standardizeSchoolNames.mjs
 * --------------------------
 * Script to standardize school names in the database
 * Maps variations to standardized names (e.g., Stuyvesant variations to "Stuyvesant High School")
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
// School name standardization mappings
// ---------------------------------------------------------------------------
const SCHOOL_STANDARDIZATION_MAP = {
  // Stuyvesant variations
  'Stuy': 'Stuyvesant High School',
  'Stuyvesant': 'Stuyvesant High School',
  'Stuyvesant HS': 'Stuyvesant High School',
  'Stuyvesant High School': 'Stuyvesant High School',
  'Stuyvesant High': 'Stuyvesant High School',

  // Bronx Science variations
  'Bronx Science': 'Bronx High School of Science',
  'Bronx HS of Science': 'Bronx High School of Science',
  'Bronx High School of Science': 'Bronx High School of Science',

  // Brooklyn Tech variations
  'Brooklyn Tech': 'Brooklyn Technical High School',
  'Brooklyn Technical HS': 'Brooklyn Technical High School',
  'Brooklyn Technical High School': 'Brooklyn Technical High School',

  // Stuyvesant variations with formatting
  'stuyvesant high school': 'Stuyvesant High School',
  'STUYVESANT HIGH SCHOOL': 'Stuyvesant High School',

  // Add more common variations as needed
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
function standardizeSchoolName(name) {
  if (!name || typeof name !== 'string') return name;

  const trimmed = name.trim();

  // Check if we have a direct mapping
  if (SCHOOL_STANDARDIZATION_MAP[trimmed]) {
    return SCHOOL_STANDARDIZATION_MAP[trimmed];
  }

  // Check case-insensitive mapping
  const lowerCase = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(SCHOOL_STANDARDIZATION_MAP)) {
    if (key.toLowerCase() === lowerCase) {
      return value;
    }
  }

  // Return original if no mapping found
  return trimmed;
}

// ---------------------------------------------------------------------------
// Main standardization logic
// ---------------------------------------------------------------------------
async function standardizeSchoolNames(dryRun = true, skipConfirm = false) {
  console.log(`🔍 Standardizing school names...`);
  console.log(`🧪 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}`);

  // Fetch all team members
  const { data: teamMembers, error: teamError } = await supabase
    .from('team')
    .select('id, name, school');

  if (teamError) throw teamError;

  // Fetch all applications
  const { data: applications, error: appError } = await supabase
    .from('applications')
    .select('id, full_name, school_name');

  if (appError) throw appError;

  console.log(`\n📊 Found ${teamMembers.length} team members and ${applications.length} applications`);

  // Process team members
  const teamUpdates = [];
  let teamChanges = 0;

  for (const member of teamMembers) {
    const originalSchool = member.school;
    const standardizedSchool = standardizeSchoolName(originalSchool);

    if (originalSchool !== standardizedSchool) {
      teamUpdates.push({
        id: member.id,
        school: standardizedSchool,
        original: originalSchool,
        standardized: standardizedSchool
      });
      teamChanges++;
    }
  }

  // Process applications
  const appUpdates = [];
  let appChanges = 0;

  for (const application of applications) {
    const originalSchool = application.school_name;
    const standardizedSchool = standardizeSchoolName(originalSchool);

    if (originalSchool !== standardizedSchool) {
      appUpdates.push({
        id: application.id,
        school_name: standardizedSchool,
        original: originalSchool,
        standardized: standardizedSchool,
        fullName: application.full_name
      });
      appChanges++;
    }
  }

  console.log(`\n📝 Changes needed:`);
  console.log(`  Team members: ${teamChanges} updates`);
  console.log(`  Applications: ${appChanges} updates`);

  if (teamChanges === 0 && appChanges === 0) {
    console.log('\n✅ No school names need standardization!');
    return;
  }

  // Show preview of changes
  if (teamUpdates.length > 0) {
    console.log(`\n🏫 Team member school changes (first 10):`);
    for (let i = 0; i < Math.min(10, teamUpdates.length); i++) {
      const update = teamUpdates[i];
      console.log(`  "${update.original}" → "${update.standardized}"`);
    }
    if (teamUpdates.length > 10) {
      console.log(`  ... and ${teamUpdates.length - 10} more`);
    }
  }

  if (appUpdates.length > 0) {
    console.log(`\n📄 Application school changes (first 10):`);
    for (let i = 0; i < Math.min(10, appUpdates.length); i++) {
      const update = appUpdates[i];
      console.log(`  "${update.original}" → "${update.standardized}" (for ${update.fullName})`);
    }
    if (appUpdates.length > 10) {
      console.log(`  ... and ${appUpdates.length - 10} more`);
    }
  }

  if (dryRun) {
    console.log('\n🧪 DRY RUN COMPLETE - No changes were made to the database');
    console.log('   To apply changes, run with --live flag');
    return;
  }

  if (!skipConfirm) {
    // Ask for confirmation before applying changes
    const { createInterface } = await import('node:readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question(`\n⚠️  Apply ${teamChanges + appChanges} school name changes to the database? (y/N): `, resolve);
      rl.close();
    });

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('📝 No changes applied. Review the preview above.');
      return;
    }
  }

  // Apply changes to team members
  if (teamUpdates.length > 0) {
    console.log('\n🔧 Applying team member school name changes...');
    let teamSuccess = 0;
    let teamFailed = 0;

    for (const update of teamUpdates) {
      try {
        await supabase
          .from('team')
          .update({ school: update.standardized })
          .eq('id', update.id);

        console.log(`✅ ${update.name}: "${update.original}" → "${update.standardized}"`);
        teamSuccess++;
      } catch (error) {
        console.error(`❌ Failed to update ${update.name}:`, error.message);
        teamFailed++;
      }
    }

    console.log(`\n📋 Team member update summary:`);
    console.log(`  Successfully updated: ${teamSuccess}`);
    console.log(`  Failed updates: ${teamFailed}`);
  }

  // Apply changes to applications
  if (appUpdates.length > 0) {
    console.log('\n🔧 Applying application school name changes...');
    let appSuccess = 0;
    let appFailed = 0;

    for (const update of appUpdates) {
      try {
        await supabase
          .from('applications')
          .update({ school_name: update.standardized })
          .eq('id', update.id);

        console.log(`✅ ${update.fullName}: "${update.original}" → "${update.standardized}"`);
        appSuccess++;
      } catch (error) {
        console.error(`❌ Failed to update ${update.fullName}:`, error.message);
        appFailed++;
      }
    }

    console.log(`\n📋 Application update summary:`);
    console.log(`  Successfully updated: ${appSuccess}`);
    console.log(`  Failed updates: ${appFailed}`);
  }

  console.log('\n🎉 School name standardization complete!');
}

// ---------------------------------------------------------------------------
// Script execution
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');
const skipConfirm = args.includes('--yes');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node standardizeSchoolNames.mjs [options]

Options:
  --live      Actually apply changes to the database (default is dry-run)
  --yes       Skip confirmation prompt
  --help, -h  Show this help message

Examples:
  node standardizeSchoolNames.mjs          # Preview changes (dry-run)
  node standardizeSchoolNames.mjs --live   # Apply changes to database
  `);
} else {
  standardizeSchoolNames(dryRun, skipConfirm).catch(console.error);
}