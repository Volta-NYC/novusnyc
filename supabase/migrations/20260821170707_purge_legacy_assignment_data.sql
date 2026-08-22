DELETE FROM assignment_updates;
DELETE FROM assignment_claims;
DELETE FROM assignment_claims_backup_20260729_bulkapprove;
DELETE FROM member_strikes;
DELETE FROM member_strikes_backup_20260729;
DELETE FROM member_credit_adjustments;
DELETE FROM finance_assignments;
DELETE FROM assignments;
DELETE FROM assignment_templates;
DELETE FROM cycles;

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
