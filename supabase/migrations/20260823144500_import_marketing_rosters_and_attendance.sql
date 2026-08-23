-- One-time import from Ellie's [NOVUS] Attendance + Assignment Tracker.xlsx.
-- Only unambiguous directory matches are included. Meetings remain
-- unfinalized so this historical import does not certify service hours until
-- a pod lead reviews and saves each sheet in the portal.

WITH roster_source(pod_id, member_name, role, joined_on) AS (VALUES
  ('pod_ambassador', 'Bruce Weng', 'member', date '2026-08-12'),
  ('pod_ambassador', 'Vavin Zhao', 'member', date '2026-08-12'),
  ('pod_ambassador', 'Aakanksh Ravuri', 'member', date '2026-08-12'),

  ('pod_grants', 'Angeline Chan', 'lit', date '2026-08-10'),
  ('pod_grants', 'David Grinberg', 'member', date '2026-08-10'),
  ('pod_grants', 'Dinara Gargu', 'member', date '2026-08-10'),
  ('pod_grants', 'Oscar Heller', 'member', date '2026-08-10'),
  ('pod_grants', 'Maitri Sharma', 'member', date '2026-08-10'),
  ('pod_grants', 'Emily Sotelo', 'member', date '2026-08-10'),
  ('pod_grants', 'Artan Prelvukaj', 'member', date '2026-08-10'),
  ('pod_grants', 'Yuba Bhatta', 'member', date '2026-08-10'),
  ('pod_grants', 'Saranya Ganti', 'member', date '2026-08-10'),
  ('pod_grants', 'Tiffany Xu', 'member', date '2026-08-10'),
  ('pod_grants', 'Aryan Katakam', 'member', date '2026-08-10'),
  ('pod_grants', 'Shruti Sridhar', 'member', date '2026-08-10'),
  ('pod_grants', 'Joseph Long', 'member', date '2026-08-10'),
  ('pod_grants', 'Tanjot kaur', 'member', date '2026-08-10'),
  ('pod_grants', 'Norayz Sohail', 'member', date '2026-08-10'),

  ('pod_outreach', 'Marvens Celius', 'lit', date '2026-08-17'),
  ('pod_outreach', 'Kaia Talathi', 'lit', date '2026-08-17'),
  ('pod_outreach', 'Liam Greco', 'lit', date '2026-08-17'),
  ('pod_outreach', 'Tyler Tong', 'member', date '2026-08-17'),
  ('pod_outreach', 'Norayz Sohail', 'member', date '2026-08-17'),
  ('pod_outreach', 'Claire Man', 'member', date '2026-08-17'),
  ('pod_outreach', 'Leslie Bermeo', 'member', date '2026-08-17'),
  ('pod_outreach', 'Aqila Nazar', 'member', date '2026-08-17'),
  ('pod_outreach', 'Artan Prelvukaj', 'member', date '2026-08-17'),
  ('pod_outreach', 'Amayra Talwar', 'member', date '2026-08-17'),

  ('pod_social', 'Morgan Laminta', 'lit', date '2026-08-13'),
  ('pod_social', 'Anisha Saravanan', 'member', date '2026-08-13'),
  ('pod_social', 'Claire Man', 'member', date '2026-08-13'),
  ('pod_social', 'Cara Liu', 'member', date '2026-08-13'),
  ('pod_social', 'Sophia Chang', 'member', date '2026-08-13')
), matched AS (
  SELECT r.*, t.id AS member_id
  FROM roster_source r
  JOIN public.team t ON lower(trim(t.name)) = lower(trim(r.member_name))
  WHERE t.deleted_at IS NULL
)
INSERT INTO public.pod_members (id, pod_id, member_id, role, joined_at, left_at)
SELECT 'pm_import_' || substr(md5(pod_id || member_id), 1, 20), pod_id, member_id, role,
       joined_on::timestamptz, NULL
FROM matched
ON CONFLICT (pod_id, member_id) DO UPDATE SET
  role = CASE WHEN excluded.role = 'lit' THEN 'lit' ELSE public.pod_members.role END,
  left_at = NULL;

INSERT INTO public.pod_meetings (id, pod_id, meets_on, title, hours, notes, created_at)
VALUES
  ('sheet_pod_ambassador_20260812', 'pod_ambassador', date '2026-08-12', 'Ambassadors meeting', 1.5, 'Imported from the legacy Marketing attendance workbook. Review before finalizing service hours.', now()),
  ('sheet_pod_grants_20260810', 'pod_grants', date '2026-08-10', 'Grants & Funding meeting', 1.5, 'Imported from the legacy Marketing attendance workbook. Review before finalizing service hours.', now()),
  ('sheet_pod_outreach_20260817', 'pod_outreach', date '2026-08-17', 'Small Business Outreach meeting', 1.5, 'Imported from the legacy Marketing attendance workbook. Review before finalizing service hours.', now()),
  ('sheet_pod_social_20260813', 'pod_social', date '2026-08-13', 'Social Media & Branding meeting', 1.5, 'Imported from the legacy Marketing attendance workbook. Review before finalizing service hours.', now())
ON CONFLICT (pod_id, meets_on) DO NOTHING;

WITH attendance_source(meeting_id, member_name, status, tasks_done, source_note) AS (VALUES
  ('sheet_pod_ambassador_20260812', 'Bruce Weng', 'Present', 2, ''),
  ('sheet_pod_ambassador_20260812', 'Vavin Zhao', 'Excused', 0, 'Legacy workbook marked assignment Missing.'),
  ('sheet_pod_ambassador_20260812', 'Aakanksh Ravuri', 'Unexcused', 2, ''),

  ('sheet_pod_grants_20260810', 'Angeline Chan', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'David Grinberg', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'Dinara Gargu', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'Oscar Heller', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'Maitri Sharma', 'Excused', 1, ''),
  ('sheet_pod_grants_20260810', 'Emily Sotelo', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'Artan Prelvukaj', 'Present', 2, ''),
  ('sheet_pod_grants_20260810', 'Yuba Bhatta', 'Unexcused', 0, 'Legacy workbook marked assignment Missing.'),
  ('sheet_pod_grants_20260810', 'Saranya Ganti', 'Unexcused', 2, ''),
  ('sheet_pod_grants_20260810', 'Tiffany Xu', 'Unexcused', 0, 'Legacy workbook marked assignment Missing.'),
  ('sheet_pod_grants_20260810', 'Aryan Katakam', 'Unexcused', 0, 'Legacy workbook marked assignment Missing.'),
  ('sheet_pod_grants_20260810', 'Shruti Sridhar', 'Unexcused', 2, ''),
  ('sheet_pod_grants_20260810', 'Joseph Long', 'Unexcused', 0, 'Legacy workbook marked assignment Missing.'),
  ('sheet_pod_grants_20260810', 'Tanjot kaur', 'Unexcused', 0, ''),

  ('sheet_pod_outreach_20260817', 'Marvens Celius', 'Present', 0, ''),
  ('sheet_pod_outreach_20260817', 'Kaia Talathi', 'Present', 0, ''),
  ('sheet_pod_outreach_20260817', 'Liam Greco', 'Present', 0, ''),
  ('sheet_pod_outreach_20260817', 'Tyler Tong', 'Excused', 0, ''),
  ('sheet_pod_outreach_20260817', 'Norayz Sohail', 'Excused', 0, ''),
  ('sheet_pod_outreach_20260817', 'Claire Man', 'Present', 2, ''),
  ('sheet_pod_outreach_20260817', 'Leslie Bermeo', 'Present', 0, ''),
  ('sheet_pod_outreach_20260817', 'Aqila Nazar', 'Present', 2, ''),
  ('sheet_pod_outreach_20260817', 'Artan Prelvukaj', 'Present', 2, ''),
  ('sheet_pod_outreach_20260817', 'Amayra Talwar', 'Excused', 2, ''),

  ('sheet_pod_social_20260813', 'Morgan Laminta', 'Present', 2, ''),
  ('sheet_pod_social_20260813', 'Anisha Saravanan', 'Present', 2, ''),
  ('sheet_pod_social_20260813', 'Claire Man', 'Present', 2, ''),
  ('sheet_pod_social_20260813', 'Cara Liu', 'Present', 0, ''),
  ('sheet_pod_social_20260813', 'Sophia Chang', 'Excused', 0, '')
), matched AS (
  SELECT a.*, t.id AS member_id
  FROM attendance_source a
  JOIN public.team t ON lower(trim(t.name)) = lower(trim(a.member_name))
  WHERE t.deleted_at IS NULL
)
INSERT INTO public.pod_attendance (id, meeting_id, member_id, status, tasks_done, hours, note, marked_at)
SELECT 'pa_import_' || substr(md5(meeting_id || member_id), 1, 20), meeting_id, member_id,
       status, tasks_done, NULL, concat_ws(' ', 'Imported from Ellie''s legacy tracker.', nullif(source_note, '')), now()
FROM matched
ON CONFLICT (meeting_id, member_id) DO NOTHING;
