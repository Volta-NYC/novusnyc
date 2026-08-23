CREATE OR REPLACE FUNCTION public.novus_url_migrate(txt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  s text := txt;
BEGIN
  IF s IS NULL THEN
    RETURN NULL;
  END IF;

  s := replace(s, '@voltanyc.org',                  E'\x01');
  s := replace(s, 'linkedin.com/company/voltanyc',  E'\x02');
  s := replace(s, 'linkedin.com/company/volta-nyc', E'\x03');
  s := replace(s, 'instagram.com/voltanyc',         E'\x04');
  s := replace(s, '@voltanyc',                      E'\x06');
  s := replace(s, 'volta.newyork',                  E'\x07');
  s := replace(s, 'ethanzhangvolta',                E'\x0B');

  s := replace(s, 'www.voltanyc.org', 'www.novusnyc.org');
  s := replace(s, 'voltanyc.org',     'www.novusnyc.org');

  s := replace(s, E'\x01', '@voltanyc.org');
  s := replace(s, E'\x02', 'linkedin.com/company/voltanyc');
  s := replace(s, E'\x03', 'linkedin.com/company/volta-nyc');
  s := replace(s, E'\x04', 'instagram.com/voltanyc');
  s := replace(s, E'\x06', '@voltanyc');
  s := replace(s, E'\x07', 'volta.newyork');
  s := replace(s, E'\x0B', 'ethanzhangvolta');

  RETURN s;
END;
$fn$;

UPDATE email_templates
SET subject     = public.novus_url_migrate(subject),
    body        = public.novus_url_migrate(body),
    description = public.novus_url_migrate(description),
    updated_at  = now()
WHERE (coalesce(subject, '') || coalesce(body, '') || coalesce(description, '')) LIKE '%voltanyc.org%';

UPDATE handbook_pages
SET content = public.novus_url_migrate(content)
WHERE content LIKE '%voltanyc.org%';

UPDATE automation_configs
SET description = public.novus_url_migrate(description)
WHERE description LIKE '%voltanyc.org%';

UPDATE assignment_templates
SET description = public.novus_url_migrate(description)
WHERE description LIKE '%voltanyc.org%';

UPDATE assignments
SET title       = public.novus_url_migrate(title),
    description = public.novus_url_migrate(description)
WHERE (coalesce(title, '') || coalesce(description, '')) LIKE '%voltanyc.org%';

UPDATE businesses
SET showcase_description = public.novus_url_migrate(showcase_description),
    notes                = public.novus_url_migrate(notes),
    track_projects       = public.novus_url_migrate(track_projects::text)::jsonb
WHERE (coalesce(showcase_description, '') || coalesce(notes, '') || coalesce(track_projects::text, '')) LIKE '%voltanyc.org%';

DROP FUNCTION public.novus_url_migrate(text);
