-- Creates the automation_configs table, seeds all system email templates, and
-- links each automation to its default template key.

-- ── TABLE ─────────────────────────────────────────────────────────────────────

create table if not exists automation_configs (
  automation_id text primary key,          -- stable slug, e.g. "cycle_warning"
  label         text not null,
  description   text not null default '',
  template_key  text,                       -- references email_templates.key; null = disabled
  enabled       boolean not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    text not null default 'system'
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table automation_configs enable row level security;

create policy "Owners and admins can read automation_configs"
  on automation_configs for select
  using (my_auth_role() in ('owner', 'admin'));

create policy "Owners can write automation_configs"
  on automation_configs for all
  using (my_auth_role() = 'owner')
  with check (my_auth_role() = 'owner');

-- ── REALTIME ──────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table automation_configs;

-- ── SEED EMAIL TEMPLATES ──────────────────────────────────────────────────────
-- ON CONFLICT DO NOTHING so re-running the migration is idempotent.

insert into email_templates (id, key, label, description, subject, body, available_variables) values

(gen_random_uuid(), 'biweekly_checkin', 'Biweekly check-in',
 'Sent automatically every 14 days to active members during a cycle.',
 '{{cycleName}} — biweekly check-in',
 '<p>Hey {{memberName}},</p><p>Quick biweekly check-in for {{cycleName}}. You''re currently at <strong>{{creditsEarned}} of {{creditsTarget}}</strong> credits.</p><p>Aim for ~{{pacingPercent}}% of your target every two weeks. Browse the marketplace on the portal for available work.</p>',
 array['{{memberName}}','{{cycleName}}','{{creditsEarned}}','{{creditsTarget}}','{{pacingPercent}}']),

(gen_random_uuid(), 'orange_pace_warning', 'Orange pace warning',
 'Sent once per cycle when a member''s dot turns orange (behind pace).',
 'Heads up — you''re behind pace on {{cycleName}}',
 '<p>Hey {{memberName}},</p><p>You''re at {{creditsEarned}} of {{creditsTarget}} credits for {{cycleName}}, which puts you {{checkInsBehind}} check-ins behind pace. Please claim something from the marketplace soon.</p>',
 array['{{memberName}}','{{cycleName}}','{{creditsEarned}}','{{creditsTarget}}','{{checkInsBehind}}']),

(gen_random_uuid(), 'red_pace_strike', 'Red pace — auto strike',
 'Sent once per cycle when a member''s dot turns red and an automatic strike is issued.',
 'Strike issued — {{cycleName}}',
 '<p>Hi {{memberName}},</p><p>An automatic strike was issued: <strong>{{strikeReason}}</strong>.</p><p>Current standing: {{creditsEarned}} of {{creditsTarget}} credits, {{strikeCount}} strikes total.</p>',
 array['{{memberName}}','{{cycleName}}','{{creditsEarned}}','{{creditsTarget}}','{{strikeReason}}','{{strikeCount}}']),

(gen_random_uuid(), 'interview_invite', 'Interview invite',
 'Sent to applicants who have been invited to schedule an interview.',
 'Next Steps: Volta Interview Invitation',
 '<div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111"><p>Dear {{applicantName}},</p><p>Congratulations! You have been invited to the next stage of the selection process.</p><p>While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Volta and the work we''re doing with our current business partners.</p><p><strong>Next Steps:</strong> We''d like to schedule a formal interview to discuss your placement within the team and your specific interests.</p><p>Your interview will take place <strong>next week</strong>. Please secure your time slot within the next 48 hours:</p><p><a href="{{bookingLink}}" style="display:inline-block;background-color:#85CC17;color:#ffffff;padding:4px 12px;border-radius:3px;text-decoration:none;font-size:12px">Book Your Interview Slot</a></p><p>We look forward to learning more about you.</p><p>Sincerely,<br>Ethan Zhang<br>Volta NYC</p></div>',
 array['{{applicantName}}','{{bookingLink}}']),

(gen_random_uuid(), 'interview_invite_reminder', 'Interview invite reminder',
 'Reminder sent to applicants who haven''t booked their interview yet.',
 'Reminder: book your Volta interview',
 '<p>Hi {{applicantName}},</p><p>Quick reminder to book your Volta interview slot:</p><p><a href="{{bookingLink}}">{{bookingLink}}</a></p><p>Please use the same name and email you used in your application.</p><p>Best,<br>Ethan Zhang</p>',
 array['{{applicantName}}','{{bookingLink}}']),

(gen_random_uuid(), 'applicant_accepted', 'Applicant accepted',
 'Sent to accepted applicants who already have a confirmed portal account.',
 'Congratulations — You''ve been accepted to Volta NYC',
 '<div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111"><p>Hi {{firstName}},</p><p>Congratulations! You''ve been accepted to Volta NYC.</p><p>You''ll be assigned to a project within the next week. Your team, tasks, and project details are organized in the member portal — sign in at <a href="https://voltanyc.org/members" style="color:#85CC17">voltanyc.org/members</a>.</p><p>Best,<br>Ethan Zhang<br>Volta NYC</p></div>',
 array['{{applicantName}}','{{firstName}}']),

(gen_random_uuid(), 'interview_booked', 'Interview booked (applicant)',
 'Confirmation sent to the applicant after they book an interview slot.',
 'Volta interview Confirmation',
 '<p>Hi {{applicantName}},</p><p>Your Volta interview is confirmed.</p><p><strong>Time:</strong> {{interviewTime}}<br><strong>Zoom:</strong> {{zoomLink}}</p><p><a href="{{googleCalendarUrl}}">Add to Google Calendar</a><br>A calendar invite (.ics) is attached to this email.</p><p>If you need to reschedule, please do so through the booking portal at voltanyc.org/book. If you have any trouble, reply to this email and we''ll sort it out.</p><p>We look forward to speaking with you.</p><p>Best,<br>Ethan Zhang</p>',
 array['{{applicantName}}','{{interviewTime}}','{{zoomLink}}','{{googleCalendarUrl}}']),

(gen_random_uuid(), 'interview_rescheduled', 'Interview rescheduled (applicant)',
 'Sent to the applicant when they reschedule their interview.',
 'Volta interview Rescheduled',
 '<p>Hi {{applicantName}},</p><p>Your <strong>Volta interview</strong> has been rescheduled.</p><p><strong>Previous time:</strong> {{previousTime}}<br><strong>New time:</strong> {{interviewTime}}<br><strong>Zoom:</strong> {{zoomLink}}</p><p><a href="{{googleCalendarUrl}}">Open in Google Calendar</a><br>A fresh calendar invite (.ics) is attached.</p><p>If you need to reschedule again, please do so through the booking portal at voltanyc.org/book. If you have any trouble, reply to this email.</p><p>Best,<br>Ethan Zhang</p>',
 array['{{applicantName}}','{{previousTime}}','{{interviewTime}}','{{zoomLink}}','{{googleCalendarUrl}}']),

(gen_random_uuid(), 'interviewer_booking_notify', 'Interviewer — new booking',
 'Sent to the Volta interviewer when an applicant books their slot.',
 'New Volta interview Scheduled',
 '<p>Hi {{interviewerName}},</p><p>A new interview has been scheduled for one of your available slots.</p><p><strong>Candidate:</strong> {{applicantName}}<br><strong>Time:</strong> {{interviewTime}}<br><strong>Zoom:</strong> {{zoomLink}}</p><p>You can review details in the member interview panel.</p>',
 array['{{interviewerName}}','{{applicantName}}','{{interviewTime}}','{{zoomLink}}']),

(gen_random_uuid(), 'interviewer_reschedule_notify', 'Interviewer — reschedule',
 'Sent to the Volta interviewer when an applicant reschedules to their slot.',
 'Volta interview Rescheduled to Your Slot',
 '<p>Hi {{interviewerName}},</p><p>An interview has been rescheduled to one of your available slots.</p><p><strong>Candidate:</strong> {{applicantName}}<br><strong>Previous time:</strong> {{previousTime}}<br><strong>New time:</strong> {{interviewTime}}<br><strong>Zoom:</strong> {{zoomLink}}</p><p>You can review details in the member interview panel.</p>',
 array['{{interviewerName}}','{{applicantName}}','{{previousTime}}','{{interviewTime}}','{{zoomLink}}']),

(gen_random_uuid(), 'invite', 'Member invite',
 'Sent by admin when inviting a new member to create their portal account.',
 'Set up your Volta NYC member portal account',
 '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a"><img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="margin-bottom:24px"><h2 style="margin:0 0 8px;font-size:20px">Set up your member portal account</h2><p style="margin:0 0 24px;color:#555;font-size:15px">Hi {{firstName}}, you''ve been invited to join the Volta NYC member portal.</p><a href="{{link}}" style="display:inline-block;background:#85CC17;color:#0d0d0d;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px">Set Up Account</a><p style="margin:24px 0 0;font-size:13px;color:#888">If you didn''t expect this email, you can safely ignore it.</p></body></html>',
 array['{{name}}','{{firstName}}','{{link}}']),

(gen_random_uuid(), 'demotion_notice', 'Demotion notice',
 'Sent when a member is demoted due to accumulated strikes.',
 'Your Volta NYC membership status has changed',
 '<p>Hi {{memberName}},</p><p>Due to accumulated strikes, your membership status has been updated. Please reach out if you have questions.</p>',
 array['{{memberName}}']),

(gen_random_uuid(), 'cycle_start', 'Cycle start',
 'Sent to all active members at the start of a new cycle.',
 '{{cycleName}} has started — here''s what you need to know',
 '<p>Hey {{memberName}},</p><p>A new cycle, <strong>{{cycleName}}</strong>, has just started. Your credit target for this cycle is <strong>{{creditsTarget}}</strong>.</p><p>Head to the portal to see available assignments and claim your first one.',
 array['{{memberName}}','{{cycleName}}','{{creditsTarget}}']),

(gen_random_uuid(), 'cycle_end_summary', 'Cycle end summary',
 'Sent to all active members at the end of a cycle with their credit summary.',
 '{{cycleName}} wrap-up — your summary',
 '<p>Hey {{memberName}},</p><p>{{cycleName}} has ended. You earned <strong>{{creditsEarned}}</strong> of <strong>{{creditsTarget}}</strong> credits.</p>',
 array['{{memberName}}','{{cycleName}}','{{creditsEarned}}','{{creditsTarget}}']),

(gen_random_uuid(), 'assignment_approved', 'Assignment approved',
 'Sent to a member when their submitted assignment is approved.',
 'Your assignment has been approved — {{assignmentTitle}}',
 '<p>Hi {{memberName}},</p><p>Your submission for <strong>{{assignmentTitle}}</strong> has been approved. You''ve earned <strong>{{creditsEarned}}</strong> credits.</p>',
 array['{{memberName}}','{{assignmentTitle}}','{{creditsEarned}}']),

(gen_random_uuid(), 'assignment_rejected', 'Assignment rejected',
 'Sent to a member when their submitted assignment is rejected.',
 'Revision needed — {{assignmentTitle}}',
 '<p>Hi {{memberName}},</p><p>Your submission for <strong>{{assignmentTitle}}</strong> needs revision. Please check the portal for reviewer feedback.</p>',
 array['{{memberName}}','{{assignmentTitle}}']),

(gen_random_uuid(), 'infraction_notice', 'Infraction notice',
 'Sent when a manual infraction / strike is issued to a member.',
 'Strike issued — {{infractionName}}',
 '<p>Hi {{memberName}},</p><p>A strike has been issued: <strong>{{infractionName}}</strong>.</p><p>If you have questions, reach out to your team lead.</p>',
 array['{{memberName}}','{{infractionName}}']),

(gen_random_uuid(), 'monthly_portal_reminder', 'Monthly portal reminder',
 'Monthly reminder for all active members to log into the portal.',
 'Monthly reminder: check the Volta portal',
 '<p>Hey {{memberName}},</p><p>Just a quick reminder to log in to the <a href="https://voltanyc.org/members">member portal</a> and check for any open assignments or updates.</p>',
 array['{{memberName}}'])

on conflict (key) do nothing;

-- ── SEED AUTOMATION CONFIGS ───────────────────────────────────────────────────

insert into automation_configs (automation_id, label, description, template_key, enabled) values

('cycle_biweekly',              'Biweekly check-in',                'Fires every 14 days per active member during a cycle.',                          'biweekly_checkin',            true),
('cycle_warning',               'Orange pace warning',              'Fires once per cycle when a member''s dot turns orange.',                         'orange_pace_warning',         true),
('cycle_strike',                'Red pace — auto strike',           'Fires once per cycle when a member''s dot turns red and issues a strike.',        'red_pace_strike',             true),
('interview_invite',            'Interview invite',                 'Sent when an applicant is invited to schedule an interview.',                     'interview_invite',            true),
('interview_invite_reminder',   'Interview invite reminder',        'Reminder sent when an applicant hasn''t booked yet.',                             'interview_invite_reminder',   true),
('applicant_accepted',          'Applicant accepted',               'Sent to accepted applicants who already have a confirmed portal account.',        'applicant_accepted',          true),
('interview_booked',            'Interview booked (applicant)',     'Confirmation sent to the applicant after they book a slot.',                     'interview_booked',            true),
('interview_rescheduled',       'Interview rescheduled (applicant)','Sent when an applicant reschedules their interview.',                             'interview_rescheduled',       true),
('interviewer_booking_notify',  'Interviewer — new booking',        'Notifies the Volta interviewer when a slot is booked.',                          'interviewer_booking_notify',  true),
('interviewer_reschedule_notify','Interviewer — reschedule',        'Notifies the Volta interviewer when a booking is rescheduled to their slot.',    'interviewer_reschedule_notify',true),
('member_invite',               'Member invite',                    'Sent when inviting a new member to create their portal account.',                 'invite',                      true),
('member_setup_link',           'Portal setup link',                'Sent when a member requests a fresh account-setup link.',                        'setup-link',                  true),
('demotion_notice',             'Demotion notice',                  'Sent when a member is demoted due to accumulated strikes.',                       'demotion_notice',             false),
('cycle_start',                 'Cycle start',                      'Sent to all active members at the start of a new cycle.',                        'cycle_start',                 false),
('cycle_end_summary',           'Cycle end summary',                'Sent to all active members at the end of a cycle.',                               'cycle_end_summary',           false),
('assignment_approved',         'Assignment approved',              'Sent when a submitted assignment is approved.',                                   'assignment_approved',         false),
('assignment_rejected',         'Assignment rejected',              'Sent when a submitted assignment needs revision.',                                'assignment_rejected',         false)

on conflict (automation_id) do nothing;
