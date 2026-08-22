CREATE TABLE IF NOT EXISTS pods (
  id                    text PRIMARY KEY,
  name                  text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  description           text NOT NULL DEFAULT '',
  cadence_days          integer NOT NULL DEFAULT 14,
  default_meeting_hours numeric(5,2) NOT NULL DEFAULT 1.5,
  default_task_hours    numeric(5,2) NOT NULL DEFAULT 2,
  status                text NOT NULL DEFAULT 'Active',
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pod_members (
  id          text PRIMARY KEY,
  pod_id      text NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  member_id   text NOT NULL,
  role        text NOT NULL DEFAULT 'member',
  joined_at   timestamptz NOT NULL DEFAULT now(),
  left_at     timestamptz,
  UNIQUE (pod_id, member_id)
);

CREATE INDEX IF NOT EXISTS pod_members_member_idx ON pod_members (member_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS pod_members_lit_idx    ON pod_members (pod_id)    WHERE role = 'lit' AND left_at IS NULL;

CREATE TABLE IF NOT EXISTS pod_meetings (
  id          text PRIMARY KEY,
  pod_id      text NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  meets_on    date NOT NULL,
  title       text NOT NULL DEFAULT '',
  hours       numeric(5,2) NOT NULL DEFAULT 1.5,
  notes       text NOT NULL DEFAULT '',
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pod_id, meets_on)
);

CREATE INDEX IF NOT EXISTS pod_meetings_pod_date_idx ON pod_meetings (pod_id, meets_on DESC);

CREATE TABLE IF NOT EXISTS pod_attendance (
  id          text PRIMARY KEY,
  meeting_id  text NOT NULL REFERENCES pod_meetings(id) ON DELETE CASCADE,
  member_id   text NOT NULL,
  status      text NOT NULL DEFAULT 'Present',
  tasks_done  integer NOT NULL DEFAULT 0,
  hours       numeric(5,2),
  note        text NOT NULL DEFAULT '',
  marked_by   text,
  marked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);

CREATE INDEX IF NOT EXISTS pod_attendance_member_idx ON pod_attendance (member_id);

INSERT INTO pods (id, name, slug, description, sort_order) VALUES
  ('pod_outreach',   'Small Business Outreach',        'outreach',
   'Find and connect with small businesses that could benefit from Novus''s marketing and web services.', 1),
  ('pod_grants',     'Grants & Funding',               'grants',
   'Research funding opportunities, create grant templates, support grant writing, track impact, and help develop financial plans for growth.', 2),
  ('pod_social',     'Novus Social Media & Branding',  'social',
   'Design social posts, manage Novus''s public-facing platforms, and create promotional materials for partnering small businesses.', 3),
  ('pod_ambassador', 'Novus Ambassadors',              'ambassadors',
   'Build relationships with schools, student organizations, pipeline programs, and community partners to recruit future Novus members.', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pod_members (id, pod_id, member_id, role)
SELECT 'pm_' || substr(md5('pod_grants' || t.id), 1, 20), 'pod_grants', t.id, 'member'
  FROM team t
 WHERE t.deleted_at IS NULL AND lower(trim(coalesce(t.pod,''))) = 'grants'
ON CONFLICT (pod_id, member_id) DO NOTHING;

CREATE OR REPLACE FUNCTION my_led_pods()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(pm.pod_id), '{}')
    FROM pod_members pm
    JOIN team t ON t.id = pm.member_id
   WHERE t.auth_uid = auth.uid()
     AND pm.role = 'lit'
     AND pm.left_at IS NULL
$$;

CREATE OR REPLACE FUNCTION my_pods()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(pm.pod_id), '{}')
    FROM pod_members pm
    JOIN team t ON t.id = pm.member_id
   WHERE t.auth_uid = auth.uid()
     AND pm.left_at IS NULL
$$;

ALTER TABLE pods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_meetings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pods_read              ON pods;
DROP POLICY IF EXISTS pods_admin_write       ON pods;
DROP POLICY IF EXISTS pods_lit_update        ON pods;
DROP POLICY IF EXISTS pod_members_read       ON pod_members;
DROP POLICY IF EXISTS pod_members_write      ON pod_members;
DROP POLICY IF EXISTS pod_meetings_read      ON pod_meetings;
DROP POLICY IF EXISTS pod_meetings_write     ON pod_meetings;
DROP POLICY IF EXISTS pod_attendance_read    ON pod_attendance;
DROP POLICY IF EXISTS pod_attendance_write   ON pod_attendance;

CREATE POLICY pods_read           ON pods           FOR SELECT TO authenticated USING (true);
CREATE POLICY pods_admin_write    ON pods           FOR ALL    TO authenticated
  USING (my_auth_role() IN ('owner','admin')) WITH CHECK (my_auth_role() IN ('owner','admin'));
CREATE POLICY pods_lit_update     ON pods           FOR UPDATE TO authenticated
  USING (id = ANY(my_led_pods())) WITH CHECK (id = ANY(my_led_pods()));

CREATE POLICY pod_members_read    ON pod_members    FOR SELECT TO authenticated USING (true);
CREATE POLICY pod_members_write   ON pod_members    FOR ALL    TO authenticated
  USING       (my_auth_role() IN ('owner','admin') OR pod_id = ANY(my_led_pods()))
  WITH CHECK  (my_auth_role() IN ('owner','admin') OR pod_id = ANY(my_led_pods()));

CREATE POLICY pod_meetings_read   ON pod_meetings   FOR SELECT TO authenticated
  USING (my_auth_role() IN ('owner','admin') OR pod_id = ANY(my_pods()));
CREATE POLICY pod_meetings_write  ON pod_meetings   FOR ALL    TO authenticated
  USING       (my_auth_role() IN ('owner','admin') OR pod_id = ANY(my_led_pods()))
  WITH CHECK  (my_auth_role() IN ('owner','admin') OR pod_id = ANY(my_led_pods()));

CREATE POLICY pod_attendance_read ON pod_attendance FOR SELECT TO authenticated
  USING (
    my_auth_role() IN ('owner','admin')
    OR member_id IN (SELECT id FROM team WHERE auth_uid = auth.uid())
    OR meeting_id IN (SELECT id FROM pod_meetings WHERE pod_id = ANY(my_led_pods()))
  );
CREATE POLICY pod_attendance_write ON pod_attendance FOR ALL TO authenticated
  USING (
    my_auth_role() IN ('owner','admin')
    OR meeting_id IN (SELECT id FROM pod_meetings WHERE pod_id = ANY(my_led_pods()))
  )
  WITH CHECK (
    my_auth_role() IN ('owner','admin')
    OR meeting_id IN (SELECT id FROM pod_meetings WHERE pod_id = ANY(my_led_pods()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON pods, pod_members, pod_meetings, pod_attendance TO authenticated;
GRANT ALL ON pods, pod_members, pod_meetings, pod_attendance TO service_role;

NOTIFY pgrst, 'reload schema';
