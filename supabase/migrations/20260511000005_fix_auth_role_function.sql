-- Fix my_auth_role() to always read from the team table rather than the JWT.
--
-- The JWT app_metadata.auth_role is stale for all existing users because:
--   • Migration 003 updated team.auth_role (admin→owner, member→admin for Senior Associates).
--   • app_metadata is only written on signup/complete and is not auto-refreshed.
--   • COALESCE(jwt_value, team_value) would pick up the stale JWT value first.
--
-- Dropping the JWT fast-path is correct here: the team table is the authoritative
-- source of truth for roles. With STABLE, Postgres still evaluates this function
-- once per query (not once per row), so the extra DB lookup is negligible.

CREATE OR REPLACE FUNCTION my_auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT auth_role FROM public.team WHERE auth_uid = auth.uid()),
    'member'
  )
$$;

NOTIFY pgrst, 'reload schema';
