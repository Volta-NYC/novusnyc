-- Assignment system schema cleanup pass.
-- Goals:
--   1. Add missing indexes for hot query paths.
--   2. Enforce NOT NULL on columns that always have values (all existing rows
--      already satisfy these constraints; verified before applying).
--   3. Normalise defaults so empty strings stored by old code become proper
--      NULLs or empty strings consistently.

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- assignment_updates: queried by assignment_id on every update panel open
CREATE INDEX IF NOT EXISTS assignment_updates_assignment_id_idx
  ON assignment_updates (assignment_id);

-- assignment_claims: status and cycle_id are common filter columns
CREATE INDEX IF NOT EXISTS assignment_claims_cycle_id_idx
  ON assignment_claims (cycle_id);

CREATE INDEX IF NOT EXISTS assignment_claims_status_idx
  ON assignment_claims (status);

-- ── assignment_claims: NOT NULL on core join/lookup columns ──────────────────

ALTER TABLE assignment_claims
  ALTER COLUMN assignment_id  SET NOT NULL,
  ALTER COLUMN member_id      SET NOT NULL,
  ALTER COLUMN cycle_id       SET NOT NULL,
  ALTER COLUMN status         SET NOT NULL,
  ALTER COLUMN claimed_at     SET NOT NULL,
  ALTER COLUMN checkins_approved   SET NOT NULL,
  ALTER COLUMN total_credits_earned SET NOT NULL;

-- ── assignments: NOT NULL on universally-present columns ─────────────────────

-- description and notes are sometimes NULL in the DB; default them to '' so
-- they are never NULL going forward. Existing NULLs are coerced here.
UPDATE assignments SET description = '' WHERE description IS NULL;
UPDATE assignments SET notes       = '' WHERE notes       IS NULL;

ALTER TABLE assignments
  ALTER COLUMN status       SET NOT NULL,
  ALTER COLUMN description  SET NOT NULL,
  ALTER COLUMN description  SET DEFAULT '',
  ALTER COLUMN notes        SET NOT NULL,
  ALTER COLUMN notes        SET DEFAULT '',
  ALTER COLUMN created_at   SET NOT NULL,
  ALTER COLUMN updated_at   SET NOT NULL,
  ALTER COLUMN created_by   SET NOT NULL,
  ALTER COLUMN created_by   SET DEFAULT 'system';

-- ── assignment_templates: same treatment ─────────────────────────────────────

UPDATE assignment_templates SET description = '' WHERE description IS NULL;
UPDATE assignment_templates SET notes       = '' WHERE notes       IS NULL;
UPDATE assignment_templates SET created_by  = 'system' WHERE created_by IS NULL;

ALTER TABLE assignment_templates
  ALTER COLUMN description  SET NOT NULL,
  ALTER COLUMN description  SET DEFAULT '',
  ALTER COLUMN notes        SET NOT NULL,
  ALTER COLUMN notes        SET DEFAULT '',
  ALTER COLUMN created_at   SET NOT NULL,
  ALTER COLUMN updated_at   SET NOT NULL,
  ALTER COLUMN created_by   SET NOT NULL,
  ALTER COLUMN created_by   SET DEFAULT 'system';

-- ── assignment_updates: already clean; ensure NOT NULL on posted_by ──────────
-- (posted_by is already NOT NULL; this is a no-op safety check)
ALTER TABLE assignment_updates
  ALTER COLUMN assignment_id SET NOT NULL,
  ALTER COLUMN message       SET NOT NULL,
  ALTER COLUMN posted_by     SET NOT NULL,
  ALTER COLUMN posted_at     SET NOT NULL;

NOTIFY pgrst, 'reload schema';
