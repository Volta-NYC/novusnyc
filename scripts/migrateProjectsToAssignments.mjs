#!/usr/bin/env node
/**
 * migrateProjectsToAssignments.mjs
 * ────────────────────────────────
 * Migration script to convert business trackProjects to Assignment records
 *
 * This script:
 * 1. Reads all businesses with trackProjects data
 * 2. For each track project in each business:
 *    - Creates a new Assignment record
 *    - Maps fields appropriately:
 *      - title: project name or "[Track] Project for [Business Name]"
 *      - description: project notes + any other relevant details
 *      - primaryTrack: the track (Tech/Marketing/Finance)
 *      - credits: determine reasonable value (5 for websites, 3 for others)
 *      - minRole: Analyst (default)
 *      - businessId: link to the business
 *      - capacity: 1 (or teamMembers.length if we want to allow multiple claims?)
 *      - deadline: from deadlines array if present
 *      - status: map projectStatus to new assignment status
 *      - cycleId: use current active cycle
 *
 * Status mapping:
 *   Ongoing → In Progress
 *   Upcoming → Open
 *   Completed → Finalized
 *   Not Started → Open
 *   Discovery → Open
 *   Active → In Progress
 *   On Hold → In Progress (but could be special handling)
 *   Complete → Finalized
 *
 * Usage:
 *   node scripts/migrateProjectsToAssignments.mjs
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
// Helper functions
// ---------------------------------------------------------------------------
function normalizeProjectStatus(value) {
  const raw = String(value ?? '').trim();
  if (['Ongoing', 'Upcoming', 'Completed', 'Not Started', 'Discovery', 'Active', 'On Hold', 'Complete'].includes(raw)) {
    return raw;
  }
  return 'Upcoming'; // default
}

function mapProjectStatusToAssignmentStatus(projectStatus) {
  switch (projectStatus) {
    case 'Ongoing':
    case 'Active':
      return 'In Progress';
    case 'Upcoming':
    case 'Not Started':
    case 'Discovery':
      return 'Open';
    case 'Completed':
    case 'Complete':
      return 'Finalized';
    case 'On Hold':
      return 'In Progress'; // Treat as In Progress for now
    default:
      return 'Open';
  }
}

function getCreditsForTrack(track, notes) {
  // Default credits based on track type
  const baseCredits = {
    Tech: 5,      // Website projects typically worth 5 credits
    Marketing: 3, // Marketing projects worth 3 credits
    Finance: 3    // Finance projects worth 3 credits
  };

  // Could enhance this to parse notes for complexity indicators
  return baseCredits[track] || 3;
}

function getMinRoleForTrack(track) {
  // All migrated projects start as Analyst level
  return 'Analyst';
}

async function getActiveCycleId() {
  const { data: cycles, error } = await supabase
    .from('cycles')
    .select('id')
    .eq('active', true);

  if (error) {
    console.error('Error fetching active cycle:', error);
    throw error;
  }

  if (!cycles || cycles.length === 0) {
    // No active cycle found, create one
    console.log('No active cycle found, creating a new one...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0); // Last day of 3 months from now

    // Generate UUIDs
    const { randomUUID } = await import('crypto');
    const cycleId = randomUUID();

    const cycleData = {
      id: cycleId,
      name: 'Summer 2026',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      active: true,
      credit_targets: {
        Tech: { Analyst: 5, 'Senior Analyst': 10, Associate: 15 },
        Marketing: { Analyst: 5, 'Senior Analyst': 10, Associate: 15 },
        Finance: { Analyst: 5, 'Senior Analyst': 10, Associate: 15 },
        General: { Analyst: 5, 'Senior Analyst': 10, Associate: 15 }
      },
      strike_thresholds: { warning: 50, demotion: 100, reserve: 150 },
      pacing_percent_per_checkin: 20,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    const { data: newCycle, error: createError } = await supabase
      .from('cycles')
      .insert(cycleData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating cycle:', createError);
      throw createError;
    }

    console.log('Created cycle:', newCycle.id);
    return newCycle.id;
  }

  // Use the first active cycle
  return cycles[0].id;
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------
async function migrateProjectsToAssignments() {
  console.log('Starting projects to assignments migration...');

  try {
    // Get active cycle for assignments
    const activeCycleId = await getActiveCycleId();
    console.log(`Using active cycle: ${activeCycleId}`);

    // Fetch all businesses with trackProjects
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, track_projects, project_tracks')
      .not('track_projects', 'is', null);

    if (businessesError) {
      console.error('Error fetching businesses:', businessesError);
      throw businessesError;
    }

    console.log(`Found ${businesses.length} businesses with trackProjects data`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Process each business
    for (const business of businesses) {
      const trackProjects = business.track_projects || {};
      const projectTracks = business.project_tracks || [];

      // Determine which tracks to process
      const tracksToProcess = projectTracks.length > 0
        ? projectTracks
        : Object.keys(trackProjects).filter(key => trackProjects[key]);

      console.log(`\nProcessing business: ${business.name} (ID: ${business.id})`);
      console.log(`  Tracks to process: ${tracksToProcess.join(', ')}`);

      // Process each track
      for (const track of tracksToProcess) {
        const projectInfo = trackProjects[track];

        if (!projectInfo) {
          console.log(`  Skipping ${track}: no project info`);
          skippedCount++;
          continue;
        }

        // Normalize project status
        const projectStatus = normalizeProjectStatus(projectInfo.projectStatus);
        const assignmentStatus = mapProjectStatusToAssignmentStatus(projectStatus);

        // Generate unique title to avoid conflicts
        const baseTitle = projectInfo.teamMembers && projectInfo.teamMembers.length > 0
          ? `${track} Project for ${business.name}`
          : `${track} Project`;

        // Add a unique suffix if needed to avoid duplicate title/track/role combinations
        let title = baseTitle;
        let counter = 0;
        const maxAttempts = 10;

        while (counter < maxAttempts) {
          const checkTitle = counter === 0 ? baseTitle : `${baseTitle} (${counter})`;

          // Check if this title/track/role combination already exists
          const { data: existing, error: checkError } = await supabase
            .from('assignment_catalog')
            .select('id')
            .eq('title', checkTitle)
            .eq('primary_track', track)
            .eq('min_role', 'Analyst') // Most migrated projects use Analyst
            .limit(1);

          if (checkError) {
            console.warn(`Error checking for duplicate title:`, checkError);
            break; // Use the title anyway if we can't check
          }

          if (!existing || existing.length === 0) {
            title = checkTitle;
            break; // Found a unique title
          }

          counter++;

          if (counter >= maxAttempts) {
            // If we can't find a unique title after max attempts, use a timestamp
            title = `${baseTitle} (${Date.now()})`;
          }
        }

        // Generate description from notes
        const description = projectInfo.notes || `Project for ${business.name} in the ${track} track.`;

        // Get credits
        const credits = getCreditsForTrack(track, projectInfo.notes);

        // Get min role
        const minRole = getMinRoleForTrack(track);

        // Get deadline (use first deadline if available)
        const deadline = projectInfo.deadlines && projectInfo.deadlines.length > 0
          ? projectInfo.deadlines[0].date
          : null;

        // Get capacity (number of team members or default to 1)
        const capacity = projectInfo.teamMembers && projectInfo.teamMembers.length > 0
          ? projectInfo.teamMembers.length
          : 1;

        // Generate UUID for assignment
        const { randomUUID } = await import('crypto');
        const assignmentId = randomUUID();

        // Create assignment record
        const assignmentData = {
          id: assignmentId,
          title: title,
          description: description,
          primary_track: track, // Will be Tech, Marketing, or Finance
          credits: credits,
          difficulty: 'Standard', // Default difficulty
          estimated_hours: credits * 2, // Rough estimate: 2 hours per credit
          min_role: minRole, // Will be Analyst, Senior Analyst, or Associate
          business_id: business.id,
          capacity: capacity,
          deadline: deadline,
          status: assignmentStatus,
          cycle_id: activeCycleId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'migration-script'
        };

        console.log(`  Creating ${track} assignment:`);
        console.log(`    Title: ${assignmentData.title}`);
        console.log(`    Status: ${projectStatus} → ${assignmentData.status}`);
        console.log(`    Credits: ${assignmentData.credits}`);
        console.log(`    Capacity: ${assignmentData.capacity}`);

        const { data: assignment, error: assignmentError } = await supabase
          .from('assignment_catalog')
          .insert(assignmentData)
          .select()
          .single();

        if (assignmentError) {
          console.error(`    Error creating assignment:`, assignmentError);
          // Continue with other assignments rather than failing completely
          continue;
        }

        console.log(`    ✓ Created assignment ID: ${assignment.id}`);
        migratedCount++;
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`  Migrated: ${migratedCount} assignments`);
    console.log(`  Skipped: ${skippedCount} projects`);

    if (migratedCount > 0) {
      console.log(`\nNext steps:`);
      console.log(`  1. Verify migrated assignments in the admin UI`);
      console.log(`  2. Update projects page to show businesses only`);
      console.log(`  3. Consider removing old projects interface after verification`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Run migration
// ---------------------------------------------------------------------------
migrateProjectsToAssignments();