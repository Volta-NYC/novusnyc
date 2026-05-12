CREATE TABLE IF NOT EXISTS project_groups (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text DEFAULT '',
  color       text DEFAULT 'gray',
  status      text DEFAULT 'Ongoing',
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_groups_status_idx ON project_groups (status, sort_order, created_at);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS project_group_id text REFERENCES project_groups(id);
CREATE INDEX IF NOT EXISTS assignments_project_group_id_idx ON assignments (project_group_id);

ALTER TABLE project_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_groups_owner_all" ON project_groups FOR ALL TO authenticated
  USING (my_auth_role() = 'owner') WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "project_groups_admin_all" ON project_groups FOR ALL TO authenticated
  USING (my_auth_role() IN ('owner', 'admin')) WITH CHECK (my_auth_role() IN ('owner', 'admin'));

CREATE POLICY "project_groups_member_select" ON project_groups FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');

ALTER PUBLICATION supabase_realtime ADD TABLE project_groups;
