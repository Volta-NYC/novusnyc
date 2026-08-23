CREATE TABLE IF NOT EXISTS public.pod_content_items (
  id text PRIMARY KEY,
  pod_id text NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  title text NOT NULL,
  platforms text[] NOT NULL DEFAULT '{}',
  content_type text NOT NULL DEFAULT 'Post',
  status text NOT NULL DEFAULT 'Idea'
    CHECK (status IN ('Idea', 'Drafting', 'In Review', 'Approved', 'Scheduled', 'Posted')),
  owner_member_id text REFERENCES public.team(id) ON DELETE SET NULL,
  reviewer_member_id text REFERENCES public.team(id) ON DELETE SET NULL,
  due_on date,
  scheduled_for timestamptz,
  canva_url text NOT NULL DEFAULT '',
  published_url text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS pod_content_items_queue_idx
  ON public.pod_content_items (pod_id, status, due_on)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pod_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pod_content_items_read ON public.pod_content_items
  FOR SELECT TO authenticated
  USING (is_trusted_writer() OR pod_id = ANY(my_pods()));

CREATE POLICY pod_content_items_write ON public.pod_content_items
  FOR ALL TO authenticated
  USING (is_trusted_writer() OR pod_id = ANY(my_led_pods()))
  WITH CHECK (is_trusted_writer() OR pod_id = ANY(my_led_pods()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pod_content_items TO authenticated;
GRANT ALL ON public.pod_content_items TO service_role;

DO $block$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pod_content_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$block$;

NOTIFY pgrst, 'reload schema';
