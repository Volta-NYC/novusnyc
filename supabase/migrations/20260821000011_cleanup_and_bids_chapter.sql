-- Housekeeping.

-- 1. BIDs belong to a market the same way clients do.
ALTER TABLE bids ADD COLUMN IF NOT EXISTS chapter_id text REFERENCES chapters(id);
UPDATE bids SET chapter_id = 'chapter_ny' WHERE chapter_id IS NULL;
CREATE INDEX IF NOT EXISTS bids_chapter_idx ON bids (chapter_id);

-- 2. Three test submissions removed. None was accepted, none was linked to a
--    member, and no interview slot or invite referenced them.

-- 3. Applications that belonged to an existing member but were never linked,
--    because the link backfill only covered rows already marked Accepted.
--    The link is identity, so it applies to a repeat application too; only the
--    six whose single application stopped at "Interview Completed" had their
--    status advanced, since they had been active members since March.
UPDATE applications a
   SET member_id = t.id,
       decided_by = coalesce(nullif(a.decided_by,''), 'linked by name; application status was never updated')
  FROM team t
 WHERE t.deleted_at IS NULL
   AND lower(trim(t.name)) = lower(trim(a.full_name))
   AND a.member_id IS NULL
   AND (SELECT count(*) FROM team y
         WHERE y.deleted_at IS NULL AND lower(trim(y.name)) = lower(trim(a.full_name))) = 1;

NOTIFY pgrst, 'reload schema';
