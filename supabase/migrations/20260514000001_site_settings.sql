-- Site-wide settings singleton. One row (id = 'singleton') holds all toggleable
-- config so admins can change behaviour without code deploys.
CREATE TABLE IF NOT EXISTS site_settings (
  id                       text PRIMARY KEY DEFAULT 'singleton',
  -- Applications
  applications_paused      boolean NOT NULL DEFAULT false,
  applications_paused_msg  text    NOT NULL DEFAULT 'Applications are currently paused. Check back soon.',
  -- Services list (shown in showcase filters + business edit modal)
  services                 text[]  NOT NULL DEFAULT ARRAY['Website', 'SEO', 'Social Media', 'Graphic Design', 'Grants'],
  -- Public-site announcement banner
  public_banner_enabled    boolean NOT NULL DEFAULT false,
  public_banner_message    text    NOT NULL DEFAULT '',
  public_banner_bg         text    NOT NULL DEFAULT '#1a1a2e',
  public_banner_text       text    NOT NULL DEFAULT '#ffffff',
  -- Members-portal announcement banner
  portal_banner_enabled    boolean NOT NULL DEFAULT false,
  portal_banner_message    text    NOT NULL DEFAULT '',
  portal_banner_bg         text    NOT NULL DEFAULT '#85CC17',
  portal_banner_text       text    NOT NULL DEFAULT '#0D0D0D',
  -- Role display labels (keys stay as enum values; these are display-only overrides)
  role_labels              jsonb   NOT NULL DEFAULT '{"Analyst":"Analyst","Senior Analyst":"Senior Analyst","Associate":"Associate","Reserve":"Reserve"}'::jsonb,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Seed the singleton row; no-op if it already exists.
INSERT INTO site_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

-- Anyone can read settings (needed for public banner + apply page).
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_public_read" ON site_settings FOR SELECT USING (true);

CREATE POLICY "site_settings_owner_write" ON site_settings FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id::text = auth.uid()::text
      AND user_profiles.auth_role IN ('owner', 'admin')
  )
);
