-- A chapter and its pod structure are one unit. The client previously inserted
-- the chapter first and cloned pods second, leaving a broken empty chapter if
-- the second write failed.

CREATE OR REPLACE FUNCTION public.create_chapter_with_pods(
  p_name text, p_slug text, p_city text, p_state text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_id text := 'chapter_' || replace(p_slug, '-', '_');
DECLARE v_order integer;
DECLARE v_template public.chapters%ROWTYPE;
BEGIN
  IF NOT is_trusted_writer() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF coalesce(trim(p_name),'') = '' OR coalesce(trim(p_slug),'') = '' THEN RAISE EXCEPTION 'chapter needs a name'; END IF;
  SELECT coalesce(max(sort_order),0) + 1 INTO v_order FROM public.chapters;
  INSERT INTO public.chapters (id,name,slug,city,state,status,sort_order,created_at,updated_at)
  VALUES (v_id, trim(p_name), p_slug, trim(coalesce(p_city,'')), upper(trim(coalesce(p_state,''))),
          'Launching', v_order, now(), now());

  SELECT * INTO v_template FROM public.chapters
   WHERE id <> v_id AND status <> 'Archived' ORDER BY sort_order LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.pods
      (id,name,slug,description,cadence_days,default_meeting_hours,default_task_hours,
       status,sort_order,chapter_id,track,serves,created_at,updated_at)
    SELECT 'pod_' || replace(gen_random_uuid()::text,'-',''), p.name,
           p_slug || '-' || CASE WHEN p.slug LIKE v_template.slug || '-%'
                                 THEN substr(p.slug, length(v_template.slug) + 2) ELSE p.slug END,
           p.description,p.cadence_days,p.default_meeting_hours,p.default_task_hours,
           'Active',p.sort_order,v_id,p.track,p.serves,now(),now()
      FROM public.pods p
     WHERE p.chapter_id = v_template.id AND p.status <> 'Archived';
  END IF;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_chapter_with_pods(text,text,text,text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
