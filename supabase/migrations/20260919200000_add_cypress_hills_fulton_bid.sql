-- The Cypress Hills Fulton BID works with Novus on Fulton Street and is shown on
-- /partnerships, but had no row, so it had no Our Work pin or stored logo. It
-- was formed in November 2024 with support from Cypress Hills LDC (NYC SBS
-- release, 2024-11-18) and lists 2836 Fulton Street as its address
-- (cypresshillsfultonbid.org). Coordinates are from NYC Planning GeoSearch.
-- The logo is uploaded separately to partner-logos/<id>/logo.png, as the
-- portal's upload route does.
insert into public.bids (id, name, status, priority, borough, address, zip_code, lat, lng, chapter_id, contacts, notes, created_at, updated_at)
select gen_random_uuid()::text,
       'Cypress Hills Fulton BID',
       'Active Partner',
       'Medium',
       'Brooklyn',
       '2836 Fulton Street, Brooklyn, NY 11207',
       '11207',
       40.678150,
       -73.889989,
       'chapter_ny',
       jsonb_build_array(jsonb_build_object(
         'id', gen_random_uuid()::text,
         'name', 'Jose Mendez',
         'role', 'CHF BID Assistant/Outreach Coordinator',
         'email', 'pt_josem@cypresshills.org',
         'phone', ''
       )),
       'Formed in 2024 with support from Cypress Hills LDC. Walked Fulton Street with the team in March 2026; met in April 2026 about Google Business Profiles and social media for Fulton Street businesses.',
       now(),
       now()
where not exists (select 1 from public.bids where name = 'Cypress Hills Fulton BID');
