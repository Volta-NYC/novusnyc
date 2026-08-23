UPDATE team SET role = 'Team Lead', updated_at = now()
 WHERE deleted_at IS NULL AND role = 'Senior Associate' AND NOT ('Tech' = ANY(divisions));

UPDATE team SET role = 'Developer', updated_at = now()
 WHERE deleted_at IS NULL AND role = 'Senior Associate' AND 'Tech' = ANY(divisions);

UPDATE team SET role = 'Member', updated_at = now()
 WHERE deleted_at IS NULL AND role IN ('Associate', 'Senior Analyst', 'Analyst');

CREATE OR REPLACE VIEW member_contributions AS
WITH hours AS (
  SELECT member_id,
         round(coalesce(sum(hours), 0), 2)                                  AS hours_total,
         round(coalesce(sum(hours) FILTER (WHERE source='meeting'), 0), 2)  AS hours_meeting,
         round(coalesce(sum(hours) FILTER (WHERE source='task'), 0), 2)     AS hours_task,
         round(coalesce(sum(hours) FILTER (WHERE source='project'), 0), 2)  AS hours_project,
         min(occurred_on) AS hours_first,
         max(occurred_on) AS hours_last
    FROM member_hours_ledger GROUP BY member_id
),
meetings AS (
  SELECT a.member_id,
         count(*) FILTER (WHERE a.status = 'Present')   AS meetings_present,
         count(*) FILTER (WHERE a.status = 'Excused')   AS meetings_excused,
         count(*) FILTER (WHERE a.status = 'Unexcused') AS meetings_missed,
         coalesce(sum(a.tasks_done), 0)                 AS tasks_reported,
         max(m.meets_on)                                AS last_meeting
    FROM pod_attendance a JOIN pod_meetings m ON m.id = a.meeting_id
   GROUP BY a.member_id
),
tasks AS (
  SELECT member_id,
         count(*) FILTER (WHERE completed_at IS NOT NULL) AS tasks_done,
         count(*) FILTER (WHERE completed_at IS NULL)     AS tasks_open,
         count(*) FILTER (WHERE completed_at IS NULL AND due_date IS NOT NULL
                            AND due_date < current_date)  AS tasks_overdue,
         max(completed_at::date)                          AS last_task
    FROM (
      SELECT unnest(assigned_member_ids) AS member_id, completed_at, due_date
        FROM assignments WHERE pod_id IS NOT NULL
    ) t GROUP BY member_id
),
projects AS (
  SELECT member_id,
         count(*) FILTER (WHERE tech_status = 'Live')                          AS projects_live,
         count(*) FILTER (WHERE tech_status IN ('Assigned','Building','Draft Ready','With Client')) AS projects_active,
         count(*)                                                              AS projects_total,
         max(last_touched)                                                     AS last_project
    FROM (
      SELECT unnest(assignees) AS member_id, tech_status,
             coalesce(last_touched_at, updated_at, created_at)::date AS last_touched
        FROM businesses WHERE deleted_at IS NULL AND NOT coalesce(archived, false)
    ) b GROUP BY member_id
),
strikes AS (
  SELECT member_id, coalesce(sum(points), 0) AS infraction_points, count(*) AS infraction_count
    FROM member_strikes GROUP BY member_id
),
pods AS (
  SELECT member_id,
         count(*) FILTER (WHERE role = 'lit') AS pods_led,
         count(*)                             AS pods_joined
    FROM pod_members WHERE left_at IS NULL GROUP BY member_id
)
SELECT
  t.id                                          AS member_id,
  coalesce(h.hours_total, 0)                    AS hours_total,
  coalesce(h.hours_meeting, 0)                  AS hours_meeting,
  coalesce(h.hours_task, 0)                     AS hours_task,
  coalesce(h.hours_project, 0)                  AS hours_project,
  coalesce(mt.meetings_present, 0)              AS meetings_present,
  coalesce(mt.meetings_excused, 0)              AS meetings_excused,
  coalesce(mt.meetings_missed, 0)               AS meetings_missed,
  coalesce(tk.tasks_done, 0)                    AS tasks_done,
  coalesce(tk.tasks_open, 0)                    AS tasks_open,
  coalesce(tk.tasks_overdue, 0)                 AS tasks_overdue,
  coalesce(pr.projects_live, 0)                 AS projects_live,
  coalesce(pr.projects_active, 0)               AS projects_active,
  coalesce(pr.projects_total, 0)                AS projects_total,
  coalesce(pd.pods_led, 0)                      AS pods_led,
  coalesce(pd.pods_joined, 0)                   AS pods_joined,
  coalesce(st.infraction_points, 0)             AS infraction_points,
  coalesce(st.infraction_count, 0)              AS infraction_count,
  ( coalesce(pr.projects_live, 0)   * 10
  + coalesce(pr.projects_active, 0) * 3
  + coalesce(tk.tasks_done, 0)      * 2
  + coalesce(mt.meetings_present, 0)
  + coalesce(h.hours_total, 0)
  )::numeric(10,2)                              AS work_score,
  greatest(
    coalesce(h.hours_last, '1900-01-01'::date),
    coalesce(mt.last_meeting, '1900-01-01'::date),
    coalesce(tk.last_task, '1900-01-01'::date),
    coalesce(pr.last_project, '1900-01-01'::date)
  )                                             AS last_activity,
  (coalesce(h.hours_total,0) = 0
   AND coalesce(tk.tasks_done,0) = 0
   AND coalesce(pr.projects_total,0) = 0
   AND coalesce(mt.meetings_present,0) = 0)     AS no_recorded_work
FROM team t
LEFT JOIN hours    h  ON h.member_id  = t.id
LEFT JOIN meetings mt ON mt.member_id = t.id
LEFT JOIN tasks    tk ON tk.member_id = t.id
LEFT JOIN projects pr ON pr.member_id = t.id
LEFT JOIN strikes  st ON st.member_id = t.id
LEFT JOIN pods     pd ON pd.member_id = t.id
WHERE t.deleted_at IS NULL;

GRANT SELECT ON member_contributions TO authenticated, service_role;

UPDATE infractions
   SET name = 'Missed an assigned task',
       description = 'Did not finish a task they were assigned, by the deadline.',
       updated_at = now()
 WHERE name = 'Not Completing a Claimed Assignment';

INSERT INTO infractions (id, name, description, points, created_at, updated_at)
SELECT gen_random_uuid()::text, v.name, v.description, v.points, now(), now()
  FROM (VALUES
    ('Unexcused absence',
     'Missed a pod meeting without letting the LIT know beforehand. Issued from the attendance grid.', 2),
    ('Repeated unexcused absence',
     'A second or later unexcused absence in the same term.', 3),
    ('Unresponsive to their pod',
     'Did not reply to their LIT or pod over a full meeting cycle.', 2)
  ) AS v(name, description, points)
 WHERE NOT EXISTS (SELECT 1 FROM infractions i WHERE lower(i.name) = lower(v.name));

UPDATE site_settings
   SET permissions = coalesce(permissions, '{}'::jsonb) || jsonb_build_object(
         'infractionThresholds', jsonb_build_object('notice', 3, 'warning', 6, 'review', 10))
 WHERE id = (SELECT id FROM site_settings LIMIT 1);
