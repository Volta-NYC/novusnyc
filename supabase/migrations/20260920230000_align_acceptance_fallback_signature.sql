update public.email_templates
set body = replace(body, '<p>Best,<br>Ethan Zhang<br>Novus NYC</p>', '<p>Best,<br>Ethan<br>Novus NYC</p>'),
    updated_at = now()
where key = 'applicant_accepted'
  and body like '%<p>Best,<br>Ethan Zhang<br>Novus NYC</p>%';
