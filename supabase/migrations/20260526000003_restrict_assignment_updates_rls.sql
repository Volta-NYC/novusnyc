-- Restrict assignment_updates visibility to the members who have an active
-- claim on that assignment, plus admins/owners who can see everything.
-- Previously the SELECT policy used USING (true) — fully open to all authed users.
-- NOTE: superseded by migration 20260526000005 which fixes the admin check to use
-- my_auth_role() instead of user_profiles.id (which stores Firebase UIDs, not Supabase UUIDs).

DROP POLICY IF EXISTS "Authenticated users can read assignment updates" ON assignment_updates;

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

-- Tighten INSERT: only admins/owners may post updates (was open to all authed users).
DROP POLICY IF EXISTS "Authenticated users can insert assignment updates" ON assignment_updates;

CREATE POLICY "Admins can insert assignment updates"
  ON assignment_updates FOR INSERT TO authenticated
  WITH CHECK (my_auth_role() IN ('admin', 'owner'));

NOTIFY pgrst, 'reload schema';
