-- Move public-showcase curation onto the record's own fields so the legacy
-- columns can be dropped without the public site losing anything.
--
-- Verified before writing: all 21 `website` values already exist in client_url
-- or live_url; all 16 rows with team_members also have assignees; team_lead is
-- empty; and 49 of 50 showcased URLs already match live_url or preview_url once
-- www/trailing-slash are normalised.

-- 1. Curated services become the record's active services where it has none.
UPDATE businesses
   SET active_services = showcase_services,
       updated_at = now()
 WHERE deleted_at IS NULL
   AND coalesce(array_length(showcase_services, 1), 0) > 0
   AND coalesce(array_length(active_services, 1), 0) = 0;

-- 2. Curated neighbourhood fills a blank canonical neighbourhood.
UPDATE businesses
   SET neighborhood = showcase_neighborhood,
       updated_at = now()
 WHERE deleted_at IS NULL
   AND coalesce(showcase_neighborhood, '') <> ''
   AND coalesce(neighborhood, '') = '';

-- 3. A showcased row with no track list gets one from its division, which is
--    what the public category was being derived from.
UPDATE businesses
   SET project_tracks = ARRAY[division],
       updated_at = now()
 WHERE deleted_at IS NULL
   AND showcase_enabled
   AND coalesce(array_length(project_tracks, 1), 0) = 0
   AND division IN ('Tech', 'Marketing', 'Finance');

-- 4. The showcase URL survives as live_url wherever the tracker has none. This
--    keeps the one genuinely different case (Golden Rose's Spanish-language
--    domain) rather than dropping it silently.
UPDATE businesses
   SET live_url = showcase_url,
       updated_at = now()
 WHERE deleted_at IS NULL
   AND showcase_enabled
   AND coalesce(showcase_url, '') <> ''
   AND coalesce(live_url, '') = ''
   AND coalesce(preview_url, '') = '';
