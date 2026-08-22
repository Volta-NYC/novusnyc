-- Grant authenticated role full CRUD on all tables.
-- The portal's client-side Supabase queries (storage.ts, authContext.tsx) run as
-- the authenticated role when a user is logged in. Without these grants PostgREST
-- returns 403 on every table operation.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Ensure Ethan's admin role is set (migration 20260510000001 had wrong email).
UPDATE team SET auth_role = 'admin' WHERE lower(trim(email)) = 'ethan@voltanyc.org';

-- Reload PostgREST schema cache so auth_uid and auth_role columns are visible.
NOTIFY pgrst, 'reload schema';
