-- These hours are certified to schools, so an excused absence must not earn the
-- same credit as attending. Excused still protects standing — it is simply not
-- time served. Only the meeting branch's status filter changes.
CREATE OR REPLACE VIEW member_hours_ledger AS
 SELECT a.member_id,
    'meeting'::text AS source,
    p.name AS department,
    m.meets_on AS occurred_on,
    COALESCE(a.hours, m.hours) AS hours,
    COALESCE(NULLIF(m.title, ''::text), p.name || ' meeting'::text) AS detail
   FROM pod_attendance a
     JOIN pod_meetings m ON m.id = a.meeting_id
     JOIN pods p ON p.id = m.pod_id
  WHERE a.status = 'Present'::text
UNION ALL
 SELECT unnest(asg.assigned_member_ids) AS member_id,
    'task'::text AS source,
    p.name AS department,
    asg.completed_at::date AS occurred_on,
    COALESCE(asg.hours, p.default_task_hours) AS hours,
    asg.title AS detail
   FROM assignments asg
     JOIN pods p ON p.id = asg.pod_id
  WHERE asg.completed_at IS NOT NULL AND array_length(asg.assigned_member_ids, 1) > 0
UNION ALL
 SELECT unnest(b.assignees) AS member_id,
    'project'::text AS source,
    'Tech'::text AS department,
    COALESCE(b.last_touched_at, b.updated_at, b.created_at)::date AS occurred_on,
    round(b.hours_logged / GREATEST(array_length(b.assignees, 1), 1)::numeric, 2) AS hours,
    b.name AS detail
   FROM businesses b
  WHERE b.deleted_at IS NULL AND b.hours_logged > 0::numeric AND array_length(b.assignees, 1) > 0
UNION ALL
 SELECT h.member_id,
    'adjustment'::text AS source,
    'Adjustment'::text AS department,
    h.occurred_on,
    h.hours,
    h.reason AS detail
   FROM hours_adjustments h;

ALTER VIEW member_hours_ledger SET (security_invoker = on);
REVOKE ALL ON member_hours_ledger FROM anon;
GRANT SELECT ON member_hours_ledger TO authenticated;
