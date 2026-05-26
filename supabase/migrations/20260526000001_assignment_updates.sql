-- Assignment updates: admin-posted messages visible to members working on an assignment.
CREATE TABLE IF NOT EXISTS assignment_updates (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  assignment_id TEXT        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  message       TEXT        NOT NULL,
  posted_by     TEXT        NOT NULL,
  posted_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assignment_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assignment updates"
  ON assignment_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assignment updates"
  ON assignment_updates FOR INSERT TO authenticated WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
