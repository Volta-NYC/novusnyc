-- Four businesses the founder listed as never-show still had public Our Work
-- cards linking their unfinished drafts: Redemption. Coffee (owner withdrew),
-- Maria's Mediterranean (declined), Pan De Arwah, and Grandma's Love Inc.
-- (paused). Taking the cards down also removes the map link, which now follows
-- showcase_enabled. Each row stays in the tracker and in the supported count.
update public.businesses
set showcase_enabled = false,
    updated_at = now()
where name in (
    'Redemption. Coffee',
    'Maria''s Mediterranean',
    'Pan De Arwah',
    'Grandma''s Love Inc.'
  )
  and showcase_enabled = true;
