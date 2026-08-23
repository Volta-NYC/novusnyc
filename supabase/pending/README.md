# Pending post-deploy migrations

`20260824000001_drop_unused_website_planning_fields.sql` removes the unused
website `hours_logged` and `target_date` columns and retires the project-hours
certification trigger.

`20260824000002_drop_legacy_interview_booking.sql` removes the retired public
self-booking schema, old applicant interview fields, and obsolete email
automations/templates. The legacy rows were exported and cleared on August 23,
2026; the migration still asserts that the tables and columns are empty before
dropping anything.

`20260824000003_drop_remaining_legacy_admin_schema.sql` removes the empty
assignment-template system, unused project-group/calendar tables, their dead
assignment links, and the superseded services/chapters settings columns. It
asserts that no live assignment still references the retired structures.

All three are deliberately staged because the production database is shared by all
environments. Deploy the matching application code first, then move these files
into `supabase/migrations/` and apply them in timestamp order. Applying either
destructive half first would break the currently deployed application.
