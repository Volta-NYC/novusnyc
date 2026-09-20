-- Reconciles the directory against the tech team's website list and the
-- client correspondence. "uplift" and "moretti" were typed into the old
-- combined search/add field by accident and were never businesses.
delete from public.businesses where id in (
  '5c76f8c4-e037-47c7-8b10-798b2921697d',
  'e6fd89a3-445d-4c6e-b371-4c224af02b83'
);

-- Duplicate row, same name, no data on either side.
delete from public.businesses where id = 'd0f6eabf-07fe-4b9e-8e03-93bf474dc7eb';

-- Amira's Boutique is Eulalee Beckford Designs: the owner confirmed her
-- company name on Sept 11, and the tech list marks the older name wrong.
delete from public.businesses where id = 'c3f165a2-df06-4d7d-b0cc-5d03e07617d9';

update public.businesses set preview_url = v.url, tech_status = 'Draft Ready', updated_at = now()
from (values
  ('ef9abb7a-1c03-4718-acee-9e7b4cf49183', 'https://kaleidoscope-lac.vercel.app/'),
  ('8cdc20f5-d789-4f69-bef4-6d90f895890b', 'https://strike-a-pose-plum.vercel.app/'),
  ('eecac923-8b94-4cfd-9227-df38895affb4', 'https://human-nature-civilization.vercel.app/'),
  ('80555b4f-1a7d-47f7-85d6-edac2e70b649', 'https://caribbeing.vercel.app/'),
  ('-OlyP9U4Qpq-e0UJBCKr', 'https://pulse-coffee.vercel.app/')
) as v(id, url)
where public.businesses.id = v.id;

insert into public.businesses (id, name, tech_status, preview_url, client_url, notes, chapter_id, referred_by, created_at, updated_at)
select gen_random_uuid()::text, v.name, v.status, nullif(v.preview, ''), nullif(v.client, ''), v.notes, 'chapter_ny', '', now(), now()
from (values
  ('Happy Bedding',                      'Draft Ready', 'https://happy-bedding.vercel.app/',        'https://happybedding.mightysites.com/', ''),
  ('Two If By Peppers',                  'Draft Ready', 'https://two-if-by-peppers.vercel.app/',    '', ''),
  ('Monahan & Fitzgerald',               'Draft Ready', 'https://monahan-fitzgerald.vercel.app/',   '', 'Needs improvement before it goes to the client.'),
  ('You Too Me Too Styling Boutique',    'Draft Ready', 'https://you-too-me-too.vercel.app/',       '', ''),
  ('Relax and Restore Mobile Massage LLC','Draft Ready','https://relax-and-restore.vercel.app/',    '', 'Same owner as the KarmaInMotion88 project.'),
  ('PhenomComm',                         'Draft Ready', 'https://phenomcomm-nine.vercel.app/',      'https://www.phenomcomm.com/', 'Run by RDRC''s director of business services.'),
  ('Tangra Masala',                      'Draft Ready', 'https://tangra-masala.vercel.app/',        '', ''),
  ('Segal Improvements',                 'Draft Ready', 'https://rainbow-croissant-b9e946.netlify.app/', '', ''),
  ('Soulfire Soups',                     'Assigned',    '', '', ''),
  ('Griffins Toy Emporium',              'On Hold',     '', '', ''),
  ('Queen Beauty Supply',                'Backlog',     '', '', ''),
  ('Craft Chic Boutique',                'Backlog',     '', '', ''),
  ('United-in-Speech',                   'Backlog',     '', '', 'Interpreter worker cooperative; draft only, not committed yet.'),
  ('GrooveTrips',                        'Backlog',     '', '', ''),
  ('Ann Sharon Bacchus Notary',          'Backlog',     '', 'https://annsharonbacchusnotarize.com', ''),
  ('Zewditu Electrical Services',        'Backlog',     '', '', '')
) as v(name, status, preview, client, notes)
where not exists (
  select 1 from public.businesses b where lower(trim(b.name)) = lower(trim(v.name))
);

update public.businesses
set client_url = 'https://www.boundlessawareness.com/', updated_at = now()
where name = 'Boundless Awareness, LLC' and coalesce(client_url, '') = '';

notify pgrst, 'reload schema';
