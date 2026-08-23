-- The rebuilt project/pod automations were configured directly in production.
-- Seed them here as well so a clean environment has the same controls.

INSERT INTO public.email_templates
  (id, key, label, description, subject, body, available_variables, active, updated_at, updated_by)
VALUES
  (gen_random_uuid()::text, 'project_assigned', 'Project assigned', 'Sent to members assigned to a tech project.',
   'You were assigned to {{businessName}}', '<p>Hi {{memberName}},</p><p>You were assigned to <strong>{{businessName}}</strong>{{neighborhoodPart}}.</p><p>{{contactPart}}</p><p><a href="{{portalLink}}">Open the member portal</a></p>',
   ARRAY['memberName','businessName','neighborhoodPart','contactPart','portalLink'], true, now(), 'system'),
  (gen_random_uuid()::text, 'project_draft_ready', 'Project draft ready', 'Sent to tech leadership when a draft is ready.',
   'Draft ready — {{businessName}}', '<p>Hi {{leadName}},</p><p>{{assigneeNames}} marked the draft for <strong>{{businessName}}</strong> ready.</p><p><a href="{{previewUrl}}">Review the draft</a></p>',
   ARRAY['leadName','businessName','assigneeNames','previewUrl'], true, now(), 'system'),
  (gen_random_uuid()::text, 'pod_task_assigned', 'Pod task assigned', 'Sent to members assigned to a pod task.',
   'New task — {{taskTitle}}', '<p>Hi {{memberName}},</p><p>You were assigned <strong>{{taskTitle}}</strong> in {{podName}}.</p><p>{{dueDatePart}}</p><p><a href="{{portalLink}}">Open your work</a></p>',
   ARRAY['memberName','taskTitle','podName','dueDatePart','portalLink'], true, now(), 'system'),
  (gen_random_uuid()::text, 'pod_task_due_soon', 'Pod task due soon', 'Reminder for an incomplete task due within two days.',
   'Due soon — {{taskTitle}}', '<p>Hi {{memberName}},</p><p><strong>{{taskTitle}}</strong> for {{podName}} is due {{dueDate}}.</p><p><a href="{{portalLink}}">Open your work</a></p>',
   ARRAY['memberName','taskTitle','podName','dueDate','portalLink'], true, now(), 'system'),
  (gen_random_uuid()::text, 'pod_meeting_reminder', 'Pod meeting reminder', 'Reminder for an upcoming pod meeting.',
   '{{podName}} meets {{meetingDate}}', '<p>Hi {{memberName}},</p><p><strong>{{meetingTitle}}</strong> is scheduled for {{meetingDate}}.</p><p><a href="{{portalLink}}">Open the pod</a></p>',
   ARRAY['memberName','podName','meetingTitle','meetingDate','portalLink'], true, now(), 'system'),
  (gen_random_uuid()::text, 'pod_attendance_missing', 'Attendance missing', 'Reminds a LIT to finalize a past meeting roster.',
   'Attendance needed — {{podName}}', '<p>Hi {{litName}},</p><p>Please finish attendance for the {{podName}} meeting on {{meetingDate}}.</p><p><a href="{{portalLink}}">Finish attendance</a></p>',
   ARRAY['litName','podName','meetingDate','portalLink'], true, now(), 'system'),
  (gen_random_uuid()::text, 'infraction_issued', 'Infraction issued', 'Notifies a member after an infraction is recorded.',
   'Notice — {{infractionName}}', '<p>Hi {{memberName}},</p><p><strong>{{infractionName}}</strong> ({{points}} points) was recorded.</p><p>{{notePart}}</p><p>Your current total is {{totalPoints}}; {{standing}}.</p>',
   ARRAY['memberName','infractionName','points','notePart','totalPoints','standing'], true, now(), 'system'),
  (gen_random_uuid()::text, 'service_hours_summary', 'Service hours summary', 'Reserved for certified service-hour letters.',
   'Your Novus service hours', '<p>Hi {{memberName}},</p><p>Your certified service-hours summary is ready.</p>',
   ARRAY['memberName'], true, now(), 'system')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.automation_configs
  (automation_id, label, description, template_key, enabled, updated_at, updated_by)
VALUES
  ('project_assigned', 'Project assigned', 'Sent when someone is assigned to a tech project.', 'project_assigned', true, now(), 'system'),
  ('project_draft_ready', 'Project draft ready', 'Sent to tech leadership when a draft is ready.', 'project_draft_ready', true, now(), 'system'),
  ('pod_task_assigned', 'Pod task assigned', 'Sent when a pod task is assigned.', 'pod_task_assigned', true, now(), 'system'),
  ('pod_task_due_soon', 'Pod task due soon', 'Reminder for tasks due within two days.', 'pod_task_due_soon', true, now(), 'system'),
  ('pod_meeting_reminder', 'Pod meeting reminder', 'Reminder for an upcoming pod meeting.', 'pod_meeting_reminder', true, now(), 'system'),
  ('pod_attendance_missing', 'Attendance missing', 'Reminds a LIT until the complete roster is finalized.', 'pod_attendance_missing', true, now(), 'system'),
  ('infraction_issued', 'Infraction issued', 'Sent when an infraction is recorded.', 'infraction_issued', true, now(), 'system'),
  ('service_hours_summary', 'Service hours summary', 'Disabled until certified letters are built.', 'service_hours_summary', false, now(), 'system')
ON CONFLICT (automation_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
