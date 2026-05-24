-- Admin-controlled handbook re-acknowledgment timestamp.
-- When an admin bumps this value, any member whose last acknowledgment
-- pre-dates it will be prompted to re-confirm the handbook on next login.
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS handbook_ack_required_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
