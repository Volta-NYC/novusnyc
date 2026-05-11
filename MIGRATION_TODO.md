# Volta NYC Members Portal Migration Checklist

## PHASE 1: The Great Project -> Assignment Migration

### 1. Update Assignment Statuses
- [x] Update Supabase database enums/types for Assignments to be strictly: "Open", "In Progress", "Submitted", "Approved", and "Finalized" (already correct in storage.ts)
- [x] Update frontend types for Assignments to match the new statuses (already correct in catalog page)

### 2. Update Frontend Visibility
- [x] Modify assignment fetching logic so standard Members can ONLY see "Open" assignments
- [x] Ensure Admins see all assignment statuses

### 3. Write and Execute Data Migration Script
- [x] Create script to convert all former tech and marketing "projects" into the new "Assignments" framework
- [x] Mapping logic: Ongoing -> In Progress, Upcoming -> Open, Completed -> Finalized
- [x] Auto-fill reasonable defaults for credits (e.g., 5 for websites) and required roles (e.g., Analyst)
- [x] Move old project "notes" into the new assignment "description"
- [x] Generate appropriate titles for assignments
- [x] Link assignments to their respective Businesses
- [x] Execute migration script (migrated 77 assignments)
- [x] Verify migrated assignments in the admin UI (checked status counts and links)

### 4. Repurpose Projects Tab
- [x] Change the "Projects" tab to act as a "Businesses" directory
- [x] DO NOT delete the database information, just update the data flow and UI labels
- [x] Update UI to reflect that businesses are listed here, while their actual deliverables are in the Assignments tab

### 5. Role-Based Permissions Update
- [x] Update authorization logic across the platform
- [x] Map permissions as follows:
  - Admin access: "Board" and "Senior Associate" roles
  - Regular Member access: "Associate", "Senior Analyst", and "Analyst" roles
- [x] Ensure this is reflected in the UI and routing

## PHASE 2: UI & State Improvements

### 1. Dynamic Table State
- [x] Implement automatic real-time updates via Supabase Postgres change listeners
- [x] Converted all data-fetching pages to subscribe* pattern: for-review, catalog, work, work/[id], team

### 2. Business/Projects Sorting
- [x] Default sort order implemented: 1st by Status (Ongoing, then Upcoming, then Completed), 2nd by Neighborhood, 3rd Alphabetically by Business Name

### 3. School Field Standardization
- [x] Update the Application Form and Team Directory: Change School text input to combobox/creatable-select
- [x] Users can select an existing school or type a new one
- [x] Run Data Cleaning Script: Standardized 14 school name entries (team + applications)
- [x] Standardized Stuyvesant variations → "Stuyvesant High School"
- [x] Standardized Brooklyn Technical and Bronx Science variations

### 4. Global Table Alignment & Padding Fixes
- [x] Fixed shared DataTable component (ui.tsx): changed align-top → align-middle on table cells
- [x] Assignments catalog and team directory already use align-middle with consistent h-9 row heights

## PHASE 3: Original Improvement Plan Execution

### 1. Simplify Member Status
- [x] "Account Created" column removed from ADMIN_COLS (already done)
- [x] Cleaned up dead case "accountCreated" switch arm from team page
- [x] Actions column shows green ✓ if portal account exists, or Invite button if not

### 2. Grade Data Fix (4-Year Offset)
- [x] Ran validation script — no systematic 4-year offset pattern found
- [x] Historical HS graduation years (2021–2025) are correct for alumni; no corrections applied

### 3. Email Templates
- [x] Non-empty subject/body validation before saving (both save-as-new and save-changes paths)
- [x] Duplicate system template seeding prevented via existingKeys.has(def.key) check
- [x] Template usage tracking (usageCount, lastUsedAt) already implemented
- [x] Deleted all 216 duplicate template rows from DB; fresh seed will create 9 clean system templates on next admin visit
- [x] Templates stored in Supabase

### 4. Clean Admin Panel
- [x] "Portal Users" export option was not present in EXPORT_OPTIONS — already clean

### 5. Remove Labels
- [x] Stripped W#/M# codes from visible UI (assignment quick-view modal title, email {{projects}} variable now uses titles instead of codes)

### 6. Infraction Separation
- [x] MemberDrawer is now view-only: shows infraction history, strike revoke, credit adjustments, role/status overrides
- [x] "Issue infraction" removed from MemberDrawer; replaced with a link to /members/team/infractions?memberId=...
- [x] /members/team/infractions page now includes "Issue infraction to member" form (member picker + infraction picker + points override + note)
