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
    IF v_cell.status NOT IN ('Present','Late','Excused','Unexcused') THEN
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
      CASE
        WHEN v_cell.status = 'Present' THEN coalesce(v_cell.hours, v_meeting.hours)
        WHEN v_cell.status = 'Late' THEN coalesce(v_cell.hours, v_meeting.hours / 2)
        ELSE 0
      END,
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

REVOKE ALL ON FUNCTION public.save_pod_attendance(text,jsonb,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_pod_attendance(text,jsonb,text,numeric) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
