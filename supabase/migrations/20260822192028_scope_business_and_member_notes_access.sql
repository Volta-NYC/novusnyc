DROP POLICY IF EXISTS businesses_member_select ON businesses;
CREATE POLICY businesses_scoped_select ON businesses FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      my_auth_role() IN ('owner', 'admin') OR is_tech_lead()
      OR coalesce(array_length(my_led_pods(), 1), 0) > 0
      OR my_team_id() = ANY (assignees)
    )
  );

CREATE TABLE IF NOT EXISTS member_notes (
  member_id text PRIMARY KEY REFERENCES team(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO member_notes (member_id, note)
SELECT id, notes FROM team WHERE coalesce(notes, '') <> ''
ON CONFLICT (member_id) DO NOTHING;
ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_notes_admin_all ON member_notes;
CREATE POLICY member_notes_admin_all ON member_notes FOR ALL TO authenticated
  USING (my_auth_role() IN ('owner', 'admin'))
  WITH CHECK (my_auth_role() IN ('owner', 'admin'));
