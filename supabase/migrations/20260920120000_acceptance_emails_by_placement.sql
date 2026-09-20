-- Per-placement acceptance emails.
--
-- One acceptance template per placement: four Marketing pods and the Tech
-- department. The existing `applicant_accepted` template stays in place for the
-- already-has-an-account branch and as the fallback when no placement is picked.
--
-- The WhatsApp invite and the CC address change over time and are not worth a
-- deploy, so they live in site_settings and are edited from the Applicants page.
-- {{portalLink}} is resolved per applicant at send time -- a permanent signup
-- URL for a new member, /members for someone who already has an account -- so
-- it is deliberately not a stored setting.

alter table site_settings
  add column if not exists acceptance_whatsapp_link text,
  add column if not exists acceptance_cc_email      text;

update site_settings
   set acceptance_cc_email = coalesce(acceptance_cc_email, 'Ellie Mak <elliehannah2008@gmail.com>')
 where id = 'singleton';

insert into email_templates (id, key, label, description, subject, body, available_variables)
values
  ('acceptance_outreach', 'acceptance_outreach', 'Acceptance — Small Business Outreach', 'Sent when an applicant is accepted to the Small Business Outreach pod (Marketing).',
   'Welcome to Novus | Small Business Outreach',
   $body$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;max-width:560px;">
<p style="margin:0 0 18px;">Hi {{firstName}},</p>
<p style="margin:0 0 18px;">Congratulations! You’ve been accepted to Novus’s Small Business Outreach team within our Marketing department.</p>
<p style="margin:0 0 18px;">You’ll help us find and connect with small businesses that could benefit from our website and marketing services. Your work will include researching businesses, reaching out to owners, and learning about what they need so we can identify where Novus can help.</p>
<p style="margin:0 0 18px;">To get started, access your member portal here: <a href="{{portalLink}}" style="color:#0b63ce;">{{portalLink}}</a>. Please also join our WhatsApp group for team communication and updates: <a href="{{whatsappLink}}" style="color:#0b63ce;">{{whatsappLink}}</a>.</p>
<p style="margin:0 0 18px;">Please reply all with a short introduction so we can help you get started with the team.</p>
<p style="margin:0 0 18px;">We’re excited to have you join us!</p>
<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>
</div>$body$,
   array['firstName','portalLink','whatsappLink']::text[]),
  ('acceptance_social', 'acceptance_social', 'Acceptance — Social Media & Branding', 'Sent when an applicant is accepted to the Social Media & Branding pod (Marketing).',
   'Welcome to Novus | Social Media & Branding',
   $body$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;max-width:560px;">
<p style="margin:0 0 18px;">Hi {{firstName}},</p>
<p style="margin:0 0 18px;">Congratulations! You’ve been accepted to Novus’s Social Media &amp; Branding team within our Marketing department.</p>
<p style="margin:0 0 18px;">You’ll help create social media content and promotional materials for the small businesses we work with, as well as content for Novus’s own platforms. This could include planning posts, designing graphics, and writing captions that reflect each business’s personality and help customers learn what it offers.</p>
<p style="margin:0 0 18px;">To get started, access your member portal here: <a href="{{portalLink}}" style="color:#0b63ce;">{{portalLink}}</a>. Please also join our WhatsApp group for team communication and updates: <a href="{{whatsappLink}}" style="color:#0b63ce;">{{whatsappLink}}</a>.</p>
<p style="margin:0 0 18px;">Please reply all with a short introduction so we can help you get started with the team.</p>
<p style="margin:0 0 18px;">We’re excited to see what you create!</p>
<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>
</div>$body$,
   array['firstName','portalLink','whatsappLink']::text[]),
  ('acceptance_grants', 'acceptance_grants', 'Acceptance — Grants & Funding', 'Sent when an applicant is accepted to the Grants & Funding pod (Marketing).',
   'Welcome to Novus | Grants & Funding',
   $body$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;max-width:560px;">
<p style="margin:0 0 18px;">Hi {{firstName}},</p>
<p style="margin:0 0 18px;">Congratulations! You’ve been accepted to Novus’s Grants &amp; Funding team within our Marketing department.</p>
<p style="margin:0 0 18px;">You’ll help secure the funding that supports Novus’s work with small businesses. This includes researching grant opportunities, checking eligibility requirements, drafting application materials, and organizing information about our projects and impact. You may also help with fundraising and financial planning for the organization.</p>
<p style="margin:0 0 18px;">To get started, access your member portal here: <a href="{{portalLink}}" style="color:#0b63ce;">{{portalLink}}</a>. Please also join our WhatsApp group for team communication and updates: <a href="{{whatsappLink}}" style="color:#0b63ce;">{{whatsappLink}}</a>.</p>
<p style="margin:0 0 18px;">Please reply all with a short introduction so we can help you get started with the team.</p>
<p style="margin:0 0 18px;">We’re excited to have you join us!</p>
<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>
</div>$body$,
   array['firstName','portalLink','whatsappLink']::text[]),
  ('acceptance_ambassadors', 'acceptance_ambassadors', 'Acceptance — Novus Ambassadors', 'Sent when an applicant is accepted to the Novus Ambassadors pod (Marketing).',
   'Welcome to Novus | Ambassadors',
   $body$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;max-width:560px;">
<p style="margin:0 0 18px;">Hi {{firstName}},</p>
<p style="margin:0 0 18px;">Congratulations! You’ve been accepted to the Novus Ambassadors team within our Marketing department.</p>
<p style="margin:0 0 18px;">You’ll help more students learn about Novus and get involved in our work. This includes connecting with schools, student organizations, and community programs, sharing opportunities to join, and building relationships that help us recruit future members.</p>
<p style="margin:0 0 18px;">To get started, access your member portal here: <a href="{{portalLink}}" style="color:#0b63ce;">{{portalLink}}</a>. Please also join our WhatsApp group for team communication and updates: <a href="{{whatsappLink}}" style="color:#0b63ce;">{{whatsappLink}}</a>.</p>
<p style="margin:0 0 18px;">Please reply all with a short introduction so we can help you get started with the team.</p>
<p style="margin:0 0 18px;">We’re excited to have you help grow the team!</p>
<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>
</div>$body$,
   array['firstName','portalLink','whatsappLink']::text[]),
  ('acceptance_tech', 'acceptance_tech', 'Acceptance — Digital & Tech', 'Sent when an applicant is accepted to the Digital & Tech department.',
   'Welcome to Novus | Digital & Tech',
   $body$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111111;max-width:560px;">
<p style="margin:0 0 18px;">Hi {{firstName}},</p>
<p style="margin:0 0 18px;">Congratulations! You’ve been accepted to Novus’s Digital &amp; Tech department.</p>
<p style="margin:0 0 18px;">You’ll work with our technology team to build and improve websites for small businesses. Depending on your project, this may include developing pages, setting up forms and backend features, improving accessibility and search visibility, and helping launch and maintain a business’s website.</p>
<p style="margin:0 0 18px;">To get started, access your member portal here: <a href="{{portalLink}}" style="color:#0b63ce;">{{portalLink}}</a>.</p>
<p style="margin:0 0 18px;">I’ve CC’d Tahmid Islam, our Director of Technology. Please reply all with a self-introduction and share a little about your coding experience and the kind of work you’re interested in so he can help you get started.</p>
<p style="margin:0 0 18px;">We’re excited to build with you!</p>
<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>
</div>$body$,
   array['firstName','portalLink']::text[])
on conflict (id) do update set
  label               = excluded.label,
  description         = excluded.description,
  subject             = excluded.subject,
  body                = excluded.body,
  available_variables = excluded.available_variables;
