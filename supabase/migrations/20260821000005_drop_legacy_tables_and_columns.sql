-- DEPLOY-TIME MIGRATION — apply when this branch merges, not before.
--
-- Everything here removes structure that main's deployed code still reads. The
-- rows are already gone (20260821000004); this is the structural cleanup, held
-- back so production keeps serving during review. `supabase db push` on deploy
-- runs it in the same step that ships the new code.

DROP TABLE IF EXISTS assignment_claims CASCADE;
DROP TABLE IF EXISTS assignment_claims_backup_20260729_bulkapprove CASCADE;
DROP TABLE IF EXISTS member_strikes_backup_20260729 CASCADE;
DROP TABLE IF EXISTS member_credit_adjustments CASCADE;
DROP TABLE IF EXISTS finance_assignments CASCADE;
DROP TABLE IF EXISTS cycles CASCADE;
DROP TABLE IF EXISTS projects CASCADE;          -- 0 rows; superseded by businesses

-- Credit-era columns on the assignment table now used by pods.
ALTER TABLE assignments
  DROP COLUMN IF EXISTS credits,
  DROP COLUMN IF EXISTS credits_max,
  DROP COLUMN IF EXISTS credits_note,
  DROP COLUMN IF EXISTS cycle_id,
  DROP COLUMN IF EXISTS min_role,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS seed_key,
  DROP COLUMN IF EXISTS region,
  DROP COLUMN IF EXISTS team_label;

ALTER TABLE assignment_templates
  DROP COLUMN IF EXISTS credits,
  DROP COLUMN IF EXISTS credits_max,
  DROP COLUMN IF EXISTS credits_note,
  DROP COLUMN IF EXISTS min_role,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS application_required,
  DROP COLUMN IF EXISTS requires_approval,
  DROP COLUMN IF EXISTS allow_multiple_completions;

ALTER TABLE team
  DROP COLUMN IF EXISTS pod,                            -- replaced by pod_members
  DROP COLUMN IF EXISTS last_warning_cycle_id,
  DROP COLUMN IF EXISTS last_auto_strike_cycle_id,
  DROP COLUMN IF EXISTS last_biweekly_checkin_mark,
  DROP COLUMN IF EXISTS last_biweekly_checkin_cycle_id;

-- Showcase columns that shadowed a field already on the same row. showcase_name
-- differed from name in 0 of 137 records.
ALTER TABLE businesses
  DROP COLUMN IF EXISTS showcase_name,
  DROP COLUMN IF EXISTS showcase_neighborhood,
  DROP COLUMN IF EXISTS showcase_services,
  DROP COLUMN IF EXISTS showcase_status,
  DROP COLUMN IF EXISTS showcase_url,          -- split into preview_url / live_url
  DROP COLUMN IF EXISTS website,               -- split into client_url / live_url
  DROP COLUMN IF EXISTS team_members,          -- replaced by assignees
  DROP COLUMN IF EXISTS github_url,            -- 0 rows populated
  DROP COLUMN IF EXISTS team_lead,             -- 0 rows populated
  DROP COLUMN IF EXISTS client_notes,          -- 0 rows populated
  DROP COLUMN IF EXISTS division;              -- superseded by project_tracks

NOTIFY pgrst, 'reload schema';
