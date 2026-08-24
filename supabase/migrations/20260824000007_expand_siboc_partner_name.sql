-- Use the organization's full public name everywhere, while retaining its
-- established SIBOC website and logo record.
UPDATE public.bids
SET name = 'Staten Island Board of Commerce'
WHERE id = 'bf033383-71a6-4af2-b222-3cfdb17a0bb3'
  AND name = 'SIBOC (Staten Island Board of Commerce)';
