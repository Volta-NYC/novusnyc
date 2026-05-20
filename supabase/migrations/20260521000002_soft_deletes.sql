-- Soft deletes for businesses, team, assignments.
--
-- Rationale:
--   Today deleteBusiness / deleteTeamMember / deleteAssignment in storage.ts
--   issue hard DELETEs. There is no undo, and FK-referenced history (audit logs,
--   assignment claims, member strikes) loses its anchor when a row disappears.
--
-- Approach:
--   • Add a nullable deleted_at column to each of the three core tables.
--   • Storage layer flips this column instead of issuing DELETEs (next commit).
--   • RLS hides soft-deleted rows from admin and member roles. Owners keep
--     full visibility through the existing owner_all policies so a deletion can
--     still be reversed via SQL or a future admin UI.
--   • Partial indexes keep the common "active rows only" query fast.

-- ── businesses ────────────────────────────────────────────────────────────────

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS businesses_active_idx
  ON businesses (id) WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "businesses_admin_select" ON businesses;
CREATE POLICY "businesses_admin_select" ON businesses FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "businesses_member_select" ON businesses;
CREATE POLICY "businesses_member_select" ON businesses FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND deleted_at IS NULL);

-- ── team ──────────────────────────────────────────────────────────────────────

ALTER TABLE team ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS team_active_idx
  ON team (id) WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "team_admin_select" ON team;
CREATE POLICY "team_admin_select" ON team FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "team_member_select" ON team;
CREATE POLICY "team_member_select" ON team FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND deleted_at IS NULL);

-- ── assignments ───────────────────────────────────────────────────────────────

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS assignments_active_idx
  ON assignments (id) WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "assignments_admin_all" ON assignments;
CREATE POLICY "assignments_admin_all" ON assignments FOR ALL TO authenticated
  USING    (my_auth_role() = 'admin' AND deleted_at IS NULL)
  WITH CHECK (my_auth_role() = 'admin');

DROP POLICY IF EXISTS "assignments_member_select_open" ON assignments;
CREATE POLICY "assignments_member_select_open" ON assignments FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND LOWER(status) = 'open' AND deleted_at IS NULL);

NOTIFY pgrst, 'reload schema';
