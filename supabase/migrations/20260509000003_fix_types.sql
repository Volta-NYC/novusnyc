-- sort_index can hold large timestamp-like values from Firebase
ALTER TABLE businesses ALTER COLUMN sort_index TYPE bigint;
ALTER TABLE bids       ALTER COLUMN sort_index TYPE bigint;

-- email_templates.key is not unique (multiple templates share a key for versioning)
DROP INDEX IF EXISTS email_templates_key_idx;
CREATE INDEX IF NOT EXISTS email_templates_key_idx ON email_templates (key);
