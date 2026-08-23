-- Per-recipient delivery record for the scheduled automations.
--
-- The sweep marked a whole batch delivered when a single recipient succeeded,
-- so if one address bounced out of fifteen, the other fourteen were suppressed
-- permanently. The unique key here is the idempotency key: a row is claimed
-- before the send and released if the send fails, so a recipient gets exactly
-- one message per subject and a failure is retried on the next sweep.

CREATE TABLE IF NOT EXISTS automation_deliveries (
  id             text PRIMARY KEY,
  automation_id  text        NOT NULL,
  subject_key    text        NOT NULL,
  recipient      text        NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (automation_id, subject_key, recipient)
);

CREATE INDEX IF NOT EXISTS automation_deliveries_subject_idx
  ON automation_deliveries (automation_id, subject_key);

ALTER TABLE automation_deliveries ENABLE ROW LEVEL SECURITY;

-- Written only by the service role running the sweep. Owners can read it to
-- see what actually went out.
DROP POLICY IF EXISTS automation_deliveries_owner_read ON automation_deliveries;
CREATE POLICY automation_deliveries_owner_read ON automation_deliveries
  FOR SELECT TO authenticated
  USING (my_auth_role() IN ('owner', 'admin'));
