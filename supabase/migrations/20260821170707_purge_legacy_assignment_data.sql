DELETE FROM assignment_updates;
DELETE FROM assignment_claims;
DELETE FROM member_strikes;
DELETE FROM member_credit_adjustments;
DELETE FROM finance_assignments;
DELETE FROM assignments;
DELETE FROM assignment_templates;
DELETE FROM cycles;

-- These two emergency backup tables existed in production when this migration
-- ran, but were never part of the repository schema. A fresh database must be
-- able to replay the history without failing on tables it never created.
DO $block$
BEGIN
  IF to_regclass('public.assignment_claims_backup_20260729_bulkapprove') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.assignment_claims_backup_20260729_bulkapprove';
  END IF;
  IF to_regclass('public.member_strikes_backup_20260729') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.member_strikes_backup_20260729';
  END IF;
END
$block$;

UPDATE team SET
  last_warning_cycle_id          = NULL,
  last_auto_strike_cycle_id      = NULL,
  last_biweekly_checkin_mark     = NULL,
  last_biweekly_checkin_cycle_id = NULL,
  pod                            = NULL
WHERE last_warning_cycle_id IS NOT NULL
   OR last_auto_strike_cycle_id IS NOT NULL
   OR last_biweekly_checkin_mark IS NOT NULL
   OR last_biweekly_checkin_cycle_id IS NOT NULL
   OR pod IS NOT NULL;

UPDATE automation_configs
   SET label       = 'Pod assignment update',
       description = 'Sent to a pod''s members when a LIT or admin posts an update on one of their assignments.'
 WHERE automation_id = 'assignment_update';
