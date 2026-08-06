-- Rebrand: Volta -> Novus (stored prose only)
--
-- Rewrites the brand NAME in user-facing copy that lives in the database:
-- outbound email templates, the member handbook, assignment copy, public
-- showcase descriptions, and expansion chapter names.
--
-- ─── SCOPE: NAMES ONLY, NEVER ADDRESSES ─────────────────────────────────────
-- Every address-shaped token is frozen before the rename and thawed after, so
-- this migration cannot touch a mailbox, a link, or a social handle:
--
--   voltanyc.org            all mail (info@, ethan@, andrew@) AND every URL
--                           on the domain (/logo.png, /members, /book)
--   @voltanyc               bare Instagram handle used in assignment copy
--   linkedin.com/company/voltanyc, /volta-nyc
--   instagram.com/voltanyc
--   nyc.voltanpo.org
--   volta.newyork, ethanzhangvolta   Gmail local-parts
--
-- Why URLs stay on voltanyc.org: those links work today. Rewriting them to
-- novusnyc.org would depend on DNS already pointing at the new deployment —
-- if it does not, every password-reset, portal-setup, and interview-booking
-- link in outbound mail breaks. Leaving them is correct both before and after
-- the cutover, because next.config.mjs 301s voltanyc.org -> novusnyc.org.
-- Rewrite them in a follow-up migration once the domain is confirmed live.
--
-- Only capitalized forms ("Volta", "VOLTA") are renamed. A bare lowercase
-- "volta" only ever appears inside identifiers, all of which are frozen.
--
-- ─── TABLES DELIBERATELY NOT TOUCHED ────────────────────────────────────────
--   audit_logs.*                    immutable history
--   user_profiles.email, team.email, assignments.created_by,
--   interview_slots.evaluation_by_uid
--                                   auth and attribution identity
--   invite_codes.id / code          live tokens; rewriting invalidates invites
--   calendar_events.i_cal_uid       external calendar sync identity
--   abuse_guards.key                rate-limit keys derived from addresses
--   assignment_claims.deliverable_url
--                                   real submitted links, including live
--                                   instagram.com/voltanyc URLs
--   assignment_claims.submission_notes, applications.accomplishment,
--   applications.interview_evaluations
--                                   free text authored by members/applicants
--   assignment_claims_backup_*      backup table

-- Sentinels are C0 control characters that cannot occur in HTML email bodies,
-- handbook markup, or prose. Tab/newline/CR are avoided since those DO occur.
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

  -- 1. Freeze every address-shaped token. Order matters: the full domain goes
  --    first so "info@voltanyc.org" is consumed before the bare-handle rule.
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

  -- 2. Rename the brand. Longest form first so "Volta NYC" cannot become
  --    "Novus NYC NYC".
  s := replace(s, 'Volta NYC', 'Novus NYC');
  s := replace(s, 'VOLTA NYC', 'NOVUS NYC');
  s := replace(s, 'Volta',     'Novus');
  s := replace(s, 'VOLTA',     'NOVUS');

  -- 3. Thaw.
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

BEGIN;

-- Outbound email: subjects, bodies, admin-facing descriptions.
UPDATE email_templates
SET subject     = public.novus_rebrand_text(subject),
    body        = public.novus_rebrand_text(body),
    description = public.novus_rebrand_text(description),
    updated_at  = now()
WHERE (coalesce(subject, '') || coalesce(body, '') || coalesce(description, '')) LIKE '%Volta%';

-- Member handbook.
UPDATE handbook_pages
SET content = public.novus_rebrand_text(content)
WHERE content LIKE '%Volta%';

-- Automation descriptions shown in the admin portal.
UPDATE automation_configs
SET description = public.novus_rebrand_text(description)
WHERE description LIKE '%Volta%';

-- Assignment catalog copy.
UPDATE assignment_templates
SET description = public.novus_rebrand_text(description)
WHERE description LIKE '%Volta%';

UPDATE assignments
SET title       = public.novus_rebrand_text(title),
    description = public.novus_rebrand_text(description)
WHERE (coalesce(title, '') || coalesce(description, '')) LIKE '%Volta%';

-- Public showcase copy rendered on the marketing site.
UPDATE businesses
SET showcase_description = public.novus_rebrand_text(showcase_description),
    notes                = public.novus_rebrand_text(notes),
    track_projects       = public.novus_rebrand_text(track_projects::text)::jsonb
WHERE (coalesce(showcase_description, '') || coalesce(notes, '') || coalesce(track_projects::text, '')) LIKE '%Volta%';

-- Expansion chapter names ("Volta Boston" -> "Novus Boston").
UPDATE project_groups
SET name = public.novus_rebrand_text(name)
WHERE name LIKE '%Volta%';

-- The public announcement banner stores its colors in the database, so the old
-- brand green survives the code rebrand and renders on every public page.
-- Retarget it to the Novus action yellow (n-ink on n-yellow = 12.42:1, AAA).
UPDATE site_settings
SET public_banner_bg   = '#F5D272',
    public_banner_text = '#191320'
WHERE upper(public_banner_bg) = '#85CC17';

COMMIT;

DROP FUNCTION public.novus_rebrand_text(text);
