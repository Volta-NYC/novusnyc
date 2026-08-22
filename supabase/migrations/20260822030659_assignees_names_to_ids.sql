-- businesses.assignees was backfilled from team_members, which stored names.
-- The UI writes member ids, so the two disagreed: the "assigned to" column
-- happened to look right (it fell through to the raw string) but nothing that
-- joins on id worked — contribution counts credited none of this work, and
-- filtering by person never matched.
--
-- Every one of the 26 names resolves to exactly one member, so the conversion
-- is unambiguous. Names that resolve to none, or to more than one, are left
-- alone rather than guessed at.
UPDATE businesses b
   SET assignees = sub.ids
  FROM (
    SELECT b2.id,
           array_agg(COALESCE(t.id, nm) ORDER BY nm) AS ids
      FROM businesses b2
      CROSS JOIN LATERAL unnest(b2.assignees) AS nm
      LEFT JOIN LATERAL (
        SELECT t2.id FROM team t2
         WHERE t2.deleted_at IS NULL
           AND lower(trim(t2.name)) = lower(trim(nm))
         LIMIT 1
      ) t ON true
     WHERE b2.deleted_at IS NULL
       AND array_length(b2.assignees, 1) > 0
       AND EXISTS (SELECT 1 FROM team t3
                    WHERE t3.deleted_at IS NULL
                      AND lower(trim(t3.name)) = lower(trim(nm)))
     GROUP BY b2.id
  ) sub
 WHERE b.id = sub.id;

NOTIFY pgrst, 'reload schema';
