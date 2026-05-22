-- Fix 1: Allow admins to SELECT from interview_settings.
-- Previously only owners could read it, so admins using the interviews panel
-- always fell back to the hardcoded default Zoom link instead of the one
-- configured in the admin settings.

CREATE POLICY "interview_settings_admin_select"
  ON interview_settings
  FOR SELECT
  TO authenticated
  USING (my_auth_role() IN ('owner', 'admin'));

-- Fix 2: Allow admins to SELECT from interview_invites.
-- subscribeInterviewInvites() uses the anon client (caller's JWT), so admins
-- need a SELECT policy to read invite records. Writes remain owner-only.

CREATE POLICY "interview_invites_admin_select"
  ON interview_invites
  FOR SELECT
  TO authenticated
  USING (my_auth_role() IN ('owner', 'admin'));
