-- =============================================================================
-- Drop legacy tables that are no longer used.
--
-- assignment_catalog: replaced by assignments (migration 20260511000001).
--   All rows with real business_ids were migrated; assignment_claims FK was
--   re-pointed to assignments in the same migration. No active code reads it.
--
-- inquiries: written to by an InquiryForm component that was never rendered on
--   any page. Zero rows. Contact form submissions go to businesses directly.
-- =============================================================================

DROP TABLE IF EXISTS assignment_catalog;

DROP TABLE IF EXISTS inquiries;
