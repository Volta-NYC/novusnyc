-- =============================================================================
-- Assignments redesign migration
-- Creates assignment_templates (blueprint library) and assignments (active work
-- tied to a business). Migrates existing assignment_catalog and
-- finance_assignments rows into the new tables. Updates assignment_claims FK.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- assignment_templates  (admin-managed blueprints, no business_id, no status)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_templates (
  id                   text PRIMARY KEY,
  title                text NOT NULL,
  description          text,               -- HTML rich-text
  type                 text,               -- null | 'Report' | 'Case Study'
  track                text NOT NULL,      -- Tech | Marketing | Finance
  credits              integer DEFAULT 1,
  credits_max          integer,
  credits_note         text,
  difficulty           text DEFAULT 'Standard',
  estimated_hours      numeric DEFAULT 0,
  min_role             text DEFAULT 'Analyst',  -- Analyst | Senior Analyst | Associate
  capacity             integer DEFAULT 1,
  deadline_offset_days integer,            -- days after creation → suggested deadline
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  created_by           text
);

CREATE INDEX IF NOT EXISTS assignment_templates_track_idx ON assignment_templates (track);

-- ---------------------------------------------------------------------------
-- assignments  (active work, always tied to a business via business_id)
-- Replaces: assignment_catalog (active rows) + finance_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id                    text PRIMARY KEY,
  title                 text NOT NULL,
  description           text,               -- HTML rich-text
  type                  text,               -- null | 'Report' | 'Case Study'
  track                 text NOT NULL,      -- Tech | Marketing | Finance
  business_id           text REFERENCES businesses(id),
  status                text DEFAULT 'Open',
  assigned_member_ids   text[],
  assigned_member_names text[],
  deadlines             jsonb,              -- [{label, date}]
  deliverable_url       text,
  credits               integer DEFAULT 1,
  credits_max           integer,
  credits_note          text,
  difficulty            text DEFAULT 'Standard',
  estimated_hours       numeric DEFAULT 0,
  min_role              text DEFAULT 'Analyst',
  capacity              integer DEFAULT 1,
  cycle_id              text,
  template_id           text REFERENCES assignment_templates(id),
  region                text,              -- Finance: case study region
  team_label            text,              -- Finance: team label
  seed_key              text,              -- Finance: code key
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  created_by            text
);

CREATE INDEX IF NOT EXISTS assignments_business_id_idx ON assignments (business_id);

CREATE INDEX IF NOT EXISTS assignments_track_idx        ON assignments (track);

CREATE INDEX IF NOT EXISTS assignments_status_idx       ON assignments (status);

CREATE INDEX IF NOT EXISTS assignments_cycle_id_idx     ON assignments (cycle_id);

-- ---------------------------------------------------------------------------
-- Migrate assignment_catalog → assignments / assignment_templates
--
-- Rows with a real business_id → assignments (active work).
-- Rows without one (null, empty, '__volta_internal__') → templates.
-- ---------------------------------------------------------------------------

-- Active assignments from catalog (have a real business_id)
INSERT INTO assignments (
  id, title, description, track, business_id, status,
  credits, difficulty, estimated_hours, min_role, capacity,
  deadlines, cycle_id, notes, created_at, updated_at, created_by
)
SELECT
  id,
  title,
  description,
  COALESCE(primary_track, 'Tech'),
  business_id,
  CASE
    WHEN LOWER(status) IN ('open')             THEN 'Open'
    WHEN LOWER(status) IN ('in progress','in_progress') THEN 'In Progress'
    WHEN LOWER(status) IN ('submitted')        THEN 'Submitted'
    WHEN LOWER(status) IN ('approved')         THEN 'Approved'
    ELSE 'Finalized'
  END,
  COALESCE(credits, 1),
  COALESCE(difficulty, 'Standard'),
  COALESCE(estimated_hours, 0),
  COALESCE(min_role, 'Analyst'),
  COALESCE(capacity, 1),
  -- Wrap old scalar deadline into deadlines JSONB array
  CASE
    WHEN deadline IS NOT NULL AND deadline != ''
    THEN jsonb_build_array(jsonb_build_object('label', 'Final Deadline', 'date', deadline))
    ELSE NULL
  END,
  cycle_id,
  notes,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now()),
  created_by
FROM assignment_catalog
WHERE business_id IS NOT NULL
  AND business_id != ''
  AND business_id != '__volta_internal__'
ON CONFLICT (id) DO NOTHING;

-- Templates from catalog (no real business_id)
INSERT INTO assignment_templates (
  id, title, description, track, credits, difficulty, estimated_hours,
  min_role, capacity, notes, created_at, updated_at, created_by
)
SELECT
  id,
  title,
  description,
  COALESCE(primary_track, 'Tech'),
  COALESCE(credits, 1),
  COALESCE(difficulty, 'Standard'),
  COALESCE(estimated_hours, 0),
  COALESCE(min_role, 'Analyst'),
  COALESCE(capacity, 1),
  notes,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now()),
  created_by
FROM assignment_catalog
WHERE business_id IS NULL
   OR business_id = ''
   OR business_id = '__volta_internal__'
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Migrate finance_assignments → assignments
-- Prefix IDs with 'fa_' to avoid collision with assignment_catalog IDs.
-- ---------------------------------------------------------------------------
INSERT INTO assignments (
  id, title, type, track, status,
  assigned_member_ids, assigned_member_names, deadlines,
  deliverable_url, notes, region, team_label, seed_key,
  created_at, updated_at
)
SELECT
  'fa_' || id,
  title,
  type,                 -- 'Report' | 'Case Study'
  'Finance',
  CASE
    WHEN status = 'Ongoing'   THEN 'In Progress'
    WHEN status = 'Completed' THEN 'Approved'
    ELSE 'Open'
  END,
  assigned_member_ids,
  assigned_member_names,
  COALESCE(
    deadlines,
    CASE
      WHEN final_due_date IS NOT NULL AND final_due_date != ''
      THEN jsonb_build_array(jsonb_build_object('label', 'Final Deadline', 'date', final_due_date))
      WHEN deadline IS NOT NULL AND deadline != ''
      THEN jsonb_build_array(jsonb_build_object('label', 'Deadline', 'date', deadline))
      ELSE NULL
    END
  ),
  deliverable_url,
  notes,
  region,
  team_label,
  seed_key,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM finance_assignments
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Re-point assignment_claims FK to the new assignments table.
-- Active assignments kept their original IDs, so existing claims remain valid.
-- ---------------------------------------------------------------------------
ALTER TABLE assignment_claims
  DROP CONSTRAINT IF EXISTS assignment_claims_assignment_id_fkey;

ALTER TABLE assignment_claims
  ADD CONSTRAINT assignment_claims_assignment_id_fkey
  FOREIGN KEY (assignment_id) REFERENCES assignments(id)
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- Add usage tracking columns to email_templates (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS usage_count  integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
