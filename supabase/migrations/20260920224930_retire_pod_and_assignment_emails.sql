-- Nothing fires these any more. Pod task and meeting mail went with the pod
-- workflow, and website projects no longer carry assignees, so the
-- "assigned to a project" note has no trigger left.
delete from public.automation_configs where automation_id in (
  'pod_task_assigned',
  'pod_task_due_soon',
  'pod_meeting_reminder',
  'pod_attendance_missing',
  'project_assigned'
);

delete from public.email_templates where key in (
  'pod_task_assigned',
  'pod_task_due_soon',
  'pod_meeting_reminder',
  'pod_attendance_missing',
  'project_assigned'
);

delete from public.automation_deliveries where automation_id in (
  'pod_task_assigned',
  'pod_task_due_soon',
  'pod_meeting_reminder',
  'pod_attendance_missing',
  'project_assigned'
);

notify pgrst, 'reload schema';
