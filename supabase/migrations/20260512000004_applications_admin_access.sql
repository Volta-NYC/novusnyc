-- Allow admin role (Senior Associates) to read applications.
-- Previously only owner could access this table.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'applications' AND policyname = 'applications_admin_select') THEN
    CREATE POLICY "applications_admin_select" ON applications FOR SELECT TO authenticated
      USING (my_auth_role() = 'admin');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
