-- Fix 1: Add requires_approval column to assignments table.
-- This column was referenced in the TypeScript code and storage layer (toRow converts
-- requiresApproval → requires_approval) but was never added to the schema. Its absence
-- caused PostgREST to return PGRST204 on every INSERT/UPDATE, silently swallowed by
-- the void-wrapped save handlers, making Create and Save appear non-functional.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT true;

-- Fix 2: Add member UPDATE policy on assignment_claims.
-- Members previously had SELECT (own) + INSERT (own) only. With no UPDATE policy,
-- members could claim assignments but could never submit work, resubmit after rejection,
-- or update their deliverable URL. This makes the member work portal non-functional for
-- all non-admin users.

CREATE POLICY "assignment_claims_member_update_own" ON assignment_claims
  FOR UPDATE TO authenticated
  USING  (my_auth_role() = 'member' AND member_id = my_team_id())
  WITH CHECK (my_auth_role() = 'member' AND member_id = my_team_id());

-- Fix 3: Add member DELETE policy on assignment_claims.
-- Members could INSERT a claim but never remove it (no DELETE policy).
-- Allow members to unclaim their own assignments as long as the claim
-- hasn't been submitted or approved (no penalty for bailing before you submit).

CREATE POLICY "assignment_claims_member_delete_own" ON assignment_claims
  FOR DELETE TO authenticated
  USING (my_auth_role() = 'member' AND member_id = my_team_id()
    AND status NOT IN ('Submitted', 'Approved'));

NOTIFY pgrst, 'reload schema';
