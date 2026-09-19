-- Three partner rows carried another organization's address.
--
-- SBRN has no office of its own; its site lists the five borough chambers as
-- contacts, and the city describes it as a partnership that includes the
-- Partnership for New York City. The pin moves from the Brooklyn Chamber's
-- office to the Partnership's.
--
-- CAMO publishes no address. It sat at 686 Forest Ave, the Forest Avenue BID
-- and SIBOC office. 861 Castleton Ave is its chair's registered storefront, on
-- the corridor the organization represents.
--
-- The East New York Merchants Association sat at 625 Jamaica Ave, Cypress
-- Hills LDC's administrative office. It was organized under Cypress Hills'
-- New Lots Commercial Revitalization program; 613 New Lots Ave (United
-- Community Centers, part of Cypress Hills LDC since 2024) is on that corridor
-- and hosted its May 2026 event.
--
-- Coordinates are from NYC Planning GeoSearch. Each update matches on the old
-- address as well as the name, so replaying this migration changes nothing.
update public.bids
set address = 'One Battery Park Plaza, 5th Floor, New York, NY 10004',
    zip_code = '10004',
    lat = 40.703380,
    lng = -74.013773,
    updated_at = now()
where name = 'NYC Small Business Resource Network (SBRN)'
  and address = '253 36th St, Building 3, 4th Floor, Brooklyn, NY 11232';

update public.bids
set address = '861 Castleton Ave, Staten Island, NY 10310',
    zip_code = '10310',
    lat = 40.634920,
    lng = -74.110999,
    updated_at = now()
where name = 'Castleton Avenue Merchants Organization'
  and address = '686 Forest Ave, Staten Island, NY 10310';

update public.bids
set address = '613 New Lots Ave, Brooklyn, NY 11207',
    zip_code = '11207',
    lat = 40.664899,
    lng = -73.886746,
    updated_at = now()
where name = 'East New York Merchants Association'
  and address = '625 Jamaica Ave, Brooklyn, NY 11208';
