UPDATE pods SET track = 'Marketing', updated_at = now()
 WHERE slug LIKE '%-grants' OR slug LIKE '%-ambassadors';
