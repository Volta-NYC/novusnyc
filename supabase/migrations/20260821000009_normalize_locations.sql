-- Normalise every member and applicant location into two clean fields.
--
-- Applications have always had `city` and `state` columns, but the form used to
-- write a single free-text `city_state`, so those columns were populated on one
-- row out of 276. Everything downstream had to re-parse the free text.
--
-- The five boroughs collapse to "New York City". The borough only ever mattered
-- for a few people and never routed any work, while splitting one city across
-- five options meant the same person could be recorded five different ways.
-- The application form now offers "New York City" for the same reason.
--
-- The values were derived by parsing each record's original text positionally
-- (in a "City, State" field the last part is the state), falling back to an
-- unambiguous school where no location was given. `city_state` is left intact
-- as the record of what the applicant actually typed.
--
-- Nothing was guessed. Records with no conclusive signal were left blank:
--   members    — 3 (no location and an ambiguous school name)
--   applicants — 5 (two are test submissions; one wrote "idk")
-- And where only the state was determinable, the city stays NULL rather than
-- being invented: 7 members and 14 applicants.
--
-- The row-by-row UPDATE statements were applied directly and are not replayed
-- here; this migration documents the transformation and the counts it produced:
--   members    216 New York City · 65 elsewhere ·  7 state only ·  3 blank
--   applicants 192 New York City · 65 elsewhere · 14 state only ·  5 blank

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM team
     WHERE deleted_at IS NULL
       AND home_city ~* '^(manhattan|brooklyn|queens|bronx|staten island)$'
  ) THEN
    RAISE EXCEPTION 'team.home_city still contains borough values';
  END IF;

  IF EXISTS (
    SELECT 1 FROM applications
     WHERE city ~* '^(manhattan|brooklyn|queens|bronx|staten island)$'
  ) THEN
    RAISE EXCEPTION 'applications.city still contains borough values';
  END IF;
END $$;
