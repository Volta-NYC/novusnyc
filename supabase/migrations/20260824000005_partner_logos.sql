-- Partner logos are managed records, not a second hard-coded catalog.
-- Public reads use the bucket URL; uploads remain behind the authenticated
-- owner-only API route.
alter table public.bids
  add column if not exists logo_path text,
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
