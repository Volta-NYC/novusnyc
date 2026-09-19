-- This row is the Atlantic Avenue Business Improvement District: its address
-- (306 Atlantic Ave) and contact (@atlanticavebid.org) are the BID's. It was
-- named for the Atlantic Avenue Local Development Corp, a separate nonprofit
-- at 494 Atlantic Ave that runs the Atlantic Antic. The logo file at this
-- row's logo_path was replaced with the BID's own badge at the same time.
update public.bids
set name = 'Atlantic Avenue BID',
    updated_at = now()
where name = 'Atlantic Avenue Local Development Corporation'
  and address = '306 Atlantic Ave, Brooklyn, NY 11201';
