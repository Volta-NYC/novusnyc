-- Correct capitalization on client business names.
--
-- These are clients' own names shown publicly on /showcase, so each was checked
-- against the business's own branding rather than title-cased blindly. Where a
-- client runs a site, its og:site_name or <title> is the authority; otherwise
-- their Instagram, Yelp and delivery-platform listings were used.
--
-- Two results that a mechanical pass would have got wrong:
--
--   * "All Gods Promises" has no apostrophe. allgodspromises.org brands it that
--     way, so "All God's Promises" would have been a correction into an error.
--   * "eye&I Optometry" is left exactly as it is. The lowercase word is
--     deliberate — rethinkeye.com styles it "eye&I™ Optometry" — and it only
--     looked like a mistake to the audit that flagged it.
--
-- Café La Fe gains its accent, which the client's own site uses.
--
-- Replay-safe: matches the incorrect form only.

update public.businesses set name = 'Baked by Colo'
  where name = 'Baked by colo';

-- Site brands the whole operation "Beauty & The Beast Driving School / Porrata
-- Tax Services"; this record is the driving school, so it takes that half.
update public.businesses set name = 'Beauty & The Beast Driving School'
  where name = 'beauty and the beast driving school';

update public.businesses set name = 'BroadPivot Consulting LLC'
  where name = 'broadpivot consulting llc';

update public.businesses set name = 'Café La Fe'
  where name = 'Cafe la fe';

update public.businesses set name = 'Canto Violation Solutions'
  where name = 'Canto violation solutions';

update public.businesses set name = 'Moho Mexican Grill'
  where name = 'Moho mexican grill';

update public.businesses set name = 'All Gods Promises'
  where name = 'all gods promises';

update public.businesses set name = 'Rinconcito Bites'
  where name = 'Rinconcito bites';

update public.businesses set name = 'Richmond Waterproofing'
  where name = 'Richmond waterproofing';

-- No public listing found under any spelling, so this is plain title case with
-- Acf read as an acronym. The least confident row here; worth confirming with
-- the client.
update public.businesses set name = 'ACF Gemstone Series'
  where name = 'Acf gemstone series';
