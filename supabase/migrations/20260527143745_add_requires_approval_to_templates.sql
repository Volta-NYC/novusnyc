ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
