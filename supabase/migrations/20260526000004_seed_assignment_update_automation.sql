-- Seed the assignment_update automation config so admins can toggle it
-- and attach a custom template via the Email → Automations panel.

INSERT INTO automation_configs (automation_id, label, description, template_key, enabled)
VALUES (
  'assignment_update',
  'Assignment update',
  'Sent to active claimants when an admin posts an update on an assignment.',
  'assignment_update',
  true
)
ON CONFLICT (automation_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
