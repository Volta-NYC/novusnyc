-- BIDs are business improvement districts — they belong to a market the same
-- way clients do. All 26 current ones are New York.
ALTER TABLE bids ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id);
UPDATE bids SET chapter_id = 'chapter_ny' WHERE chapter_id IS NULL;
CREATE INDEX IF NOT EXISTS bids_chapter_idx ON bids (chapter_id);

NOTIFY pgrst, 'reload schema';
