-- Members can only SELECT assignments where status='open' via the existing policy.
-- Once a member claims an assignment, it moves to 'In Progress' and they can no
-- longer read its details (title, description, deadline, etc.) from the work page.
-- This policy fills that gap: members can also read any assignment they have a claim on.

CREATE POLICY "assignments_member_select_claimed" ON assignments
  FOR SELECT TO authenticated
  USING (
    my_auth_role() = 'member'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM assignment_claims
      WHERE assignment_claims.assignment_id = assignments.id
        AND assignment_claims.member_id = my_team_id()
    )
  );

NOTIFY pgrst, 'reload schema';
