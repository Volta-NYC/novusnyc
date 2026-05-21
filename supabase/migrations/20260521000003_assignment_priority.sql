-- Allow admins to pin urgent assignments to the top of member-facing work.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS priority boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS assignments_priority_idx
  ON assignments (priority DESC, created_at DESC)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
