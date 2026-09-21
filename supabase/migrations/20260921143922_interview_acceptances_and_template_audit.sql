-- Interview variants of the acceptance emails, and the last hard-coded wording.
--
-- 1. "Interview?" on accept sends a copy of the team welcome with one extra
--    line linking to a booking page. The five copies are taken from the live
--    welcomes as they stand today, so any wording edited in the portal carries
--    over. The booking page lives in site_settings, edited on the Applicants
--    page beside the WhatsApp links.
--
-- 2. The interviewer notifications were written in code, with no row the
--    Emails page could show or edit. They are now two templates. The wording
--    is what the code sent, plus the standard sign-off.
--
-- 3. The applicant interview emails say "Meeting: {{zoomLink}}". A link token
--    is dropped unless it is a URL, so with Zoom switched off in interview
--    settings the line printed nothing at all. {{zoomDetails}} carries the
--    link or "will be provided separately".
--
-- 4. Password reset, member invite and setup link had automation rows whose
--    switch nothing read: those emails always sent. Their switch is gone from
--    the Emails page, so the rows go too.
--
-- Replay-safe: column add and inserts are guarded, replaces are no-ops once
-- applied, and the delete targets rows that no longer exist on a second run.

alter table site_settings
  add column if not exists acceptance_booking_link text;

update site_settings
   set acceptance_booking_link = coalesce(acceptance_booking_link, 'https://calendar.app.google/SvDwRYgEjfve3Tkf8')
 where id = 'singleton';

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('acceptance_interview_outreach', 'acceptance_interview_outreach', 'Acceptance + interview — Small Business Outreach',
        'When an applicant is accepted into Small Business Outreach with Interview? ticked',
        'Welcome to Novus Small Business Outreach',
        $body$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Small Business Outreach team within our Marketing department.</p>
<p>You’ll help us find and connect with small businesses that could benefit from our website and marketing services. Your work will include researching businesses, reaching out to owners, and learning about what they need so we can identify where Novus can help.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>We’d also like to meet you. Please <a href="{{bookingLink}}">book a short interview</a> at a time that works for you.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['firstName', 'applicantName', 'portalLink', 'whatsappLink', 'bookingLink']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('acceptance_interview_social', 'acceptance_interview_social', 'Acceptance + interview — Social Media & Branding',
        'When an applicant is accepted into Social Media & Branding with Interview? ticked',
        'Welcome to Novus Social Media & Branding',
        $body$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Social Media &amp; Branding team within our Marketing department.</p>
<p>You’ll help create social media content and promotional materials for the small businesses we work with, as well as content for Novus’s own platforms. This could include planning posts, designing graphics, and writing captions that reflect each business’s personality and help customers learn what it offers.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>We’d also like to meet you. Please <a href="{{bookingLink}}">book a short interview</a> at a time that works for you.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to see what you create!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['firstName', 'applicantName', 'portalLink', 'whatsappLink', 'bookingLink']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('acceptance_interview_grants', 'acceptance_interview_grants', 'Acceptance + interview — Grants & Funding',
        'When an applicant is accepted into Grants & Funding with Interview? ticked',
        'Welcome to Novus Grants & Funding',
        $body$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Grants &amp; Funding team within our Marketing department.</p>
<p>You’ll help secure the funding that supports Novus’s work with small businesses. This includes researching grant opportunities, checking eligibility requirements, drafting application materials, and organizing information about our projects and impact. You may also help with fundraising and financial planning for the organization.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>We’d also like to meet you. Please <a href="{{bookingLink}}">book a short interview</a> at a time that works for you.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['firstName', 'applicantName', 'portalLink', 'whatsappLink', 'bookingLink']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('acceptance_interview_ambassadors', 'acceptance_interview_ambassadors', 'Acceptance + interview — Novus Ambassadors',
        'When an applicant is accepted into Novus Ambassadors with Interview? ticked',
        'Welcome to the Novus Ambassadors',
        $body$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to the Novus Ambassadors team within our Marketing department.</p>
<p>You’ll help more students learn about Novus and get involved in our work. This includes connecting with schools, student organizations, and community programs, sharing opportunities to join, and building relationships that help us recruit future members.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>We’d also like to meet you. Please <a href="{{bookingLink}}">book a short interview</a> at a time that works for you.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you help grow the team!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['firstName', 'applicantName', 'portalLink', 'whatsappLink', 'bookingLink']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('acceptance_interview_tech', 'acceptance_interview_tech', 'Acceptance + interview — Digital & Tech',
        'When an applicant is accepted into Digital & Tech with Interview? ticked',
        'Welcome to Novus Digital & Tech',
        $body$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Digital &amp; Tech department.</p>
<p>You’ll work with our technology team to build and improve websites for small businesses. Depending on your project, this may include developing pages, setting up forms and backend features, improving accessibility and search visibility, and helping launch and maintain a business’s website.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>We’d also like to meet you. Please <a href="{{bookingLink}}">book a short interview</a> at a time that works for you.</p>
<p>I’ve CC’d Tahmid Islam, our Director of Technology. Please reply all with a self-introduction and share a little about your coding experience and the kind of work you’re interested in so he can help you get started.</p>
<p>We’re excited to build with you!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['firstName', 'applicantName', 'portalLink', 'bookingLink']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('interview_staff_scheduled', 'interview_staff_scheduled', 'Interview assigned (interviewer)',
        'To the interviewer, when a portal interview is assigned to them',
        'Interview scheduled — {{candidateName}}',
        $body$<p>Hi {{interviewerName}},</p>
<p>An interview with <strong>{{candidateName}}</strong> has been assigned to you.</p>
<p><strong>Time:</strong> {{interviewTime}}<br><strong>Meeting:</strong> {{zoomDetails}}</p>
<p>The calendar invite is attached. Open the Interviews page in the member portal for notes and status updates.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['interviewerName', 'candidateName', 'interviewTime', 'zoomLink', 'zoomDetails']::text[], true)
on conflict (id) do nothing;

insert into email_templates (id, key, label, description, subject, body, available_variables, active)
values ('interview_staff_rescheduled', 'interview_staff_rescheduled', 'Interview moved (interviewer)',
        'To the interviewer, when their portal interview is moved',
        'Interview rescheduled — {{candidateName}}',
        $body$<p>Hi {{interviewerName}},</p>
<p>An interview with <strong>{{candidateName}}</strong> has been rescheduled.</p>
<p><strong>Previous time:</strong> {{previousTime}}<br><strong>Time:</strong> {{interviewTime}}<br><strong>Meeting:</strong> {{zoomDetails}}</p>
<p>The calendar invite is attached. Open the Interviews page in the member portal for notes and status updates.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$body$,
        array['interviewerName', 'candidateName', 'previousTime', 'interviewTime', 'zoomLink', 'zoomDetails']::text[], true)
on conflict (id) do nothing;

update email_templates
   set body = replace(body, '<strong>Meeting:</strong> {{zoomLink}}', '<strong>Meeting:</strong> {{zoomDetails}}'),
       available_variables = array(select distinct unnest(available_variables || array['zoomDetails']::text[])),
       updated_at = now()
 where key in ('interview_confirmation', 'interview_rescheduled')
   and body like '%<strong>Meeting:</strong> {{zoomLink}}%';

delete from automation_configs
 where automation_id in ('password_reset', 'member_invite', 'member_setup_link');
