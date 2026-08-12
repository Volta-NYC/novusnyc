ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS public_stat_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
