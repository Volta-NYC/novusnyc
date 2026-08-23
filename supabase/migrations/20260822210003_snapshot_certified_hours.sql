-- Certified service hours are an append-only journal. The previous view
-- recomputed totals from mutable meetings, tasks and projects, so deleting a
-- meeting or changing assignees rewrote history after hours had been reported.

CREATE TABLE IF NOT EXISTS public.certified_hour_entries (
  id          text PRIMARY KEY,
  member_id   text NOT NULL REFERENCES public.team(id),
  source      text NOT NULL CHECK (source IN ('meeting','task','project','adjustment')),
  source_id   text NOT NULL,
  department  text NOT NULL DEFAULT '',
  occurred_on date NOT NULL,
  hours       numeric(7,2) NOT NULL CHECK (hours <> 0),
  detail      text NOT NULL DEFAULT '',
  posted_at   timestamptz NOT NULL DEFAULT now(),
  posted_by   text
);

CREATE INDEX IF NOT EXISTS certified_hour_entries_member_date_idx
  ON public.certified_hour_entries (member_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS certified_hour_entries_source_idx
  ON public.certified_hour_entries (source, source_id, member_id);

ALTER TABLE public.certified_hour_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS certified_hour_entries_read ON public.certified_hour_entries;
CREATE POLICY certified_hour_entries_read ON public.certified_hour_entries
  FOR SELECT TO authenticated
  USING (my_auth_role() IN ('owner','admin') OR member_id = my_team_id());
REVOKE ALL ON public.certified_hour_entries FROM anon, authenticated;
GRANT SELECT ON public.certified_hour_entries TO authenticated;
GRANT ALL ON public.certified_hour_entries TO service_role;

-- Snapshot today's authoritative totals once. Deterministic IDs keep a replay
-- idempotent while later corrections remain separate journal rows.
INSERT INTO public.certified_hour_entries
  (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_at, posted_by)
SELECT 'seed:meeting:' || md5(a.meeting_id || ':' || a.member_id),
       a.member_id, 'meeting', a.meeting_id, p.name, m.meets_on,
       coalesce(a.hours, m.hours), coalesce(nullif(m.title,''), p.name || ' meeting'),
       coalesce(a.marked_at, now()), a.marked_by
  FROM public.pod_attendance a
  JOIN public.pod_meetings m ON m.id = a.meeting_id
  JOIN public.pods p ON p.id = m.pod_id
 WHERE a.status = 'Present' AND coalesce(a.hours, m.hours) <> 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certified_hour_entries
  (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_at, posted_by)
SELECT 'seed:task:' || md5(asg.id || ':' || member_id), member_id, 'task', asg.id,
       p.name, asg.completed_at::date, coalesce(asg.hours, p.default_task_hours), asg.title,
       asg.completed_at, asg.completed_by
  FROM public.assignments asg
  JOIN public.pods p ON p.id = asg.pod_id
  CROSS JOIN LATERAL unnest(coalesce(asg.assigned_member_ids, '{}'::text[])) member_id
 WHERE asg.completed_at IS NOT NULL AND coalesce(asg.hours, p.default_task_hours) <> 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certified_hour_entries
  (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_at)
SELECT 'seed:project:' || md5(b.id || ':' || member_id), member_id, 'project', b.id,
       'Tech', coalesce(b.last_touched_at, b.updated_at, b.created_at)::date,
       round(b.hours_logged / greatest(array_length(b.assignees, 1), 1)::numeric, 2), b.name,
       coalesce(b.last_touched_at, b.updated_at, b.created_at, now())
  FROM public.businesses b
  CROSS JOIN LATERAL unnest(coalesce(b.assignees, '{}'::text[])) member_id
 WHERE b.hours_logged > 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certified_hour_entries
  (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_at, posted_by)
SELECT 'seed:adjustment:' || md5(h.id), h.member_id, 'adjustment', h.id,
       'Adjustment', h.occurred_on, h.hours, h.reason, coalesce(h.created_at, now()), h.created_by
  FROM public.hours_adjustments h WHERE h.hours <> 0
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_certified_hour_delta(
  p_source text, p_source_id text, p_member_id text, p_department text,
  p_occurred_on date, p_desired numeric, p_detail text, p_posted_by text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_current numeric;
DECLARE v_delta numeric;
BEGIN
  SELECT coalesce(sum(hours), 0) INTO v_current
    FROM public.certified_hour_entries
   WHERE source = p_source AND source_id = p_source_id AND member_id = p_member_id;
  v_delta := round(coalesce(p_desired, 0) - v_current, 2);
  IF v_delta <> 0 THEN
    INSERT INTO public.certified_hour_entries
      (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_by)
    VALUES ('hour_' || replace(gen_random_uuid()::text, '-', ''), p_member_id, p_source,
            p_source_id, coalesce(p_department,''), p_occurred_on, v_delta,
            coalesce(p_detail,''), p_posted_by);
  END IF;
END;
$function$;

ALTER TABLE public.pod_meetings
  ADD COLUMN IF NOT EXISTS attendance_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_finalized_by text;

CREATE OR REPLACE FUNCTION public.save_pod_attendance(
  p_meeting_id text, p_cells jsonb, p_title text, p_hours numeric
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_meeting public.pod_meetings%ROWTYPE;
DECLARE v_cell record;
DECLARE v_count integer := 0;
DECLARE v_expected integer := 0;
DECLARE v_marked integer := 0;
DECLARE v_actor text := my_team_id();
DECLARE v_department text;
BEGIN
  SELECT * INTO v_meeting FROM public.pod_meetings WHERE id = p_meeting_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'meeting not found'; END IF;
  IF NOT (is_trusted_writer() OR v_meeting.pod_id = ANY(my_led_pods())) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.pod_meetings
     SET title = coalesce(p_title, title), hours = coalesce(p_hours, hours)
   WHERE id = p_meeting_id
   RETURNING * INTO v_meeting;
  SELECT name INTO v_department FROM public.pods WHERE id = v_meeting.pod_id;

  FOR v_cell IN
    SELECT * FROM jsonb_to_recordset(coalesce(p_cells, '[]'::jsonb)) AS x(
      member_id text, status text, tasks_done integer, hours numeric, note text
    )
  LOOP
    IF v_cell.status NOT IN ('Present','Excused','Unexcused') THEN
      RAISE EXCEPTION 'invalid attendance status';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.pod_members pm
       WHERE pm.pod_id = v_meeting.pod_id AND pm.member_id = v_cell.member_id
         AND pm.joined_at::date <= v_meeting.meets_on
         AND (pm.left_at IS NULL OR pm.left_at::date >= v_meeting.meets_on)
      UNION ALL
      SELECT 1 FROM public.pod_attendance pa
       WHERE pa.meeting_id = p_meeting_id AND pa.member_id = v_cell.member_id
    ) THEN RAISE EXCEPTION 'member was not on this meeting roster'; END IF;

    INSERT INTO public.pod_attendance
      (id, meeting_id, member_id, status, tasks_done, hours, note, marked_by, marked_at)
    VALUES ('attendance_' || replace(gen_random_uuid()::text, '-', ''), p_meeting_id,
            v_cell.member_id, v_cell.status, coalesce(v_cell.tasks_done,0), v_cell.hours,
            coalesce(v_cell.note,''), v_actor, now())
    ON CONFLICT (meeting_id, member_id) DO UPDATE SET
      status = EXCLUDED.status, tasks_done = EXCLUDED.tasks_done, hours = EXCLUDED.hours,
      note = EXCLUDED.note, marked_by = EXCLUDED.marked_by, marked_at = EXCLUDED.marked_at;

    PERFORM public.record_certified_hour_delta(
      'meeting', p_meeting_id, v_cell.member_id, v_department, v_meeting.meets_on,
      CASE WHEN v_cell.status = 'Present' THEN coalesce(v_cell.hours, v_meeting.hours) ELSE 0 END,
      coalesce(nullif(v_meeting.title,''), v_department || ' meeting'), v_actor
    );
    v_count := v_count + 1;
  END LOOP;

  SELECT count(*) INTO v_expected FROM public.pod_members pm
   WHERE pm.pod_id = v_meeting.pod_id AND pm.joined_at::date <= v_meeting.meets_on
     AND (pm.left_at IS NULL OR pm.left_at::date >= v_meeting.meets_on);
  SELECT count(*) INTO v_marked FROM public.pod_attendance WHERE meeting_id = p_meeting_id;
  UPDATE public.pod_meetings SET
    attendance_finalized_at = CASE WHEN v_expected > 0 AND v_marked >= v_expected THEN now() ELSE NULL END,
    attendance_finalized_by = CASE WHEN v_expected > 0 AND v_marked >= v_expected THEN v_actor ELSE NULL END
  WHERE id = p_meeting_id;
  RETURN v_count;
END;
$function$;

REVOKE INSERT, UPDATE, DELETE ON public.pod_attendance FROM authenticated;
DROP POLICY IF EXISTS pod_attendance_write ON public.pod_attendance;
GRANT EXECUTE ON FUNCTION public.save_pod_attendance(text,jsonb,text,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_task_certified_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_member text; DECLARE v_department text; DECLARE v_desired numeric;
BEGIN
  SELECT name INTO v_department FROM public.pods WHERE id = NEW.pod_id;
  FOR v_member IN SELECT DISTINCT unnest(
    coalesce(OLD.assigned_member_ids, '{}'::text[]) || coalesce(NEW.assigned_member_ids, '{}'::text[])
  ) LOOP
    v_desired := CASE WHEN NEW.completed_at IS NOT NULL AND v_member = ANY(coalesce(NEW.assigned_member_ids,'{}'::text[]))
                      THEN coalesce(NEW.hours, (SELECT default_task_hours FROM public.pods WHERE id = NEW.pod_id), 0)
                      ELSE 0 END;
    PERFORM public.record_certified_hour_delta('task', NEW.id, v_member, v_department,
      coalesce(NEW.completed_at::date, current_date), v_desired, NEW.title, NEW.completed_by);
  END LOOP;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS assignments_certify_hours ON public.assignments;
CREATE TRIGGER assignments_certify_hours AFTER INSERT OR UPDATE OF completed_at, hours, assigned_member_ids
  ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.reconcile_task_certified_hours();

CREATE OR REPLACE FUNCTION public.reconcile_project_certified_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_member text; DECLARE v_desired numeric;
BEGIN
  FOR v_member IN SELECT DISTINCT unnest(
    coalesce(OLD.assignees, '{}'::text[]) || coalesce(NEW.assignees, '{}'::text[])
  ) LOOP
    v_desired := CASE WHEN v_member = ANY(coalesce(NEW.assignees,'{}'::text[]))
                      THEN round(coalesce(NEW.hours_logged,0) / greatest(array_length(NEW.assignees,1),1)::numeric, 2)
                      ELSE 0 END;
    PERFORM public.record_certified_hour_delta('project', NEW.id, v_member, 'Tech',
      coalesce(NEW.last_touched_at, NEW.updated_at, NEW.created_at, now())::date,
      v_desired, NEW.name, my_team_id());
  END LOOP;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS businesses_certify_hours ON public.businesses;
CREATE TRIGGER businesses_certify_hours AFTER INSERT OR UPDATE OF hours_logged, assignees
  ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.reconcile_project_certified_hours();

CREATE OR REPLACE FUNCTION public.hours_adjustments_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'Certified adjustments are append-only; post a correcting adjustment instead.';
END;
$function$;
DROP TRIGGER IF EXISTS hours_adjustments_immutable ON public.hours_adjustments;
CREATE TRIGGER hours_adjustments_immutable BEFORE UPDATE OR DELETE ON public.hours_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.hours_adjustments_append_only();

CREATE OR REPLACE FUNCTION public.certify_hours_adjustment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.hours <> 0 THEN
    INSERT INTO public.certified_hour_entries
      (id, member_id, source, source_id, department, occurred_on, hours, detail, posted_by)
    VALUES ('hour_' || replace(gen_random_uuid()::text, '-', ''), NEW.member_id, 'adjustment',
            NEW.id, 'Adjustment', NEW.occurred_on, NEW.hours, NEW.reason, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS hours_adjustments_certify ON public.hours_adjustments;
CREATE TRIGGER hours_adjustments_certify AFTER INSERT ON public.hours_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.certify_hours_adjustment();

CREATE OR REPLACE VIEW public.member_hours_ledger AS
SELECT member_id, source, department, occurred_on, round(sum(hours),2) AS hours,
       max(detail) AS detail
  FROM public.certified_hour_entries
 GROUP BY member_id, source, source_id, department, occurred_on
HAVING round(sum(hours),2) <> 0;
ALTER VIEW public.member_hours_ledger SET (security_invoker = on);
REVOKE ALL ON public.member_hours_ledger FROM anon;
GRANT SELECT ON public.member_hours_ledger TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
