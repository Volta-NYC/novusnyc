-- Hours replace credits.
--
-- Credits were an invented currency (5 credits = 1 hour) with no meaning outside
-- Novus. Hours are what gets certified on a service letter, so they become the
-- unit. The ledger is a VIEW over the places work is already recorded rather
-- than a denormalised total that has to be kept in sync.

-- ── Assignments become pod-scoped and push-based ─────────────────────────────
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS pod_id       text REFERENCES pods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date     date,
  ADD COLUMN IF NOT EXISTS hours        numeric(5,2),  -- NULL = inherit pods.default_task_hours
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by text;

CREATE INDEX IF NOT EXISTS assignments_pod_idx ON assignments (pod_id, due_date);

-- ── Manual corrections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hours_adjustments (
  id          text PRIMARY KEY,
  member_id   text NOT NULL,
  hours       numeric(6,2) NOT NULL,     -- signed: negative to claw back
  reason      text NOT NULL DEFAULT '',
  occurred_on date NOT NULL DEFAULT current_date,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hours_adjustments_member_idx ON hours_adjustments (member_id);

-- ── The ledger ───────────────────────────────────────────────────────────────
-- One row per hour-earning event, from every source. A service letter is a
-- filter on this by member and date range.
CREATE OR REPLACE VIEW member_hours_ledger AS
  -- Pod meetings: showing up earns the meeting's hours unless the cell overrides.
  SELECT
    a.member_id,
    'meeting'::text                        AS source,
    p.name                                 AS department,
    m.meets_on                             AS occurred_on,
    coalesce(a.hours, m.hours)             AS hours,
    coalesce(nullif(m.title,''), p.name || ' meeting') AS detail
  FROM pod_attendance a
  JOIN pod_meetings   m ON m.id = a.meeting_id
  JOIN pods           p ON p.id = m.pod_id
  WHERE a.status IN ('Present','Excused')

  UNION ALL

  -- Pod assignments: completing one earns its hours, or the pod's default.
  SELECT
    unnest(asg.assigned_member_ids)        AS member_id,
    'task'::text                           AS source,
    p.name                                 AS department,
    asg.completed_at::date                 AS occurred_on,
    coalesce(asg.hours, p.default_task_hours) AS hours,
    asg.title                              AS detail
  FROM assignments asg
  JOIN pods p ON p.id = asg.pod_id
  WHERE asg.completed_at IS NOT NULL
    AND array_length(asg.assigned_member_ids, 1) > 0

  UNION ALL

  -- Tech projects: hours are entered by hand by Tahmid or a tech lead. Tech is
  -- judged on shipped websites rather than logged time, so this stays optional
  -- and is split evenly across whoever built it.
  SELECT
    unnest(b.assignees)                    AS member_id,
    'project'::text                        AS source,
    'Tech'::text                           AS department,
    coalesce(b.last_touched_at, b.updated_at, b.created_at)::date AS occurred_on,
    round(b.hours_logged / greatest(array_length(b.assignees, 1), 1), 2) AS hours,
    b.name                                 AS detail
  FROM businesses b
  WHERE b.deleted_at IS NULL
    AND b.hours_logged > 0
    AND array_length(b.assignees, 1) > 0

  UNION ALL

  SELECT
    h.member_id,
    'adjustment'::text                     AS source,
    'Adjustment'::text                     AS department,
    h.occurred_on,
    h.hours,
    h.reason                               AS detail
  FROM hours_adjustments h;

CREATE OR REPLACE VIEW member_hours_totals AS
  SELECT member_id,
         round(sum(hours), 2)                                          AS total_hours,
         round(sum(hours) FILTER (WHERE source = 'meeting'), 2)        AS meeting_hours,
         round(sum(hours) FILTER (WHERE source = 'task'), 2)           AS task_hours,
         round(sum(hours) FILTER (WHERE source = 'project'), 2)        AS project_hours,
         round(sum(hours) FILTER (WHERE source = 'adjustment'), 2)     AS adjustment_hours,
         min(occurred_on)                                              AS first_activity,
         max(occurred_on)                                              AS last_activity
    FROM member_hours_ledger
   GROUP BY member_id;

ALTER TABLE hours_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hours_adjustments_read  ON hours_adjustments;
DROP POLICY IF EXISTS hours_adjustments_write ON hours_adjustments;

CREATE POLICY hours_adjustments_read  ON hours_adjustments FOR SELECT TO authenticated
  USING (my_auth_role() IN ('owner','admin')
         OR member_id IN (SELECT id FROM team WHERE auth_uid = auth.uid()));
CREATE POLICY hours_adjustments_write ON hours_adjustments FOR ALL TO authenticated
  USING (my_auth_role() IN ('owner','admin')) WITH CHECK (my_auth_role() IN ('owner','admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON hours_adjustments TO authenticated;
GRANT SELECT ON member_hours_ledger, member_hours_totals TO authenticated;
GRANT ALL ON hours_adjustments TO service_role;
GRANT SELECT ON member_hours_ledger, member_hours_totals TO service_role;

NOTIFY pgrst, 'reload schema';
