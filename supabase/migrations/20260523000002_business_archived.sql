-- Add archived flag to businesses.
-- Archived businesses are hidden from the default view but remain in the DB
-- and are recoverable via the "Show only archived" filter.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
