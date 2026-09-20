-- One WhatsApp group per Marketing pod, not one shared across all of them.
--
-- acceptance_whatsapp_link held a single URL, which was wrong: Small Business
-- Outreach, Social Media & Branding, Grants & Funding and Ambassadors each run
-- their own group. The replacement is keyed by the placement ids in
-- src/lib/members/acceptancePlacements.ts, so adding a pod needs no migration.
--
-- The dropped column was added earlier the same day, was never populated, and
-- nothing in the app had read it yet.

alter table site_settings
  add column if not exists acceptance_whatsapp_links jsonb not null default '{}'::jsonb;

alter table site_settings
  drop column if exists acceptance_whatsapp_link;
