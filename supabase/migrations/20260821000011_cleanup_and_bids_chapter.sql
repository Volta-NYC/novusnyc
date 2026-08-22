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

-- 4. An application can be blank where its member record is not: Emily Liu gave
--    no location on the form, but her member record carries Brooklyn Technical
--    High School and New York City. Fill the application from the member.
UPDATE applications a
   SET city  = t.home_city,
       state = t.home_state,
       school_name = coalesce(nullif(a.school_name,''), t.school)
  FROM team t
 WHERE t.id = a.member_id
   AND t.deleted_at IS NULL
   AND a.state IS NULL
   AND t.home_state IS NOT NULL;

-- 5. Chelsey Gebologlu removed: accepted in February, never became a member,
--    and based in Kent, Washington.

-- 6. Nine duplicate applications removed — reapplications from people who had
--    already joined, which sat in the queue permanently because they would
--    never be decided. Three carried something their accepted application
--    lacked, merged up first so nothing was lost: a resume (Carrie Liao), a
--    city (Joanna Wang), and a school name where the accepted row held the
--    applicant's own name instead (Siddharth Karthik Nithya).
--
-- 7. Two members had their own name in the school field on both their member
--    and application records, so there was no correct value to recover. Cleared
--    rather than guessed at; their locations came from the city field.

NOTIFY pgrst, 'reload schema';
