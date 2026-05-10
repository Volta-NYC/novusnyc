-- Handbook and catalog migration
-- Run this in the Supabase Dashboard SQL editor (https://supabase.com/dashboard)
-- or via the Supabase CLI.

CREATE TABLE IF NOT EXISTS handbook_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS member_acknowledgments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  page_slug TEXT NOT NULL,
  content_hash TEXT NOT NULL DEFAULT '',
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, page_slug)
);

ALTER TABLE assignment_catalog ADD COLUMN IF NOT EXISTS credits_max INTEGER;
ALTER TABLE assignment_catalog ADD COLUMN IF NOT EXISTS credits_note TEXT;
