-- Business directory audit: remove intake-form test submissions, collapse
-- duplicate submissions from the same business into one record, and settle the
-- two records that were the same client under different names.
--
-- Duplicates are merged into the OLDEST row so first_contact_date stays true
-- and any track/assignee work already attached to it survives. Contact details
-- from the newer row are preserved rather than discarded: a second email lands
-- in owner_alternate_email, and everything else is appended to notes.
--
-- Note appends are marker-guarded so replaying this migration cannot append
-- twice.

-- 1. Intake-form test submissions by team members (Andrew Chin, Tahmid Islam).
-- "Tahmid's Brownies" carries the message "my intake form doesn't work :(";
-- "Tahmid's Ice Cream" has phone "123"; "a" has owner name and message "a".
update public.businesses
set deleted_at = now(), updated_at = now()
where deleted_at is null
  and id in (
    '47fa60ab-1347-478a-a6ad-87c013af044e',
    'f9bd19bb-4d56-40e0-b052-65a14e1998be',
    '547b04c5-cc42-4489-98fe-4172e5e931ef'
  );

-- 2. Annie Mae's Bakery — two form submissions, same owner and phone, two
-- different emails. The May row holds the Tech project, so it is the keeper.
-- Public listings confirm the apostrophe spelling and the (646) 498-3220 phone.
update public.businesses
set name = 'Annie Mae''s Bakery',
    owner_email = 'ladiesnightinbrooklyn@gmail.com',
    owner_alternate_email = 'brndnulade@gmail.com',
    referred_by = 'Cypress Hills Local Development Corporation',
    notes = case
      when coalesce(notes,'') like '%[merged duplicate 2026-07-09]%' then notes
      else coalesce(notes,'') || E'\n\n[merged duplicate 2026-07-09] Second form submission, same owner and phone.\nEmail used: ladiesnightinbrooklyn@gmail.com (now primary; brndnulade@gmail.com kept as alternate)\nServices requested: Website Design & Development, Social Media & Content, SEO & Google Maps Visibility\nReferred by: Cypress Hills Local Development Corporation'
    end,
    updated_at = now()
where id = '-OrdlWUuKT5bDk21UkTE' and deleted_at is null;

update public.businesses
set deleted_at = now(), updated_at = now()
where id = '2f4e3e85-51d4-44ed-8683-64044d2ae4c3' and deleted_at is null;

-- 3. AspireMeAmani LLC — same owner, email and phone, four days apart.
update public.businesses
set neighborhood = 'Brooklyn',
    notes = case
      when coalesce(notes,'') like '%[merged duplicate 2026-07-28]%' then notes
      else coalesce(notes,'') || E'\n\n[merged duplicate 2026-07-28] Second form submission, same owner, email and phone.\nNeighborhood: Brooklyn\nServices requested: Website Design & Development, Social Media & Content\nMessage: Having a consistent website. to fulfill orders. Adding all the products and prices for purchase. Just don''t have the time right now to recreate my website on my own.'
    end,
    updated_at = now()
where id = '56aee851-5579-42fe-9afb-d998a588f10d' and deleted_at is null;

update public.businesses
set deleted_at = now(), updated_at = now()
where id = '286ea6d2-a6ab-46f4-a00d-d06e7f59b12e' and deleted_at is null;

-- 4. Keller Williams Hudson Valley Realty — same owner, email, phone and
-- referrer, ten days apart. The newer row's "Brooklyn" neighborhood contradicts
-- a Hudson Valley brokerage on an 845 number, so it is recorded in notes rather
-- than promoted onto the record.
update public.businesses
set notes = case
      when coalesce(notes,'') like '%[merged duplicate 2026-07-13]%' then notes
      else coalesce(notes,'') || E'\n\n[merged duplicate 2026-07-13] Second form submission, same owner, email, phone and referrer.\nAdditional services requested: Sales & Financial Analysis\nNeighborhood given on that submission: Brooklyn (unverified — brokerage is Hudson Valley, 845 area code)'
    end,
    updated_at = now()
where id = '7c34a428-58cb-443b-bd0b-6a7260886b77' and deleted_at is null;

update public.businesses
set deleted_at = now(), updated_at = now()
where id = 'b8b00c8a-dba6-4abc-828a-34c7f1a31526' and deleted_at is null;

-- 5. Richmond Waterproofing — three submissions from one email over eleven
-- days. Two name Judy Murphy and one James Murphy; both contacts are kept.
-- Great Kills is in Staten Island, so the more specific neighborhood wins.
update public.businesses
set name = 'Richmond Waterproofing',
    owner_name = 'Judy Murphy',
    neighborhood = 'Great Kills',
    phone = '7189482386',
    notes = case
      when coalesce(notes,'') like '%[merged duplicates 2026-06-17, 2026-06-23]%' then notes
      else coalesce(notes,'') || E'\n\n[merged duplicates 2026-06-17, 2026-06-23] Two further form submissions from the same email and phone.\nAlternate contact name given: James Murphy (this record''s original submission); Judy Murphy on both later submissions.\nNeighborhood given: Great Kills / Staten Island.\nMessage: Advertising, website improvement.'
    end,
    updated_at = now()
where id = '96ff6078-e671-4659-bb46-db85cff89607' and deleted_at is null;

update public.businesses
set deleted_at = now(), updated_at = now()
where deleted_at is null
  and id in (
    '553a0233-f946-4745-bfb5-7aa71677a898',
    '455d10da-583f-4fad-b27d-4ed0f672a92a'
  );

-- 6. "The Lay Up" and "The Layup Bar" are one client at 47 5th Ave: the older
-- row's client_url is thelayupbar.com, and the site names the business The
-- LayUp Sports Bar. The keeper holds the tracks and assignees; the newer row
-- holds the draft link and the note that the work was cancelled, both of which
-- carry over.
update public.businesses
set name = 'The LayUp Sports Bar',
    preview_url = 'https://the-layup-bar.vercel.app/',
    notes = case
      when coalesce(notes,'') like '%[merged duplicate 2026-08-19]%' then notes
      else coalesce(notes,'') || E'\n\n[merged duplicate 2026-08-19] Tracked separately as "The Layup Bar"; same client at 47 5th Ave.\nDraft: https://the-layup-bar.vercel.app/\nDead — no further work planned (cancelled or client declined), per Aug 2026 tracker.'
    end,
    updated_at = now()
where id = '-OlyC34ZA3fTrhbreLX3' and deleted_at is null;

update public.businesses
set deleted_at = now(), updated_at = now()
where id = '38636777-0286-4d21-9488-83dce2052faf' and deleted_at is null;

notify pgrst, 'reload schema';
