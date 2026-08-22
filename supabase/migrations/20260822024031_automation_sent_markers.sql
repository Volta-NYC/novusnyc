-- Each scheduled send is stamped on the row that caused it, so running the
-- sweep twice in a day sends nothing twice. These fire with nobody watching,
-- which is exactly when a duplicate would go unnoticed.
ALTER TABLE pod_meetings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_sent_at    timestamptz;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at timestamptz;

NOTIFY pgrst, 'reload schema';
