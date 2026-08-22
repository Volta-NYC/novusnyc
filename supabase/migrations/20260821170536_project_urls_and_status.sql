ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS client_url      text,
  ADD COLUMN IF NOT EXISTS preview_url     text,
  ADD COLUMN IF NOT EXISTS live_url        text,
  ADD COLUMN IF NOT EXISTS tech_status     text,
  ADD COLUMN IF NOT EXISTS tech_priority   text,
  ADD COLUMN IF NOT EXISTS assignees       text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hours_logged    numeric(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_date     date,
  ADD COLUMN IF NOT EXISTS last_touched_at timestamptz;

UPDATE businesses SET preview_url = showcase_url
  WHERE preview_url IS NULL AND showcase_url ILIKE '%vercel.app%';

UPDATE businesses SET preview_url = website
  WHERE preview_url IS NULL AND website ILIKE '%vercel.app%';

UPDATE businesses SET live_url = 'https://' || d.domain
FROM (VALUES
  ('higherlearningnyc.com'),   ('clayandkilnstudio.com'), ('spinbagel.com'),
  ('petitedumpling.com'),      ('balabustabrooklyn.com'),  ('goldenrosenyc.com'),
  ('broadpivotllc.com'),       ('papazzio.com'),           ('masalaboxbayside.com'),
  ('eggstravanyc.com'),        ('siboc.org'),              ('forestavenuebid.com'),
  ('tangrafusion.com')
) AS d(domain)
WHERE live_url IS NULL
  AND (
    replace(lower(regexp_replace(coalesce(website,''),      '^https?://', '')), 'www.', '') LIKE d.domain || '%'
    OR
    replace(lower(regexp_replace(coalesce(showcase_url,''), '^https?://', '')), 'www.', '') LIKE d.domain || '%'
  );

UPDATE businesses
   SET live_url = 'https://goldenrosenyc.com',
       notes = coalesce(nullif(notes,'') || E'\n', '') || 'Second live domain: https://www.agenciadeempleosnyc.com/'
 WHERE live_url IS NULL
   AND coalesce(website,'') || coalesce(showcase_url,'') ILIKE '%agenciadeempleosnyc%';

UPDATE businesses SET client_url = website
  WHERE client_url IS NULL
    AND coalesce(website,'') <> ''
    AND website NOT ILIKE '%vercel.app%'
    AND (live_url IS NULL OR replace(lower(website),'www.','') NOT LIKE '%' || replace(lower(regexp_replace(live_url,'^https?://','')),'www.','') || '%');

UPDATE businesses SET live_url = showcase_url
  WHERE live_url IS NULL
    AND coalesce(showcase_url,'') <> ''
    AND showcase_url NOT ILIKE '%vercel.app%';

UPDATE businesses SET tech_status = CASE
  WHEN coalesce(live_url,'')    <> '' THEN 'Live'
  WHEN coalesce(preview_url,'') <> '' THEN 'Draft Ready'
  WHEN array_length(team_members, 1) > 0 THEN 'Assigned'
  ELSE 'Backlog'
END
WHERE tech_status IS NULL;

UPDATE businesses SET tech_priority = 'Medium'
  WHERE tech_priority IS NULL AND tech_status = 'Backlog';

UPDATE businesses SET assignees = team_members
  WHERE assignees = '{}' AND array_length(team_members, 1) > 0;

UPDATE businesses SET last_touched_at = coalesce(updated_at, created_at)
  WHERE last_touched_at IS NULL;

ALTER TABLE businesses
  ALTER COLUMN tech_status SET DEFAULT 'Backlog';

CREATE INDEX IF NOT EXISTS businesses_tech_status_idx  ON businesses (tech_status)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS businesses_live_url_idx     ON businesses (live_url)     WHERE deleted_at IS NULL AND live_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS businesses_assignees_idx    ON businesses USING GIN (assignees);

NOTIFY pgrst, 'reload schema';
