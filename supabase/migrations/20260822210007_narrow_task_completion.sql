-- An assignee only needs one operation: mark their task done (or reopen it).
-- A broad UPDATE policy exposed status timestamps and every unpinned column.

DROP POLICY IF EXISTS assignments_member_complete ON public.assignments;

CREATE OR REPLACE FUNCTION public.set_assignment_completion(p_assignment_id text, p_done boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_task public.assignments%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.assignments WHERE id = p_assignment_id FOR UPDATE;
  IF NOT FOUND OR v_task.deleted_at IS NOT NULL OR v_task.pod_id IS NULL THEN
    RAISE EXCEPTION 'task not found';
  END IF;
  IF NOT (
    is_trusted_writer()
    OR v_task.pod_id = ANY(my_led_pods())
    OR my_team_id() = ANY(coalesce(v_task.assigned_member_ids, '{}'::text[]))
  ) THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.assignments SET
    status = CASE WHEN p_done THEN 'Done' ELSE 'Open' END,
    completed_at = CASE WHEN p_done THEN now() ELSE NULL END,
    completed_by = CASE WHEN p_done THEN my_team_id() ELSE NULL END,
    updated_at = now()
  WHERE id = p_assignment_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_assignment_completion(text,boolean) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
