-- Fix casing in the columns that back the public autocomplete fields.
--
-- The contact form's neighborhood list and the application form's school list
-- are built from distinct values in these columns, so one sloppy entry becomes
-- a suggestion offered to every future applicant — "Staten island" was being
-- proposed on the live form.
--
-- Both neighborhood offenders sit on soft-deleted businesses, which is why an
-- earlier pass missed them: that audit filtered deleted_at, but
-- /api/public/neighborhoods does not. The companion code change makes the
-- endpoint skip deleted rows; this makes the underlying values correct either
-- way.
--
-- Business names are deliberately excluded. Several are also miscapitalized
-- ("all gods promises", "broadpivot consulting llc"), but they are clients'
-- own names, some are stylized on purpose ("eye&I Optometry"), and guessing at
-- a company's official styling is worse than leaving it. They are reported for
-- review instead.
--
-- Replay-safe: matches the incorrect form only.

update public.businesses set neighborhood = 'Great Kills'
  where neighborhood = 'Great kills';

-- A borough, not a neighborhood, and the row has no address, so the borough
-- column is the only place this information survives.
update public.businesses set borough = 'Staten Island', neighborhood = null
  where neighborhood = 'Staten island';

update public.applications set school_name = 'Cherry Hill High School East'
  where school_name = 'Cherry Hill High school East';
update public.applications set school_name = 'Jericho High School'
  where school_name = 'Jericho High school';
update public.applications set school_name = 'Stony Brook University'
  where school_name = 'Stony brook university';
update public.applications set school_name = 'CSI High School for International Studies'
  where school_name = 'CSI high school';

-- Not a school. Left in the column it would seed the dropdown with a sentence.
update public.applications set school_name = null
  where school_name = 'Not declared (still in 8th grade)';
