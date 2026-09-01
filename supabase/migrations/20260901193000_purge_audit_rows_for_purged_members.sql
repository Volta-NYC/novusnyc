-- Remove the six audit_logs rows still naming the four purged members.
--
-- Companion to 20260901181500. That migration deliberately left these behind,
-- because audit_logs records what staff did rather than what members produced.
-- Purging them is an explicit decision to finish the erasure instead: the
-- request was for no remaining trace, and an invite log carrying a purged
-- member's email is exactly such a trace.
--
-- What goes: two invites (Sameer, Sushaan), the two matching May soft-delete
-- entries, a role update on Akshay, and the acceptance email logged against
-- Akbota's address. All six are administrative bookkeeping about people who no
-- longer exist in any other table, so nothing else references them and no audit
-- trail for a live record loses its history.
--
-- Matched on the purged emails and record ids rather than row ids, so this
-- stays correct if the rows are ever restored from backup and re-run.
-- Replay-safe: a second run deletes nothing.

delete from public.audit_logs
where record_id in (
  '-OmfO2kiIj0TGrPEQEju',
  '-Om6cLRLlnsZhD0PpgO8',
  '-Ori38ib3RQvJbTs7zta',
  '5e1ffffc-ef67-43a5-a133-e09c43b74f02',
  'sameer@hereiki.com',
  'sushaankandukoori@gmail.com',
  'akshay.jawalkar78@gmail.com',
  'a_akbota_08@mail.ru'
)
or details->>'invitedEmail' in (
  'sameer@hereiki.com',
  'sushaankandukoori@gmail.com',
  'akshay.jawalkar78@gmail.com',
  'a_akbota_08@mail.ru'
)
or details->>'applicantEmail' in (
  'sameer@hereiki.com',
  'sushaankandukoori@gmail.com',
  'akshay.jawalkar78@gmail.com',
  'a_akbota_08@mail.ru'
);
