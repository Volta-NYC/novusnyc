-- Move team mailbox references from voltanyc.org to novusnyc.org.
--
-- Deliberately NOT touched:
--   audit_logs            — a record of what happened at the time; rewriting it
--                           would falsify the history it exists to preserve.
--   calendar_events.i_cal_uid — an opaque iCalendar UID that merely looks like an
--                           address. Changing it breaks event dedupe on sync.

UPDATE assignments
SET created_by = replace(created_by, '@voltanyc.org', '@novusnyc.org')
WHERE created_by LIKE '%@voltanyc.org';

UPDATE applications
SET interview_evaluations = replace(interview_evaluations::text, '@voltanyc.org', '@novusnyc.org')::jsonb
WHERE interview_evaluations::text LIKE '%@voltanyc.org%';

UPDATE interview_slots
SET evaluation_by_uid = replace(evaluation_by_uid::text, '@voltanyc.org', '@novusnyc.org')::jsonb
WHERE evaluation_by_uid::text LIKE '%@voltanyc.org%';
