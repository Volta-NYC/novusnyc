-- West Brighton Community Local Development Corporation is the legal parent of
-- the Staten Island Business Outreach Center (same office, site and logo), so
-- its row double-listed SIBOC. SIBOC's expansion is Business Outreach Center;
-- "Board of Commerce" was a wrong guess from the acronym.
update public.bids s
set contacts = s.contacts || (
      select coalesce(jsonb_agg(c), '[]'::jsonb)
      from public.bids w, jsonb_array_elements(w.contacts) c
      where w.id = '4a05d24e-021e-44e8-aa90-ffd3dc4c12ed'
        and not s.contacts @> jsonb_build_array(jsonb_build_object('name', c->>'name'))
    ),
    name = 'Staten Island Business Outreach Center',
    updated_at = now()
where s.id = 'bf033383-71a6-4af2-b222-3cfdb17a0bb3';

delete from public.bids where id = '4a05d24e-021e-44e8-aa90-ffd3dc4c12ed';
