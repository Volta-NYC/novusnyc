CREATE TABLE IF NOT EXISTS public.pod_outreach_records (
  id text PRIMARY KEY,
  pod_id text NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  subject_type text NOT NULL CHECK (subject_type IN ('Business', 'School', 'Partner Organization')),
  subject_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  owner_member_id text REFERENCES public.team(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Researching'
    CHECK (status IN ('Researching', 'Ready to Contact', 'Contacted', 'Responded', 'Call Scheduled', 'Handed Off', 'Closed')),
  last_contact_on date,
  follow_up_on date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS pod_outreach_records_queue_idx
  ON public.pod_outreach_records (pod_id, status, follow_up_on)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pod_outreach_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY pod_outreach_records_read ON public.pod_outreach_records
  FOR SELECT TO authenticated
  USING (is_trusted_writer() OR pod_id = ANY(my_pods()));

CREATE POLICY pod_outreach_records_write ON public.pod_outreach_records
  FOR ALL TO authenticated
  USING (is_trusted_writer() OR pod_id = ANY(my_led_pods()))
  WITH CHECK (is_trusted_writer() OR pod_id = ANY(my_led_pods()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pod_outreach_records TO authenticated;
GRANT ALL ON public.pod_outreach_records TO service_role;

DO $block$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pod_outreach_records;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$block$;

NOTIFY pgrst, 'reload schema';
