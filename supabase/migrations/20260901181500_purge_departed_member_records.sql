-- Hard delete of four departed member records, at the founder's direction.
--
-- Unlike every prior member removal, which set team.deleted_at, this removes
-- the rows outright. Sameer Hereiki and Sushaan Kandukoori were already
-- soft-deleted on 2026-05-27; Akshay Jawalkar was Inactive; Akbota Aman
-- withdrew. None of them is coming back, and the request was explicitly for no
-- remaining record rather than a hidden one.
--
-- Safe to run because the footprint was checked first and is empty where it
-- would otherwise matter: zero rows in certified_hour_entries (the append-only
-- journal that must never be edited or deleted), zero in hours_adjustments,
-- pod_members, pod_attendance, assignments, businesses.assignees, interviews,
-- grants, and pod content or outreach. Nothing here rewrites service history.
--
-- audit_logs is deliberately untouched. Six rows mention these people, but they
-- record what staff did — invites sent, a role change, a decision email, the two
-- May soft-deletes — not anything the members themselves produced, and that
-- table is the record of what happened at the time.
--
-- Replay-safe: deletes are idempotent, and a second run removes nothing.

delete from public.member_notes
where member_id in (
  '-OmfO2kiIj0TGrPEQEju',
  '-Om6cLRLlnsZhD0PpgO8',
  '-Ori38ib3RQvJbTs7zta',
  '5e1ffffc-ef67-43a5-a133-e09c43b74f02'
);

delete from public.applications
where member_id in (
  '-OmfO2kiIj0TGrPEQEju',
  '-Om6cLRLlnsZhD0PpgO8',
  '-Ori38ib3RQvJbTs7zta',
  '5e1ffffc-ef67-43a5-a133-e09c43b74f02'
)
or lower(email) in (
  'sameer@hereiki.com',
  'sushaankandukoori@gmail.com',
  'akshay.jawalkar78@gmail.com',
  'a_akbota_08@mail.ru'
);

delete from public.team
where id in (
  '-OmfO2kiIj0TGrPEQEju',
  '-Om6cLRLlnsZhD0PpgO8',
  '-Ori38ib3RQvJbTs7zta',
  '5e1ffffc-ef67-43a5-a133-e09c43b74f02'
);

-- Akbota Aman is the only one of the four who ever completed a portal signup.
-- Leaving the auth user behind would keep a working login for an account with
-- no member row, which the role functions resolve to 'none' but which would
-- still appear in the Supabase auth dashboard.
delete from auth.users
where lower(email) in (
  'sameer@hereiki.com',
  'sushaankandukoori@gmail.com',
  'akshay.jawalkar78@gmail.com',
  'a_akbota_08@mail.ru'
);
