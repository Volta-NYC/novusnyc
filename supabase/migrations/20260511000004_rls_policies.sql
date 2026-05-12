-- =============================================================================
-- Volta NYC – Row Level Security implementation
-- Roles: owner (Board) | admin (Senior Associate) | member
--
-- Enforcement model:
--   • service_role key (Next.js API routes) → bypasses RLS entirely (no impact)
--   • authenticated role (browser Supabase client) → RLS applies
--   • anon role → no GRANTs on any table, blocked regardless of RLS
--
-- Performance: my_auth_role() is STABLE + SECURITY DEFINER.
--   PostgreSQL evaluates it once per query, not once per row.
--   With the JWT fast-path it costs zero extra DB queries on most requests.
-- =============================================================================


-- ── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

-- Returns 'owner' | 'admin' | 'member' | null for the current authenticated user.
-- Checks JWT app_metadata first (zero DB cost). Falls back to team table lookup.
CREATE OR REPLACE FUNCTION my_auth_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'auth_role',
    (SELECT auth_role FROM public.team WHERE auth_uid = auth.uid())
  )
$$;

-- Returns the current user's team row id (text PK).
-- Used for "own row" filters on member_strikes, assignment_claims, etc.
CREATE OR REPLACE FUNCTION my_team_id()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.team WHERE auth_uid = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION my_auth_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION my_team_id()   TO authenticated, service_role;


-- ── BUSINESSES ───────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: read-only
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_owner_all" ON businesses FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "businesses_admin_select" ON businesses FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "businesses_member_select" ON businesses FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── BIDS ─────────────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: no access (not in their nav)
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bids_owner_all" ON bids FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "bids_admin_select" ON bids FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');


-- ── TEAM ─────────────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: read-only (all rows — needed
-- for team page, assignment member lookups, and auth row resolution)
ALTER TABLE team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_owner_all" ON team FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "team_admin_select" ON team FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "team_member_select" ON team FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── APPLICATIONS ─────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: no access   Member: no access
-- Public booking flow uses service_role API routes — unaffected by RLS.
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_owner_all" ON applications FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── PROJECTS (legacy) ────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_owner_all" ON projects FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "projects_admin_select" ON projects FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "projects_member_select" ON projects FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── FINANCE_ASSIGNMENTS (legacy, being migrated to assignments) ───────────────
ALTER TABLE finance_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_assignments_owner_all" ON finance_assignments FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "finance_assignments_admin_select" ON finance_assignments FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "finance_assignments_member_select" ON finance_assignments FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── CYCLES ───────────────────────────────────────────────────────────────────
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycles_owner_all" ON cycles FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "cycles_admin_select" ON cycles FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "cycles_member_select" ON cycles FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── INFRACTIONS (catalog of infraction type definitions) ─────────────────────
-- All roles can read infraction definitions (used in dashboard/handbook views).
ALTER TABLE infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "infractions_owner_all" ON infractions FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "infractions_nonowner_select" ON infractions FOR SELECT TO authenticated
  USING (my_auth_role() IN ('admin', 'member'));


-- ── MEMBER_STRIKES ────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read all   Member: read own only
ALTER TABLE member_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_strikes_owner_all" ON member_strikes FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "member_strikes_admin_select" ON member_strikes FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "member_strikes_member_select_own" ON member_strikes FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND member_id = my_team_id());


-- ── MEMBER_CREDIT_ADJUSTMENTS ─────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read all   Member: read own only
ALTER TABLE member_credit_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_credit_adj_owner_all" ON member_credit_adjustments FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "member_credit_adj_admin_select" ON member_credit_adjustments FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "member_credit_adj_member_select_own" ON member_credit_adjustments FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND member_id = my_team_id());


-- ── EMAIL_TEMPLATES ───────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: no access   Member: no access
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_owner_all" ON email_templates FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── ASSIGNMENT_CATALOG (legacy — being migrated to assignments table) ─────────
-- Owner: full CRUD   Admin: full CRUD   Member: read Open only
ALTER TABLE assignment_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_catalog_owner_all" ON assignment_catalog FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "assignment_catalog_admin_all" ON assignment_catalog FOR ALL TO authenticated
  USING    (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');

CREATE POLICY "assignment_catalog_member_select_open" ON assignment_catalog FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND LOWER(status) = 'open');


-- ── ASSIGNMENTS (new unified table) ───────────────────────────────────────────
-- Owner: full CRUD   Admin: full CRUD   Member: read Open only
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_owner_all" ON assignments FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "assignments_admin_all" ON assignments FOR ALL TO authenticated
  USING    (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');

CREATE POLICY "assignments_member_select_open" ON assignments FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND LOWER(status) = 'open');


-- ── ASSIGNMENT_TEMPLATES ──────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: full CRUD   Member: no access
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_templates_owner_all" ON assignment_templates FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "assignment_templates_admin_all" ON assignment_templates FOR ALL TO authenticated
  USING    (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');


-- ── ASSIGNMENT_CLAIMS ─────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: full CRUD
-- Member: read own + insert own (can claim and track their own submissions)
ALTER TABLE assignment_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_claims_owner_all" ON assignment_claims FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "assignment_claims_admin_all" ON assignment_claims FOR ALL TO authenticated
  USING    (my_auth_role() = 'admin')
  WITH CHECK (my_auth_role() = 'admin');

CREATE POLICY "assignment_claims_member_select_own" ON assignment_claims FOR SELECT TO authenticated
  USING (my_auth_role() = 'member' AND member_id = my_team_id());

CREATE POLICY "assignment_claims_member_insert_own" ON assignment_claims FOR INSERT TO authenticated
  WITH CHECK (my_auth_role() = 'member' AND member_id = my_team_id());


-- ── USER_PROFILES (legacy Firebase profiles) ──────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_owner_all" ON user_profiles FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

-- Any authenticated user can read their own legacy profile row.
CREATE POLICY "user_profiles_self_select" ON user_profiles FOR SELECT TO authenticated
  USING (
    email = (SELECT lower(trim(email)) FROM public.team WHERE auth_uid = auth.uid())
  );


-- ── AUDIT_LOGS ────────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: no access   Member: no access
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_owner_all" ON audit_logs FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── INVITE_CODES ──────────────────────────────────────────────────────────────
-- Owner: full CRUD (creates/revokes codes in admin panel)
-- Admin and member: no access
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_codes_owner_all" ON invite_codes FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── INTERVIEW_INVITES ─────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: no access   Member: no access
-- (Public booking link flow uses service_role API routes — bypasses RLS.)
ALTER TABLE interview_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interview_invites_owner_all" ON interview_invites FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── INTERVIEW_SLOTS ───────────────────────────────────────────────────────────
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interview_slots_owner_all" ON interview_slots FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── INTERVIEW_SETTINGS ────────────────────────────────────────────────────────
ALTER TABLE interview_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interview_settings_owner_all" ON interview_settings FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');


-- ── CALENDAR_EVENTS ───────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: read-only
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_owner_all" ON calendar_events FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "calendar_events_admin_select" ON calendar_events FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');

CREATE POLICY "calendar_events_member_select" ON calendar_events FOR SELECT TO authenticated
  USING (my_auth_role() = 'member');


-- ── ABUSE_GUARDS ──────────────────────────────────────────────────────────────
-- Rate-limiting table. Written only by service_role API routes (bypasses RLS).
-- Owners can SELECT to monitor; no authenticated writes allowed.
ALTER TABLE abuse_guards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abuse_guards_owner_select" ON abuse_guards FOR SELECT TO authenticated
  USING (my_auth_role() = 'owner');


-- ── INQUIRIES ─────────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: no access
-- Public form submissions arrive via service_role API routes.
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_owner_all" ON inquiries FOR ALL TO authenticated
  USING    (my_auth_role() = 'owner')
  WITH CHECK (my_auth_role() = 'owner');

CREATE POLICY "inquiries_admin_select" ON inquiries FOR SELECT TO authenticated
  USING (my_auth_role() = 'admin');


-- ── HANDBOOK_PAGES ────────────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read-only   Member: read-only
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'handbook_pages'
  ) THEN
    ALTER TABLE handbook_pages ENABLE ROW LEVEL SECURITY;

    EXECUTE $p$ CREATE POLICY "handbook_pages_owner_all" ON handbook_pages FOR ALL TO authenticated
      USING    (my_auth_role() = 'owner')
      WITH CHECK (my_auth_role() = 'owner') $p$;

    EXECUTE $p$ CREATE POLICY "handbook_pages_nonowner_select" ON handbook_pages FOR SELECT TO authenticated
      USING (my_auth_role() IN ('admin', 'member')) $p$;
  END IF;
END $$;


-- ── MEMBER_ACKNOWLEDGMENTS ────────────────────────────────────────────────────
-- Owner: full CRUD   Admin: read own   Member: read own + insert own
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_acknowledgments'
  ) THEN
    ALTER TABLE member_acknowledgments ENABLE ROW LEVEL SECURITY;

    EXECUTE $p$ CREATE POLICY "member_ack_owner_all" ON member_acknowledgments FOR ALL TO authenticated
      USING    (my_auth_role() = 'owner')
      WITH CHECK (my_auth_role() = 'owner') $p$;

    EXECUTE $p$ CREATE POLICY "member_ack_admin_select_own" ON member_acknowledgments FOR SELECT TO authenticated
      USING (my_auth_role() = 'admin' AND member_id = my_team_id()) $p$;

    EXECUTE $p$ CREATE POLICY "member_ack_member_select_own" ON member_acknowledgments FOR SELECT TO authenticated
      USING (my_auth_role() = 'member' AND member_id = my_team_id()) $p$;

    EXECUTE $p$ CREATE POLICY "member_ack_member_insert_own" ON member_acknowledgments FOR INSERT TO authenticated
      WITH CHECK (my_auth_role() = 'member' AND member_id = my_team_id()) $p$;
  END IF;
END $$;


-- ── POST-MIGRATION NOTICE ─────────────────────────────────────────────────────
-- The existing GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES TO authenticated
-- remains in place. RLS policies above are the enforcement layer on top.
-- service_role (used by all Next.js API routes) has BYPASSRLS = true
-- and is unaffected by any of these policies.

NOTIFY pgrst, 'reload schema';
