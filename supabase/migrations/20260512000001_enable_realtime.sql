-- =============================================================================
-- Enable Supabase Realtime for all portal tables that have active frontend
-- subscribers in storage.ts. This adds tables to the supabase_realtime
-- publication so that postgres_changes channels deliver live change events.
--
-- Security: RLS is enforced separately (see 20260511000004_rls_policies.sql).
-- The frontend re-fetches the full table on each change event, so the user's
-- authenticated session (and its RLS policies) gate what data is returned.
-- Realtime events themselves carry no row data — they only trigger a refetch.
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE
  businesses,
  bids,
  team,
  applications,
  projects,
  finance_assignments,
  cycles,
  infractions,
  email_templates,
  assignments,
  assignment_claims,
  assignment_templates,
  member_strikes,
  member_credit_adjustments,
  user_profiles,
  audit_logs,
  calendar_events,
  interview_invites,
  interview_slots,
  interview_settings,
  handbook_pages;
