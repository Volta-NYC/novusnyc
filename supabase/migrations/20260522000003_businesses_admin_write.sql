-- Allow admin role (Senior Associates) to write businesses.
-- Previously only owner had write access; admin was read-only.
-- Admins manage day-to-day business operations so they need full CRUD.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'businesses_admin_all') THEN
    CREATE POLICY "businesses_admin_all" ON businesses FOR ALL TO authenticated
      USING    (my_auth_role() IN ('owner', 'admin'))
      WITH CHECK (my_auth_role() IN ('owner', 'admin'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
