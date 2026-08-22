CREATE OR REPLACE FUNCTION public.novus_rebrand_text(txt text)
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

  s := replace(s, 'voltanyc.org',                   E'\x01');
  s := replace(s, 'linkedin.com/company/voltanyc',  E'\x02');
  s := replace(s, 'linkedin.com/company/volta-nyc', E'\x03');
  s := replace(s, 'instagram.com/voltanyc',         E'\x04');
  s := replace(s, 'nyc.voltanpo.org',               E'\x05');
  s := replace(s, '@voltanyc',                      E'\x06');
  s := replace(s, 'volta.newyork',                  E'\x07');
  s := replace(s, 'ethanzhangvolta',                E'\x0B');
  s := replace(s, 'volta-nyc',                      E'\x0C');
  s := replace(s, 'voltanyc',                       E'\x0E');

  s := replace(s, 'Volta NYC', 'Novus NYC');
  s := replace(s, 'VOLTA NYC', 'NOVUS NYC');
  s := replace(s, 'Volta',     'Novus');
  s := replace(s, 'VOLTA',     'NOVUS');

  s := replace(s, E'\x01', 'voltanyc.org');
  s := replace(s, E'\x02', 'linkedin.com/company/voltanyc');
  s := replace(s, E'\x03', 'linkedin.com/company/volta-nyc');
  s := replace(s, E'\x04', 'instagram.com/voltanyc');
  s := replace(s, E'\x05', 'nyc.voltanpo.org');
  s := replace(s, E'\x06', '@voltanyc');
  s := replace(s, E'\x07', 'volta.newyork');
  s := replace(s, E'\x0B', 'ethanzhangvolta');
  s := replace(s, E'\x0C', 'volta-nyc');
  s := replace(s, E'\x0E', 'voltanyc');

  RETURN s;
END;
$fn$;

UPDATE email_templates
SET subject     = public.novus_rebrand_text(subject),
    body        = public.novus_rebrand_text(body),
    description = public.novus_rebrand_text(description),
    updated_at  = now()
WHERE (coalesce(subject, '') || coalesce(body, '') || coalesce(description, '')) LIKE '%Volta%';

UPDATE handbook_pages
SET content = public.novus_rebrand_text(content)
WHERE content LIKE '%Volta%';

UPDATE automation_configs
SET description = public.novus_rebrand_text(description)
WHERE description LIKE '%Volta%';

UPDATE assignment_templates
SET description = public.novus_rebrand_text(description)
WHERE description LIKE '%Volta%';

UPDATE assignments
SET title       = public.novus_rebrand_text(title),
    description = public.novus_rebrand_text(description)
WHERE (coalesce(title, '') || coalesce(description, '')) LIKE '%Volta%';

UPDATE businesses
SET showcase_description = public.novus_rebrand_text(showcase_description),
    notes                = public.novus_rebrand_text(notes),
    track_projects       = public.novus_rebrand_text(track_projects::text)::jsonb
WHERE (coalesce(showcase_description, '') || coalesce(notes, '') || coalesce(track_projects::text, '')) LIKE '%Volta%';

UPDATE project_groups
SET name = public.novus_rebrand_text(name)
WHERE name LIKE '%Volta%';

UPDATE site_settings
SET public_banner_bg   = '#F5D272',
    public_banner_text = '#191320'
WHERE upper(public_banner_bg) = '#85CC17';

DROP FUNCTION public.novus_rebrand_text(text);
