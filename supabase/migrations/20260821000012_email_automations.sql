-- Email automations, rebuilt for the pod and project system.
--
-- Eight automations still pointed at the retired credit/cycle system — pace
-- warnings, auto-strikes, cycle start and end summaries, assignment approval
-- and rejection. All were disabled and unreachable, but they still filled the
-- Automations page with settings that could never fire.
--
-- Eight replace them, covering the two things the new system actually runs on:
-- pod meetings and the work assigned off the back of them, plus tech projects.
--
-- The load-bearing one is pod_attendance_missing. Hours, infractions and
-- service letters all wait on a LIT filling in the grid, so that is the only
-- place worth applying real pressure.

-- Retire the credit/cycle automations and their templates.
DELETE FROM automation_configs WHERE automation_id IN ('assignment_approved', 'assignment_rejected', 'cycle_biweekly', 'cycle_end_summary', 'cycle_start', 'cycle_strike', 'cycle_warning', 'demotion_notice');
DELETE FROM email_templates   WHERE key IN ('assignment_approved', 'assignment_rejected', 'biweekly_checkin', 'cycle_end_summary', 'cycle_start', 'demotion_notice', 'orange_pace_warning', 'red_pace_strike', 'monthly_portal_reminder', 'infraction_notice');

-- available_variables was stored with the braces included on most rows, so the
-- variable picker offered {{{{memberName}}}}. Strip them.
UPDATE email_templates
   SET available_variables = ARRAY(
         SELECT regexp_replace(v, '^\{\{\s*|\s*\}\}$', '', 'g')
           FROM unnest(available_variables) AS v)
 WHERE EXISTS (SELECT 1 FROM unnest(available_variables) AS v WHERE v LIKE '{{%');

-- Assignment update is a pod thing now.
UPDATE email_templates SET label = 'Pod assignment update' WHERE key = 'assignment_update';

INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('pod_meeting_reminder', 'pod_meeting_reminder', 'Pod meeting reminder', '', '{{podName}} meets tomorrow — {{meetingDate}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;"><strong>{{podName}}</strong> meets tomorrow, {{meetingDate}}.</p><div style="margin:14px 0;padding:12px 16px;border-left:3px solid #F6B78D;background:#FDF7F2;border-radius:0 6px 6px 0;"><p style="margin:0;">{{meetingTitle}}</p></div><p style="margin:0 0 14px;">If you can''t make it, tell your LIT beforehand — an absence they know about is excused, one they don''t is not.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'podName', 'meetingDate', 'meetingTitle', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('pod_attendance_missing', 'pod_attendance_missing', 'Attendance not filled in (LIT)', '', 'Attendance still open for {{podName}} — {{meetingDate}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{litName}},</p><p style="margin:0 0 14px;">The <strong>{{podName}}</strong> meeting on {{meetingDate}} has no attendance saved yet. It takes about a minute: the roster is already filled in and everyone starts marked Present, so you only mark the exceptions.</p><p style="margin:0 0 14px;">Until it''s saved, nobody in the pod earns hours for that meeting, and none of it reaches their service letter.</p><p style="margin:0 0 14px;"><a href="{{portalLink}}" style="color:#8C4A1D;font-weight:600;">Fill in attendance →</a></p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['litName', 'podName', 'meetingDate', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('pod_task_assigned', 'pod_task_assigned', 'Task assigned', '', 'New task: {{taskTitle}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;">You''ve been assigned a task in <strong>{{podName}}</strong>.</p><div style="margin:14px 0;padding:12px 16px;border-left:3px solid #F6B78D;background:#FDF7F2;border-radius:0 6px 6px 0;"><p style="margin:0 0 4px;font-weight:600;">{{taskTitle}}</p><p style="margin:0;color:#666;">{{dueDatePart}}</p></div><p style="margin:0 0 14px;">Mark it done in the portal when you finish so the hours land on your record.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'taskTitle', 'podName', 'dueDatePart', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('pod_task_due_soon', 'pod_task_due_soon', 'Task due soon', '', 'Due {{dueDate}}: {{taskTitle}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;"><strong>{{taskTitle}}</strong> ({{podName}}) is due {{dueDate}}.</p><p style="margin:0 0 14px;">If it''s already done, mark it in the portal. If it''s going to be late, tell your LIT — a missed deadline nobody hears about is what earns an infraction.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'taskTitle', 'podName', 'dueDate', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('project_assigned', 'project_assigned', 'Website project assigned', '', 'You''re building {{businessName}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;">You''ve been assigned to build the website for <strong>{{businessName}}</strong>{{neighborhoodPart}}.</p><div style="margin:14px 0;padding:12px 16px;border-left:3px solid #F6B78D;background:#FDF7F2;border-radius:0 6px 6px 0;"><p style="margin:0 0 4px;">{{contactPart}}</p><p style="margin:0;color:#666;">Everything else — notes, links, status — is on the project in the portal.</p></div><p style="margin:0 0 14px;">Move it to <strong>Draft Ready</strong> once there''s a preview link worth showing the client.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'businessName', 'neighborhoodPart', 'contactPart', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('project_draft_ready', 'project_draft_ready', 'Draft ready for review (tech lead)', '', '{{businessName}} is ready for review', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{leadName}},</p><p style="margin:0 0 14px;"><strong>{{businessName}}</strong> has been moved to Draft Ready by {{assigneeNames}}.</p><p style="margin:0 0 14px;"><a href="{{previewUrl}}" style="color:#8C4A1D;font-weight:600;">Open the preview →</a></p><p style="margin:0 0 14px;">If it''s good to send, move it to With Client.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['leadName', 'businessName', 'assigneeNames', 'previewUrl', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('infraction_issued', 'infraction_issued', 'Infraction issued', '', 'An infraction was recorded on your Novus record', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;">An infraction was recorded on your record:</p><div style="margin:14px 0;padding:12px 16px;border-left:3px solid #F6B78D;background:#FDF7F2;border-radius:0 6px 6px 0;"><p style="margin:0 0 4px;font-weight:600;">{{infractionName}} ({{points}} points)</p><p style="margin:0;color:#666;">{{notePart}}</p></div><p style="margin:0 0 14px;">You''re now at <strong>{{totalPoints}} points</strong> — {{standing}}.</p><p style="margin:0 0 14px;">If you think this is wrong, reply to this email and we''ll look at it.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'infractionName', 'points', 'notePart', 'totalPoints', 'standing', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_at)
VALUES ('service_hours_summary', 'service_hours_summary', 'Service hours summary', '', 'Your Novus service hours — {{periodLabel}}', '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1a1a1a;max-width:520px;"><p style="margin:0 0 14px;">Hi {{memberName}},</p><p style="margin:0 0 14px;">Here''s what you did with Novus in {{periodLabel}}.</p><div style="margin:14px 0;padding:12px 16px;border-left:3px solid #F6B78D;background:#FDF7F2;border-radius:0 6px 6px 0;"><p style="margin:0 0 6px;font-size:22px;font-weight:700;">{{totalHours}} hours</p><p style="margin:0;color:#666;">{{breakdown}}</p></div><p style="margin:0 0 14px;">Department: {{departments}}</p><p style="margin:0 0 14px;">Need this as a signed service letter for school or an application? Reply and we''ll send one.</p>
<p style="margin:22px 0 0;font-size:12px;color:#888;">Novus NYC · <a href="{{portalLink}}" style="color:#8C4A1D;">member portal</a></p></div>', ARRAY['memberName', 'periodLabel', 'totalHours', 'breakdown', 'departments', 'portalLink']::text[], true, now())
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label, subject = EXCLUDED.subject, body = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables, active = true, updated_at = now();

INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('pod_meeting_reminder', 'Pod meeting reminder', 'Sent to a pod''s members 24 hours before a scheduled meeting.', 'pod_meeting_reminder', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('pod_attendance_missing', 'Attendance not filled in', 'Sent to a pod''s LITs 24 hours after a meeting whose attendance is still unsaved. Everything downstream — hours, infractions, service letters — waits on this.', 'pod_attendance_missing', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('pod_task_assigned', 'Task assigned', 'Sent to a member when a task is assigned to them in a pod.', 'pod_task_assigned', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('pod_task_due_soon', 'Task due soon', 'Sent to a member 48 hours before one of their pod tasks is due.', 'pod_task_due_soon', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('project_assigned', 'Website project assigned', 'Sent to a member when they are added to a tech project, with the client''s contact details.', 'project_assigned', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('project_draft_ready', 'Draft ready for review', 'Sent to tech leads when a project moves to Draft Ready.', 'project_draft_ready', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('infraction_issued', 'Infraction issued', 'Sent to a member when an infraction is recorded, with their running total and standing.', 'infraction_issued', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();
INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_at)
VALUES ('service_hours_summary', 'Service hours summary', 'Semi-annual summary of a member''s hours, the basis for their service letter.', 'service_hours_summary', true, now())
ON CONFLICT (automation_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  template_key = EXCLUDED.template_key, updated_at = now();

NOTIFY pgrst, 'reload schema';
-- Sent-markers for the scheduled sweep, so a second run in the same day sends
-- nothing twice. These fire with nobody watching, which is exactly when a
-- duplicate would go unnoticed.
ALTER TABLE pod_meetings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_sent_at    timestamptz;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at timestamptz;

NOTIFY pgrst, 'reload schema';
