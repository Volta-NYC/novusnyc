-- Allow admin role (Senior Associates) to read applications.
-- Previously only owner could access this table.
CREATE POLICY "applications_admin_select" ON applications FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

NOTIFY pgrst, 'reload schema';
