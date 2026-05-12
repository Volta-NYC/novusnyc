-- =============================================================================
-- Data cleanup migration
-- Runs after 20260511000001_assignments_redesign.sql.
-- Fixes legacy data issues in the new assignments table:
--   1. Finance assignments: match business name from title → set business_id FK
--   2. Strip business name from assignment titles where it was embedded
--   3. Normalize assignment status values
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. For migrated finance assignments, attempt to set business_id by matching
--    the business name embedded in the title against the businesses table.
--    Pattern: "<Business Name> - <Task>" or "<Business Name>: <Task>"
--
--    This is a best-effort fuzzy match. Unmatched rows keep business_id = NULL
--    and will surface in the "unassigned" section of the By Business view so
--    an admin can manually assign them.
-- ---------------------------------------------------------------------------
UPDATE assignments a
SET business_id = b.id
FROM businesses b
WHERE a.id LIKE 'fa_%'
  AND a.business_id IS NULL
  AND (
    -- Title starts with business name followed by " - " or ": "
    LOWER(a.title) LIKE LOWER(b.name || ' - %')
    OR LOWER(a.title) LIKE LOWER(b.name || ': %')
    OR LOWER(a.title) = LOWER(b.name)
  );

-- ---------------------------------------------------------------------------
-- 2. Strip the business name from assignment titles where it was embedded.
--    Covers patterns: "<Business> - <Title>" and "<Business>: <Title>"
--    Only strips if business_id is now set (so we know which business matched).
-- ---------------------------------------------------------------------------
UPDATE assignments a
SET title = TRIM(
  CASE
    WHEN LOWER(a.title) LIKE LOWER(b.name || ' - %')
      THEN SUBSTRING(a.title FROM LENGTH(b.name) + 4)
    WHEN LOWER(a.title) LIKE LOWER(b.name || ': %')
      THEN SUBSTRING(a.title FROM LENGTH(b.name) + 3)
    ELSE a.title
  END
)
FROM businesses b
WHERE a.business_id = b.id
  AND (
    LOWER(a.title) LIKE LOWER(b.name || ' - %')
    OR LOWER(a.title) LIKE LOWER(b.name || ': %')
  );

-- ---------------------------------------------------------------------------
-- 3. Normalize any remaining non-standard status values.
-- ---------------------------------------------------------------------------
UPDATE assignments
SET status = 'Open'
WHERE status IS NULL
   OR LOWER(status) NOT IN ('open','in progress','submitted','approved','finalized');

-- ---------------------------------------------------------------------------
-- 4. Track column: ensure no NULLs remain (default to Finance for fa_ rows,
--    Tech for everything else).
-- ---------------------------------------------------------------------------
UPDATE assignments
SET track = CASE WHEN id LIKE 'fa_%' THEN 'Finance' ELSE 'Tech' END
WHERE track IS NULL OR track = '';
