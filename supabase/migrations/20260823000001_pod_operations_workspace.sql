ALTER TABLE public.pod_meetings
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_url text NOT NULL DEFAULT '';

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

CREATE TABLE IF NOT EXISTS public.grant_opportunities (
  id text PRIMARY KEY,
  pod_id text NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  name text NOT NULL,
  funder text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  deadline date,
  amount text NOT NULL DEFAULT '',
  geography text NOT NULL DEFAULT '',
  eligibility text NOT NULL DEFAULT '',
  focus_areas text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Researching'
    CHECK (status IN ('Researching', 'Ready to Share', 'Shared', 'Closed')),
  notes text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS grant_opportunities_pod_status_idx
  ON public.grant_opportunities (pod_id, status, deadline)
  WHERE deleted_at IS NULL;

ALTER TABLE public.grant_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS grant_opportunities_read ON public.grant_opportunities;
DROP POLICY IF EXISTS grant_opportunities_write ON public.grant_opportunities;

CREATE POLICY grant_opportunities_read ON public.grant_opportunities
  FOR SELECT TO authenticated
  USING (
    is_trusted_writer()
    OR pod_id = ANY(my_pods())
  );

CREATE POLICY grant_opportunities_write ON public.grant_opportunities
  FOR ALL TO authenticated
  USING (
    is_trusted_writer()
    OR pod_id = ANY(my_led_pods())
  )
  WITH CHECK (
    is_trusted_writer()
    OR pod_id = ANY(my_led_pods())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grant_opportunities TO authenticated;
GRANT ALL ON public.grant_opportunities TO service_role;

DO $block$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grant_opportunities;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$block$;

CREATE OR REPLACE FUNCTION public.set_assignment_workflow_status(
  p_assignment_id text,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_member_id text := my_team_id();
  v_is_manager boolean;
BEGIN
  IF p_status NOT IN ('Open', 'In Progress', 'In Review', 'Done') THEN
    RAISE EXCEPTION 'invalid assignment status';
  END IF;

  SELECT * INTO v_assignment
    FROM public.assignments
   WHERE id = p_assignment_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND OR v_assignment.pod_id IS NULL THEN
    RAISE EXCEPTION 'assignment not found';
  END IF;

  v_is_manager := is_trusted_writer() OR v_assignment.pod_id = ANY(my_led_pods());
  IF NOT v_is_manager AND NOT (v_member_id = ANY(coalesce(v_assignment.assigned_member_ids, '{}'))) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF NOT v_is_manager AND p_status NOT IN ('In Progress', 'In Review') THEN
    RAISE EXCEPTION 'members can only start work or request review';
  END IF;

  UPDATE public.assignments SET
    status = p_status,
    review_requested_at = CASE WHEN p_status = 'In Review' THEN now() ELSE NULL END,
    completed_at = CASE WHEN p_status = 'Done' THEN coalesce(completed_at, now()) ELSE NULL END,
    completed_by = CASE WHEN p_status = 'Done' THEN coalesce(v_member_id, 'system') ELSE NULL END,
    updated_at = now()
  WHERE id = p_assignment_id;
END
$function$;

REVOKE ALL ON FUNCTION public.set_assignment_workflow_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_assignment_workflow_status(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_assignment_workflow_status(text, text) TO service_role;

UPDATE public.email_templates
   SET body = '<p>Hi {{memberName}},</p><p><strong>{{meetingTitle}}</strong> is scheduled for {{meetingDate}} at {{meetingTime}}.</p><p><a href="{{meetingLink}}">Join or view meeting details</a></p><p><a href="{{portalLink}}">Open the member portal</a></p>',
       available_variables = ARRAY['memberName','podName','meetingTitle','meetingDate','meetingTime','meetingLink','portalLink'],
       updated_at = now(),
       updated_by = 'system'
 WHERE key = 'pod_meeting_reminder';

NOTIFY pgrst, 'reload schema';
