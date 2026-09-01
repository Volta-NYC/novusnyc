-- Standardize business location and service vocabulary.
--
-- Three problems, all from free-text entry over an intake form that never
-- constrained the values:
--
--  1. Neighborhood held a mix of neighborhoods, boroughs, and one "New York
--     City". Borough-level values could not simply be cleared: 15 of the 22 such
--     rows have no address at all, so the borough sitting in that column was
--     their only location data. Hence a real borough column rather than a
--     delete.
--  2. Spelling variants split the same place across rows — Bed-Stuy against
--     Bedford Stuyvesant, Sunset against Sunset Park, West Brighton against
--     West New Brighton.
--  3. active_services carried the public form's long labels alongside the
--     canonical short ones, so "Website" and "Website Design & Development"
--     counted as different services.
--
-- The canonical vocabulary lives in src/lib/members/constants.ts
-- (BUSINESS_SERVICES, NYC_BOROUGHS, NEIGHBORHOOD_BOROUGH). This migration makes
-- the stored data agree with it.
--
-- Replay-safe: every statement matches on the pre-normalization form, so a
-- second run changes nothing.

-- ── 1. Neighborhood spelling variants ────────────────────────────────────────
update public.businesses set neighborhood = 'Bedford-Stuyvesant'
  where trim(neighborhood) in ('Bed-Stuy', 'Bedford Stuyvesant');
update public.businesses set neighborhood = 'Sunset Park'
  where trim(neighborhood) = 'Sunset';
update public.businesses set neighborhood = 'West New Brighton'
  where trim(neighborhood) = 'West Brighton';

-- ── 2. Borough column ────────────────────────────────────────────────────────
alter table public.businesses add column if not exists borough text;

-- Boroughs currently stored in the neighborhood column, moved before that
-- column is cleared. "All of Staten Island" is a citywide-style phrasing for a
-- borough-wide organization, not a place name.
update public.businesses set borough = 'Queens'        where trim(neighborhood) = 'Queens';
update public.businesses set borough = 'Brooklyn'      where trim(neighborhood) = 'Brooklyn';
update public.businesses set borough = 'Staten Island' where trim(neighborhood) in ('Staten Island', 'All of Staten Island');

-- Derive from the neighborhood where one is genuinely recorded.
update public.businesses set borough = case
    when trim(neighborhood) in ('Concourse','Morrisania') then 'Bronx'
    when trim(neighborhood) in (
      'Bay Ridge','Bedford-Stuyvesant','Brighton Beach','Clinton Hill','Crown Heights',
      'Cypress Hills','Dumbo','East New York','Flatbush','Little Caribbean',
      'North Flatbush','Park Slope','Prospect Heights','Sunset Park'
    ) then 'Brooklyn'
    when trim(neighborhood) in (
      'Chinatown','East Village','Financial District','Harlem',
      'Upper East Side','Upper West Side'
    ) then 'Manhattan'
    when trim(neighborhood) in ('Bayside','Flushing','Jackson Heights','Sunnyside') then 'Queens'
    when trim(neighborhood) in ('Great Kills','West New Brighton') then 'Staten Island'
    else borough
  end
where borough is null;

-- Fall back to the address for rows with no usable neighborhood.
update public.businesses set borough = case
    when address ilike '%bronx%' then 'Bronx'
    when address ilike '%staten island%' then 'Staten Island'
    when address ilike '%brooklyn%' then 'Brooklyn'
    when address ~* 'New York, NY 100|New York, NY 101|New York, NY 102|manhattan' then 'Manhattan'
    when address ~* 'Queens|Astoria|Bayside|Sunnyside|Flushing|Jamaica, NY|Elmhurst|Kew Gardens|Long Island City|Woodside|Ridgewood|Corona, NY|Whitestone|Fresh Meadows|East Elmhurst' then 'Queens'
    else borough
  end
where borough is null and coalesce(trim(address),'') <> '';

-- ── 3. Clear non-neighborhood values now that borough carries them ───────────
-- "New York City" is dropped without a borough: every client is in New York
-- City, so the value never distinguished anything.
update public.businesses set neighborhood = null
  where trim(neighborhood) in ('Queens','Brooklyn','Staten Island','All of Staten Island','New York City');

-- Normalize empty strings so "no neighborhood" has one representation.
update public.businesses set neighborhood = null where trim(coalesce(neighborhood,'')) = '';
update public.businesses set neighborhood = trim(neighborhood) where neighborhood <> trim(neighborhood);

-- ── 4. Service vocabulary ────────────────────────────────────────────────────
-- Collapses to the five canonical BUSINESS_SERVICES values and de-duplicates,
-- so a business tagged both "Website" and "Website Design & Development" ends
-- up with one.
update public.businesses
set active_services = (
  select array_agg(distinct mapped order by mapped)
  from unnest(active_services) as raw
  cross join lateral (
    select case lower(trim(raw))
      when 'website design & development'   then 'Website'
      when 'website'                        then 'Website'
      when 'seo & google maps visibility'   then 'SEO'
      when 'seo'                            then 'SEO'
      when 'social'                         then 'Social Media'
      when 'social media & content'         then 'Social Media'
      when 'social media'                   then 'Social Media'
      when 'graphic design'                 then 'Graphic Design'
      when 'grant research & writing'       then 'Grants'
      when 'grants'                         then 'Grants'
      else trim(raw)
    end as mapped
  ) m
)
where coalesce(array_length(active_services, 1), 0) > 0;

notify pgrst, 'reload schema';
