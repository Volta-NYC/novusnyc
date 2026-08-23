DELETE FROM automation_configs WHERE automation_id IN ('assignment_approved', 'assignment_rejected', 'cycle_biweekly', 'cycle_end_summary', 'cycle_start', 'cycle_strike', 'cycle_warning', 'demotion_notice');

DELETE FROM email_templates WHERE key IN ('assignment_approved', 'assignment_rejected', 'biweekly_checkin', 'cycle_end_summary', 'cycle_start', 'demotion_notice', 'orange_pace_warning', 'red_pace_strike', 'monthly_portal_reminder', 'infraction_notice');

UPDATE email_templates
   SET available_variables = ARRAY(
         SELECT regexp_replace(v, '^\{\{\s*|\s*\}\}$', '', 'g')
           FROM unnest(available_variables) AS v)
 WHERE EXISTS (SELECT 1 FROM unnest(available_variables) AS v WHERE v LIKE '{{%');

UPDATE email_templates SET label = 'Pod assignment update' WHERE key = 'assignment_update';

NOTIFY pgrst, 'reload schema';
