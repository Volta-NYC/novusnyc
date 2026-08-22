-- Structured location replaces the free-text "City, State" going forward.
-- city_state is kept, not dropped: 270 historical applications hold values that
-- described where someone lived when they applied, and re-collecting that would
-- not make the old rows any more true.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS state   text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS city    text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS chapter text;

-- Chapters are editable from the admin portal, so they live in settings rather
-- than in code. Order is meaningful and preserved by using an array.
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS chapters text[]
  DEFAULT ARRAY['New York', 'Boston', 'Chicago', 'California', 'Michigan'];

UPDATE site_settings
SET chapters = ARRAY['New York', 'Boston', 'Chicago', 'California', 'Michigan']
WHERE chapters IS NULL;
