-- assignment_templates was missing the requires_approval column that the
-- TypeScript code already expects. assignments already has this column with
-- DEFAULT true, so the same default applies here.

ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
