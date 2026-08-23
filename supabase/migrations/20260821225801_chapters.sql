-- Chapters.
--
-- A chapter is a MARKET, not a roster: it's the city whose small businesses we
-- take on as clients. Members are mostly remote and are not confined to one —
-- a Texas student building a Queens bakery's site is the normal case, not an
-- exception. So the chapter lives on the WORK (clients, and the pods that serve
-- them), and a member's own city is recorded separately as plain information.

CREATE TABLE IF NOT EXISTS chapters (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  city        text NOT NULL DEFAULT '',
  state       text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'Active',   -- Active | Launching | Archived
  site_url    text NOT NULL DEFAULT '',         -- novuschicago.org, when there is one
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO chapters (id, name, slug, city, state, status, sort_order) VALUES
  ('chapter_ny', 'New York', 'new-york', 'New York', 'NY', 'Active',    1),
  ('chapter_chi', 'Chicago', 'chicago',  'Chicago',  'IL', 'Launching', 2)
ON CONFLICT (id) DO NOTHING;

-- ── Chapter on the work ──────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id);
ALTER TABLE pods       ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id);

UPDATE businesses SET chapter_id = 'chapter_ny' WHERE chapter_id IS NULL AND deleted_at IS NULL;
UPDATE pods       SET chapter_id = 'chapter_ny' WHERE chapter_id IS NULL;

ALTER TABLE pods ALTER COLUMN chapter_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS businesses_chapter_idx ON businesses (chapter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS pods_chapter_idx       ON pods (chapter_id);

-- A pod name is only unique within its chapter: Chicago gets its own Grants pod.
ALTER TABLE pods DROP CONSTRAINT IF EXISTS pods_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS pods_chapter_slug_idx ON pods (chapter_id, slug);

-- Chicago's four, mirroring New York's so a new chapter starts with a structure.
INSERT INTO pods (id, name, slug, description, cadence_days, default_meeting_hours,
                  default_task_hours, status, sort_order, chapter_id)
SELECT replace(p.id, 'pod_', 'pod_chi_'), p.name, p.slug, p.description, p.cadence_days,
       p.default_meeting_hours, p.default_task_hours, 'Active', p.sort_order, 'chapter_chi'
  FROM pods p
 WHERE p.chapter_id = 'chapter_ny'
ON CONFLICT (id) DO NOTHING;

-- ── The member's own city — information, not an assignment ───────────────────
-- Recorded so we can tell when a market is worth opening. Austin has six people;
-- that is the kind of signal this answers. It is NOT the member's chapter.
ALTER TABLE team
  ADD COLUMN IF NOT EXISTS home_city  text,
  ADD COLUMN IF NOT EXISTS home_state text,
  -- Which market this member was recruited into. Almost always blank, which
  -- means New York. Set for a Chicago recruit who has no pod or client yet.
  ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id);

CREATE INDEX IF NOT EXISTS team_home_state_idx ON team (home_state) WHERE deleted_at IS NULL;

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chapters_read  ON chapters;
DROP POLICY IF EXISTS chapters_write ON chapters;
CREATE POLICY chapters_read  ON chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY chapters_write ON chapters FOR ALL TO authenticated
  USING (my_auth_role() IN ('owner','admin')) WITH CHECK (my_auth_role() IN ('owner','admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON chapters TO authenticated;
GRANT ALL ON chapters TO service_role;

NOTIFY pgrst, 'reload schema';
