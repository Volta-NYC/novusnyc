-- Restrict assignment_updates visibility to the members who have an active
-- claim on that assignment, plus admins/owners who can see everything.
-- Previously the SELECT policy used USING (true) — fully open to all authed users.

DROP POLICY IF EXISTS "Authenticated users can read assignment updates" ON assignment_updates;

CREATE POLICY "Claimants and admins can read assignment updates"
  ON assignment_updates FOR SELECT TO authenticated
  USING (
    -- User has an active (non-rejected) claim on this assignment
    EXISTS (
      SELECT 1
      FROM assignment_claims ac
      JOIN team t ON t.id = ac.member_id
      WHERE ac.assignment_id = assignment_updates.assignment_id
        AND t.auth_uid          = auth.uid()
        AND ac.status          <> 'rejected'
    )
    OR
    -- User is an admin or owner (user_profiles.id is text, auth.uid() is uuid)
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id        = auth.uid()::text
        AND auth_role IN ('admin', 'owner')
    )
  );

-- Tighten INSERT: only admins/owners may post updates (was open to all authed users).
DROP POLICY IF EXISTS "Authenticated users can insert assignment updates" ON assignment_updates;

CREATE POLICY "Admins can insert assignment updates"
  ON assignment_updates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id        = auth.uid()::text
        AND auth_role IN ('admin', 'owner')
    )
  );

NOTIFY pgrst, 'reload schema';
