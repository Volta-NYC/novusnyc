-- Fix 1: Add site_settings to the realtime publication so portal banner
-- and settings changes propagate to open browser sessions automatically.
-- subscribeSiteSettings() in MembersLayout opens a channel on this table
-- but the channel never fired because the table wasn't published.

ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;

-- Fix 2: Add admin SELECT on email_templates.
-- Every other table has owner_all + admin_select. email_templates was
-- missing the admin policy, so admins visiting /email/templates or
-- /email/automations saw empty template lists (server-side sending was
-- unaffected because it uses the service role key which bypasses RLS).

CREATE POLICY "email_templates_admin_select"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (my_auth_role() = 'admin');
