-- Acceptance and member creation/linking must be one transaction. TypeScript
-- decides which person is the match and which blank fields to fill; this RPC
-- applies that decision and stamps the application atomically.

CREATE OR REPLACE FUNCTION public.promote_application_transaction(
  p_application_id text,
  p_member_id text,
  p_member_patch jsonb,
  p_source_note text,
  p_decided_by text,
  p_final_role text,
  p_interview_slot_id text DEFAULT NULL,
  p_interview_scheduled_at text DEFAULT NULL,
  p_application_notes text DEFAULT NULL
)
RETURNS TABLE(member_id text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_id text := coalesce(nullif(p_member_id, ''), p_member_patch->>'id');
  v_action text;
BEGIN
  IF coalesce(p_application_id, '') = '' OR coalesce(v_member_id, '') = '' THEN
    RAISE EXCEPTION 'missing promotion identifiers';
  END IF;

  PERFORM 1 FROM public.applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;

  IF nullif(p_member_id, '') IS NULL THEN
    INSERT INTO public.team (
      id, name, school, grade, divisions, role, slack_handle, email,
      alternate_email, status, skills, join_date, accepted_date,
      home_city, home_state, chapter_id, created_at, updated_at
    ) VALUES (
      v_member_id,
      p_member_patch->>'name',
      coalesce(p_member_patch->>'school', ''),
      coalesce(p_member_patch->>'grade', ''),
      coalesce(ARRAY(SELECT jsonb_array_elements_text(p_member_patch->'divisions')), '{}'::text[]),
      p_member_patch->>'role',
      coalesce(p_member_patch->>'slack_handle', ''),
      p_member_patch->>'email',
      coalesce(p_member_patch->>'alternate_email', ''),
      coalesce(p_member_patch->>'status', 'Active'),
      coalesce(ARRAY(SELECT jsonb_array_elements_text(p_member_patch->'skills')), '{}'::text[]),
      p_member_patch->>'join_date',
      p_member_patch->>'accepted_date',
      nullif(p_member_patch->>'home_city', ''),
      nullif(p_member_patch->>'home_state', ''),
      nullif(p_member_patch->>'chapter_id', ''),
      coalesce((p_member_patch->>'created_at')::timestamptz, now()),
      coalesce((p_member_patch->>'updated_at')::timestamptz, now())
    );
    v_action := 'created';
  ELSE
    UPDATE public.team SET
      name            = CASE WHEN p_member_patch ? 'name'            THEN p_member_patch->>'name' ELSE name END,
      email           = CASE WHEN p_member_patch ? 'email'           THEN p_member_patch->>'email' ELSE email END,
      alternate_email = CASE WHEN p_member_patch ? 'alternate_email' THEN p_member_patch->>'alternate_email' ELSE alternate_email END,
      school          = CASE WHEN p_member_patch ? 'school'          THEN p_member_patch->>'school' ELSE school END,
      grade           = CASE WHEN p_member_patch ? 'grade'           THEN p_member_patch->>'grade' ELSE grade END,
      accepted_date   = CASE WHEN p_member_patch ? 'accepted_date'   THEN p_member_patch->>'accepted_date' ELSE accepted_date END,
      divisions       = CASE WHEN p_member_patch ? 'divisions'
                             THEN ARRAY(SELECT jsonb_array_elements_text(p_member_patch->'divisions')) ELSE divisions END,
      role            = CASE WHEN p_member_patch ? 'role'            THEN p_member_patch->>'role' ELSE role END,
      status          = CASE WHEN p_member_patch ? 'status'          THEN p_member_patch->>'status' ELSE status END,
      home_city       = CASE WHEN p_member_patch ? 'home_city'       THEN nullif(p_member_patch->>'home_city', '') ELSE home_city END,
      home_state      = CASE WHEN p_member_patch ? 'home_state'      THEN nullif(p_member_patch->>'home_state', '') ELSE home_state END,
      chapter_id      = CASE WHEN p_member_patch ? 'chapter_id'      THEN nullif(p_member_patch->>'chapter_id', '') ELSE chapter_id END,
      updated_at      = now()
    WHERE id = v_member_id AND deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'member not found'; END IF;
    v_action := 'updated';
  END IF;

  IF coalesce(p_source_note, '') <> '' THEN
    INSERT INTO public.member_notes (member_id, note, updated_at)
    VALUES (v_member_id, p_source_note, now())
    ON CONFLICT ON CONSTRAINT member_notes_pkey DO UPDATE
      SET note = EXCLUDED.note, updated_at = EXCLUDED.updated_at;
  END IF;

  UPDATE public.applications SET
    member_id = v_member_id,
    status = 'Accepted',
    final_decision_role = p_final_role,
    decided_at = now(),
    decided_by = coalesce(p_decided_by, ''),
    interview_slot_id = coalesce(p_interview_slot_id, interview_slot_id),
    interview_scheduled_at = coalesce(p_interview_scheduled_at, interview_scheduled_at),
    notes = coalesce(p_application_notes, notes),
    updated_at = now()
  WHERE id = p_application_id;

  RETURN QUERY SELECT v_member_id, v_action;
END;
$function$;

REVOKE ALL ON FUNCTION public.promote_application_transaction(text,text,jsonb,text,text,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_application_transaction(text,text,jsonb,text,text,text,text,text,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
