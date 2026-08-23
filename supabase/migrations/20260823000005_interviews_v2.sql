-- Direct interview scheduling replaces the retired availability-slot and
-- public self-booking workflow. Records in this table start at the August 23,
-- 2026 cutover; the legacy history is retained in the exported workbook.

CREATE TABLE IF NOT EXISTS public.interviews (
  id text PRIMARY KEY,
  applicant_id text REFERENCES public.applications(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 10 AND 240),
  meeting_link text NOT NULL DEFAULT '',
  interviewer_member_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
  notes text NOT NULL DEFAULT '',
  confirmation_sent_at timestamptz,
  reminder_sent_at timestamptz,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interviews_scheduled_at_idx
  ON public.interviews (scheduled_at DESC);
CREATE INDEX IF NOT EXISTS interviews_applicant_idx
  ON public.interviews (applicant_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS interviews_status_idx
  ON public.interviews (status, scheduled_at);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interviews_managers_all ON public.interviews;
DROP POLICY IF EXISTS interviews_interviewers_read ON public.interviews;
DROP POLICY IF EXISTS interviews_interviewers_insert ON public.interviews;
DROP POLICY IF EXISTS interviews_interviewers_update ON public.interviews;

CREATE POLICY interviews_managers_all ON public.interviews
  FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'auth_role') IN ('owner', 'admin'))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'auth_role') IN ('owner', 'admin'));

CREATE POLICY interviews_interviewers_read ON public.interviews
  FOR SELECT TO authenticated
  USING (coalesce((auth.jwt()->'app_metadata'->>'can_interview')::boolean, false));

CREATE POLICY interviews_interviewers_insert ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'can_interview')::boolean, false));

CREATE POLICY interviews_interviewers_update ON public.interviews
  FOR UPDATE TO authenticated
  USING (coalesce((auth.jwt()->'app_metadata'->>'can_interview')::boolean, false))
  WITH CHECK (coalesce((auth.jwt()->'app_metadata'->>'can_interview')::boolean, false));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;

DO $block$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.interviews;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$block$;

NOTIFY pgrst, 'reload schema';
