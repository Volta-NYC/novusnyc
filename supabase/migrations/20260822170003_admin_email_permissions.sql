-- Allow Senior Associate admins to manage the member email tooling.
-- The UI and API expose member email to owner/admin roles; these policies keep
-- email template and automation writes aligned with that access model.

DROP POLICY IF EXISTS "email_templates_admin_all" ON email_templates;
CREATE POLICY "email_templates_admin_all"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');

DROP POLICY IF EXISTS "automation_configs_admin_all" ON automation_configs;
CREATE POLICY "automation_configs_admin_all"
  ON automation_configs
  FOR ALL
  TO authenticated
  USING (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');
