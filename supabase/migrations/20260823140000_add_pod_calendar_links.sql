ALTER TABLE public.pods
  ADD COLUMN IF NOT EXISTS calendar_url text NOT NULL DEFAULT '';

NOTIFY pgrst, 'reload schema';
