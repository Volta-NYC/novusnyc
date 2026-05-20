-- Role cleanup + interviewer permission
--
-- Changes:
--   1. Add can_interview boolean to team
--   2. Derive clean auth_role from team.role (Board→owner, Senior Associate→admin, else→member)
--   3. Seed can_interview=true for the two accounts that previously held auth_role='interviewer'
--   4. Sync the corrected auth_role into auth.users.raw_app_meta_data so the JWT
--      reflects the canonical value on next login (or immediately for server-side checks)
--   5. Update interview_slots RLS so interviewers can read/insert/update (not delete)

-- ── 1. Schema ───────────────────────────────────────────────────────────────

ALTER TABLE team
  ADD COLUMN IF NOT EXISTS can_interview boolean NOT NULL DEFAULT false;

-- ── 2. Derive auth_role from team.role ──────────────────────────────────────

UPDATE team
SET auth_role = CASE
  WHEN role = 'Board'            THEN 'owner'
  WHEN role = 'Senior Associate' THEN 'admin'
  ELSE                                'member'
END;

-- ── 3. Seed interviewer flag for existing interviewer accounts ───────────────
-- These two had auth_role='interviewer' in user_profiles; they become
-- normal members with the can_interview flag instead.

UPDATE team
SET can_interview = true
WHERE email IN ('ajiang80@stuy.edu', 'ash28mui@gmail.com');

-- ── 4. Sync auth_role into Supabase Auth app_metadata ───────────────────────
-- auth.users.raw_app_meta_data is the source of truth read by the JWT.
-- Joining on team.auth_uid (uuid FK → auth.users.id).

UPDATE auth.users u
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{auth_role}',
  to_jsonb(t.auth_role)
)
FROM team t
WHERE t.auth_uid = u.id
  AND t.auth_uid IS NOT NULL;

-- Also sync can_interview into app_metadata so the flag is available in the JWT.

UPDATE auth.users u
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{can_interview}',
  to_jsonb(t.can_interview)
)
FROM team t
WHERE t.auth_uid = u.id
  AND t.auth_uid IS NOT NULL;

-- ── 5. interview_slots RLS ───────────────────────────────────────────────────
-- Allow any authenticated user whose JWT has can_interview=true (or who is
-- an owner/admin) to SELECT, INSERT, UPDATE interview_slots.
-- DELETE remains owner-only (handled at the application layer via verifyCaller;
-- the RLS below mirrors that constraint).

-- Drop any existing permissive policies we are replacing.
DROP POLICY IF EXISTS "owners can manage interview_slots" ON interview_slots;
DROP POLICY IF EXISTS "interviewers can read interview_slots"  ON interview_slots;
DROP POLICY IF EXISTS "interviewers can insert interview_slots" ON interview_slots;
DROP POLICY IF EXISTS "interviewers can update interview_slots" ON interview_slots;

-- Owners/admins: full access.
CREATE POLICY "owners can manage interview_slots"
  ON interview_slots
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'auth_role') IN ('owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'auth_role') IN ('owner', 'admin')
  );

-- Interviewers: read + insert + update (no delete).
CREATE POLICY "interviewers can read interview_slots"
  ON interview_slots
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'can_interview')::boolean = true
  );

CREATE POLICY "interviewers can insert interview_slots"
  ON interview_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'can_interview')::boolean = true
  );

CREATE POLICY "interviewers can update interview_slots"
  ON interview_slots
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'can_interview')::boolean = true
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'can_interview')::boolean = true
  );
