# Pending migrations — deliberately NOT in supabase/migrations/

Files here are written but must not run yet. They live outside `migrations/`
because `supabase db push` applies everything in that directory, and applying
either of these today would break production.

## 20260821000005_drop_legacy_tables_and_columns.sql
Drops `businesses.website`, `team_lead`, `division`, `team_members` and the
legacy showcase fields. Contact intake, project creation, storage serialisation
and Showcase Admin still write those columns. Blocked on the canonical-schema
work: pick the replacement fields, migrate the values, update every reader and
writer, *then* move this file into `migrations/`.

## 20260817000001_update_public_impact_totals.sql
Sets the public impact numbers (170+ businesses, 130 website projects, 90+
marketing projects) in `site_settings.public_stat_overrides`. Never applied, so
the live site is not using these figures. It changes public-facing content, so
it needs a decision on whether the numbers are still accurate rather than a
silent apply.
