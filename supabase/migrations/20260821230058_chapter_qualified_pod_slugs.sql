-- Two chapters both have a Grants & Funding pod, so a bare slug no longer
-- identifies one. Qualify every slug with its chapter — including New York, so
-- there is no default case to forget about later.
UPDATE pods p
   SET slug = c.slug || '-' || regexp_replace(p.slug, '^(new-york|chicago)-', '')
  FROM chapters c
 WHERE c.id = p.chapter_id
   AND p.slug NOT LIKE c.slug || '-%';

CREATE UNIQUE INDEX IF NOT EXISTS pods_slug_unique_idx ON pods (slug);

SELECT c.name AS chapter, p.name, p.slug FROM pods p
  JOIN chapters c ON c.id = p.chapter_id
 ORDER BY c.sort_order, p.sort_order;
