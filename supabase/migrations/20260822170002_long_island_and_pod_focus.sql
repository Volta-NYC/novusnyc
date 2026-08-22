-- 1. Long Island as a single place, for the same reason as New York City.
--    Nassau and Suffolk towns were recorded individually — Jericho, Syosset,
--    Great Neck, East Setauket — none of which routes any work. Middletown is
--    Orange County, upstate, and is deliberately NOT included.
UPDATE team SET home_city = 'Long Island', updated_at = now()
 WHERE deleted_at IS NULL AND home_state = 'NY'
   AND home_city IN ('Jericho', 'Syosset', 'Great Neck');

UPDATE applications SET city = 'Long Island'
 WHERE state = 'NY' AND city IN ('Jericho', 'Syosset', 'Great Neck');

-- "Not listed" is the form's escape hatch; it names no city.
UPDATE applications SET city = NULL WHERE city ILIKE 'not listed';

-- 2. Which side of the org a pod's work sits on.
ALTER TABLE pods
  ADD COLUMN IF NOT EXISTS track  text NOT NULL DEFAULT 'Marketing',
  ADD COLUMN IF NOT EXISTS serves text NOT NULL DEFAULT 'clients';

UPDATE pods SET track = 'Marketing', serves = 'clients'
 WHERE slug LIKE '%-outreach' OR slug LIKE '%-social';
UPDATE pods SET track = 'Finance', serves = 'novus'
 WHERE slug LIKE '%-grants' OR slug LIKE '%-ambassadors';

NOTIFY pgrst, 'reload schema';
