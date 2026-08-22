-- Fix assignment_updates RLS policies that were using user_profiles.id (Firebase UIDs)
-- instead of my_auth_role() which reads from team.auth_uid (Supabase UUIDs).

DROP POLICY IF EXISTS "Claimants and admins can read assignment updates" ON assignment_updates;
DROP POLICY IF EXISTS "Admins can insert assignment updates" ON assignment_updates;

CREATE POLICY "Claimants and admins can read assignment updates"
  ON assignment_updates FOR SELECT TO authenticated
  USING (
    my_auth_role() IN ('admin', 'owner')
    OR EXISTS (
      SELECT 1
      FROM assignment_claims ac
      JOIN team t ON t.id = ac.member_id
      WHERE ac.assignment_id = assignment_updates.assignment_id
        AND t.auth_uid        = auth.uid()
        AND ac.status        <> 'rejected'
    )
  );

CREATE POLICY "Admins can insert assignment updates"
  ON assignment_updates FOR INSERT TO authenticated
  WITH CHECK (my_auth_role() IN ('admin', 'owner'));

NOTIFY pgrst, 'reload schema';
