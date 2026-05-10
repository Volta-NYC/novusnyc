-- Disable RLS on all public tables.
-- The portal is an internal tool — access is enforced at the API route level
-- (verifyCaller) and by requiring a valid Supabase Auth session. Row-level
-- security adds no benefit here and blocks all authenticated queries.

ALTER TABLE businesses              DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE team                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications            DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects                DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance_assignments     DISABLE ROW LEVEL SECURITY;
ALTER TABLE cycles                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE infractions             DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_strikes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_credit_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates         DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_catalog      DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_claims       DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles           DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              DISABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events         DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_invites       DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots         DISABLE ROW LEVEL SECURITY;
ALTER TABLE interview_settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries               DISABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_guards            DISABLE ROW LEVEL SECURITY;
