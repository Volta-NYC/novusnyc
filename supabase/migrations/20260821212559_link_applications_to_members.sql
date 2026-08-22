-- An accepted applicant and the member they became had no stored link: every
-- re-promotion re-guessed the match from name and email. Record it once.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS member_id  text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by text;

CREATE INDEX IF NOT EXISTS applications_member_idx ON applications (member_id) WHERE member_id IS NOT NULL;

-- Backfill the link for applicants already accepted, matching on canonical
-- email only. Name matches are left for a human — merging two people is worse
-- than leaving a link unset.
WITH canon AS (
  SELECT a.id AS app_id,
         CASE WHEN split_part(lower(trim(a.email)),'@',2) IN ('gmail.com','googlemail.com')
              THEN replace(split_part(split_part(lower(trim(a.email)),'@',1),'+',1),'.','') || '@gmail.com'
              ELSE lower(trim(a.email)) END AS c
    FROM applications a
   WHERE coalesce(a.email,'') <> '' AND a.status = 'Accepted'
), canon_team AS (
  SELECT t.id AS member_id,
         CASE WHEN split_part(lower(trim(t.email)),'@',2) IN ('gmail.com','googlemail.com')
              THEN replace(split_part(split_part(lower(trim(t.email)),'@',1),'+',1),'.','') || '@gmail.com'
              ELSE lower(trim(t.email)) END AS c
    FROM team t
   WHERE t.deleted_at IS NULL AND coalesce(t.email,'') <> ''
), unique_match AS (
  SELECT canon.app_id, min(canon_team.member_id) AS member_id
    FROM canon JOIN canon_team ON canon.c = canon_team.c
   GROUP BY canon.app_id
  HAVING count(DISTINCT canon_team.member_id) = 1
)
UPDATE applications a
   SET member_id = u.member_id
  FROM unique_match u
 WHERE a.id = u.app_id AND a.member_id IS NULL;

NOTIFY pgrst, 'reload schema';
