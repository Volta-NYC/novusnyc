-- Collapse the Bard High School Early College campus variants into one name.
--
-- BHSEC runs separate NYC campuses (Manhattan, Queens, Bronx, Brooklyn), so
-- "Bard High School Early College Bronx" is a genuinely different school from
-- the unqualified entry rather than a typo of it. They are folded together
-- anyway: the distinction carries no operational weight, and the unqualified
-- form was ambiguous between Manhattan and Queens regardless, so one name is
-- more honest than a split that implies precision the data never had.
--
-- Bard College is deliberately left alone. It is a four-year liberal arts
-- college upstate, not a campus of the high school program, and merging it
-- would file a college student under a high school.
--
-- Applied to applications as well as team so the school-name dropdown, which
-- reads distinct team values, cannot be reseeded from a stale applicant record.
--
-- Replay-safe: matching on the exact variant, so a second run updates nothing.

update public.team
set school = 'Bard High School Early College',
    updated_at = now()
where trim(school) = 'Bard High School Early College Bronx';

update public.applications
set school_name = 'Bard High School Early College',
    updated_at = now()
where trim(school_name) = 'Bard High School Early College Bronx';
