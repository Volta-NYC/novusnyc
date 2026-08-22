-- Thresholds get their own column rather than riding inside `permissions`,
-- which is parsed into a fixed shape that would drop unknown keys.
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS infraction_thresholds jsonb
    NOT NULL DEFAULT '{"notice": 3, "warning": 6, "review": 10}'::jsonb;

UPDATE site_settings
   SET permissions = permissions - 'infractionThresholds'
 WHERE permissions ? 'infractionThresholds';

NOTIFY pgrst, 'reload schema';
