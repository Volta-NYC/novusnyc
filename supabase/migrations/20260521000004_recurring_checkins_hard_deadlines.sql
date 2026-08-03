-- Recurring check-in assignments + hard/offset deadline options
-- Adds schema support for:
--   1. Recurring assignments (periodic check-ins + per-check-in credits)
--   2. Deadline type: 'hard' (admin-set date) vs 'offset' (X days after claim)
--   3. Check-in tracking on claims (next due date, credits earned)

-- ── assignment_templates ──────────────────────────────────────────────────────

ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS recurring_enabled    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_interval_days integer,        -- e.g. 7 = weekly
  ADD COLUMN IF NOT EXISTS max_duration_days     integer;        -- null = no hard cap

-- ── assignments ───────────────────────────────────────────────────────────────

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS recurring_enabled    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_interval_days integer,
  ADD COLUMN IF NOT EXISTS max_duration_days     integer,
  ADD COLUMN IF NOT EXISTS deadline_type         text DEFAULT 'hard',  -- 'hard' | 'offset'
  ADD COLUMN IF NOT EXISTS deadline_offset_days  integer;              -- used when deadline_type='offset'

-- ── assignment_claims ─────────────────────────────────────────────────────────

ALTER TABLE assignment_claims
  ADD COLUMN IF NOT EXISTS due_date             date,           -- offset deadline, per-claim
  ADD COLUMN IF NOT EXISTS checkins_approved    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_credits_earned integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_checkin_due     date;

-- ── Template data: Finance track ──────────────────────────────────────────────
-- Update descriptions, deadline offsets, and move mis-tracked templates.

-- Biweekly Report (already Finance)
UPDATE assignment_templates SET
  description = '<p>Write Novus''s internal biweekly newsletter. Covers recent deliverables shipped, active projects, timeline updates, team highlights, and org-wide goals for the next two weeks. Distributed to all members upon approval.</p>',
  deadline_offset_days = 4
WHERE id = '1e075e49-bea9-4a9b-b40b-1a2bb31327bd';

-- Business Owner Interview (already Finance) — recurring: weekly check-ins, 21 day max
UPDATE assignment_templates SET
  description = '<p>Conduct a 15-minute call with a prospective or current client. For new clients: complete an intake covering their business needs, goals, and availability. For existing clients: gather a testimonial and project feedback. Submit a written summary after the call.</p>',
  deadline_offset_days = 21,
  recurring_enabled = true,
  checkin_interval_days = 7,
  max_duration_days = 21
WHERE id = '19e4bdcd-369a-4bfa-bd21-09597ebc1621';

-- Business Tour (already Finance)
UPDATE assignment_templates SET
  description = '<p>Coordinate and execute an in-person visit to businesses in an area assigned by us. Confirm schedules, lead introductions, and submit a written recap with follow-up actions and any new leads identified.</p>',
  deadline_offset_days = 14
WHERE id = '1e626f86-7d85-4c3b-bf54-1273b780d08b';

-- Collect Business Leads (already Finance)
UPDATE assignment_templates SET
  description = '<p>Find 15 new businesses in an assigned area with name, address, phone, email, and website (where available). Submit in the standard leads spreadsheet format.</p>',
  deadline_offset_days = 2
WHERE id = 'ccc3dc2a-f0ec-42a4-8bec-bbb6e36b93dd';

-- Lead School Chapter (already Finance) — recurring: weekly check-ins, 24 day max
UPDATE assignment_templates SET
  description = '<p>Organize and run at least two meetings per month for a school chapter. Set an agenda, facilitate the session, and submit a summary of what was covered and next steps.</p>',
  deadline_offset_days = 24,
  recurring_enabled = true,
  checkin_interval_days = 7,
  max_duration_days = 24
WHERE id = 'cd807cd9-c676-493e-a3d4-a50c8d9a7766';

-- Manage Comms (5 businesses) — recurring: weekly, no max
UPDATE assignment_templates SET
  title = 'Manage Comms (5 Businesses)',
  description = '<p>Serve as the point of contact for 5 assigned client businesses. Respond to messages, relay updates between clients and the tech team, and log all communications in the tracker. Ongoing weekly responsibility and report.</p>',
  recurring_enabled = true,
  checkin_interval_days = 7,
  max_duration_days = NULL
WHERE id = 'cd856268-1eca-488a-93b4-9148a686e4f9';

-- Manage Communication (1 organization)
UPDATE assignment_templates SET
  title = 'Manage Communication (1 Organization)',
  description = '<p>Serve as Novus''s point of contact for an assigned partner organization (BID, nonprofit, city agency). Handle correspondence, relay updates internally, and log all communications. Ongoing weekly responsibility.</p>',
  deadline_offset_days = 7
WHERE id = 'e03e3654-5068-444b-81c6-730b38c3149d';

-- Review Analyst Reports (already Finance)
UPDATE assignment_templates SET
  description = '<p>Review submitted work from assigned Analysts — lead lists, outreach logs, or research briefs. Provide written feedback and approve or return for revisions.</p>',
  deadline_offset_days = 3
WHERE id = 'a51783bd-b5e3-4fad-9611-6e33a9f9b519';

-- Move "Consolidate Business Leads" from Tech → Finance and update details
UPDATE assignment_templates SET
  track = 'Finance',
  credits = 3,
  description = '<p>Clean up and merge existing business lead spreadsheets into a single organized master sheet. Remove duplicates, fill missing fields where possible, and flag incomplete entries.</p>',
  deadline_offset_days = 3
WHERE id = 'ff1d1e9b-7590-486e-a324-0072d4dce6c6';

-- Move "Outreach Emails" from Tech → Finance and update details
UPDATE assignment_templates SET
  track = 'Finance',
  credits = 1,
  min_role = 'Analyst',
  description = '<p>Send outreach emails to an assigned list of businesses using an approved template. Log each email sent with recipient name, organization, and date in the outreach tracker.</p>',
  deadline_offset_days = 1
WHERE id = '32b88291-4652-44ff-8844-a0c5f4029211';

-- ── Template data: General track ──────────────────────────────────────────────

UPDATE assignment_templates SET
  description = '<p>Follow Novus NYC''s official Instagram account.</p>',
  deadline_offset_days = 1
WHERE id = '2df05eee-c994-4e01-9c43-ec2635a971d0';

UPDATE assignment_templates SET
  description = '<p>Follow Novus NYC''s official LinkedIn page.</p>',
  deadline_offset_days = 1
WHERE id = '1d214359-1dd9-495e-81e6-21f89e7c5907';

UPDATE assignment_templates SET
  description = '<p>Refer a small business to Novus NYC for free consulting services. Business must be submitted through the proper intake form or directly to a Senior Associate.</p>'
WHERE id = '0d1e56de-ed50-4a30-83b4-edca3d6fe531';

UPDATE assignment_templates SET
  description = '<p>Refer a new student member to Novus NYC. They must complete their application for the credit to be awarded.</p>'
WHERE id = '66979690-160a-4531-bb32-2a0120ba4ae7';

UPDATE assignment_templates SET
  description = '<p>Refer a new student member from one of Novus''s target expansion cities (Boston, Philly, Washington D.C., or Chicago). They must complete their application for the credit to be awarded.</p>'
WHERE id = 'ac9ea4f4-9d77-4879-b9f7-7c95d756d550';
