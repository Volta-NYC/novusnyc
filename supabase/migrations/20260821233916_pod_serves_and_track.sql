-- Which side of the org a pod's work sits on. Marketing exists for the small
-- businesses we take on as clients; finance and operations keep Novus running.
-- People kept having to infer this from the pod's title.
ALTER TABLE pods
  ADD COLUMN IF NOT EXISTS track  text NOT NULL DEFAULT 'Marketing',   -- Marketing | Finance
  ADD COLUMN IF NOT EXISTS serves text NOT NULL DEFAULT 'clients';     -- clients | novus

UPDATE pods SET track = 'Marketing', serves = 'clients'
 WHERE slug LIKE '%-outreach' OR slug LIKE '%-social';

UPDATE pods SET track = 'Finance', serves = 'novus'
 WHERE slug LIKE '%-grants' OR slug LIKE '%-ambassadors';

UPDATE pods SET description =
  'Find and connect with small businesses that could benefit from Novus''s marketing and web services.'
 WHERE slug LIKE '%-outreach';

UPDATE pods SET description =
  'Create promotional materials and social content for partnering small businesses, and manage Novus''s own public-facing platforms.'
 WHERE slug LIKE '%-social';

UPDATE pods SET description =
  'Research funding opportunities, build grant templates, support grant writing, and track the impact funders ask about — all of it funding Novus''s own work.'
 WHERE slug LIKE '%-grants';

UPDATE pods SET description =
  'Build relationships with schools, student organizations, pipeline programs, and community partners to recruit future Novus members.'
 WHERE slug LIKE '%-ambassadors';

NOTIFY pgrst, 'reload schema';
