-- Clear every row of the retired assignment / credit / strike system.
--
-- Exported first, in full, to Novus-Assignments-Archive.xlsx — 1,021 rows across
-- 14 tables, plus a derived Member Hours sheet converting credits at 5:1. That
-- workbook is the only remaining record; nothing here is recoverable after this
-- migration runs.
--
-- Rows are cleared here but the tables themselves are dropped separately, in
-- 20260821000005, so that production keeps serving while this branch is in
-- review. The assignments table is reused by the pod system and stays.

DELETE FROM assignment_updates;
DELETE FROM assignment_claims;
DELETE FROM assignment_claims_backup_20260729_bulkapprove;
DELETE FROM member_strikes;
DELETE FROM member_strikes_backup_20260729;
DELETE FROM member_credit_adjustments;
DELETE FROM finance_assignments;
DELETE FROM assignments;            -- before templates: assignments.template_id FK
DELETE FROM assignment_templates;
DELETE FROM cycles;

-- The credit-cycle bookkeeping columns on team have no meaning without cycles.
UPDATE team SET
  last_warning_cycle_id         = NULL,
  last_auto_strike_cycle_id     = NULL,
  last_biweekly_checkin_mark    = NULL,
  last_biweekly_checkin_cycle_id = NULL,
  pod                           = NULL
WHERE last_warning_cycle_id IS NOT NULL
   OR last_auto_strike_cycle_id IS NOT NULL
   OR last_biweekly_checkin_mark IS NOT NULL
   OR last_biweekly_checkin_cycle_id IS NOT NULL
   OR pod IS NOT NULL;

-- Retarget rather than delete: this automation is still wanted, now aimed at the
-- members of a pod instead of the claimants of an assignment.
UPDATE automation_configs
   SET label       = 'Pod assignment update',
       description = 'Sent to a pod''s members when a LIT or admin posts an update on one of their assignments.'
 WHERE automation_id = 'assignment_update';

-- Infraction types are kept — the new system finally gives them a trigger
-- (unexcused absence, missed deadline) instead of a workflow nobody opened.

NOTIFY pgrst, 'reload schema';
