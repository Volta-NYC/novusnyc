-- Fix site_settings RLS: replace the hand-rolled user_profiles join with the
-- same my_auth_role() helper used by every other table in this schema.
-- The old policy was checking user_profiles.auth_role but my_auth_role() reads
-- from team.auth_role (auth_uid column), so the two diverge.

DROP POLICY IF EXISTS "site_settings_owner_write" ON site_settings;

CREATE POLICY "site_settings_owner_write" ON site_settings
  FOR UPDATE
  USING    (my_auth_role() IN ('owner', 'admin'))
  WITH CHECK (my_auth_role() IN ('owner', 'admin'));
