-- =============================================================================
-- Volta NYC – initial Supabase schema
-- Migrated from Firebase Realtime Database.
-- Firebase push-generated IDs are preserved as text primary keys.
-- Nested / variable-shape structures are kept as JSONB.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- businesses
-- showcase_image_data (base64) is NOT stored here; it lives in Supabase Storage.
-- showcase_image_path holds the Storage object path after migration.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id                        text PRIMARY KEY,
  name                      text,
  owner_name                text,
  owner_email               text,
  owner_alternate_email     text,
  phone                     text,
  alternate_phone           text,
  address                   text,
  website                   text,
  bid_id                    text,
  neighborhood              text,
  lat                       numeric,
  lng                       numeric,
  division                  text,          -- Tech | Marketing | Finance
  team_members              text[],
  project_status            text,
  team_lead                 text,
  first_contact_date        text,
  notes                     text,
  -- showcase
  showcase_enabled          boolean       DEFAULT false,
  showcase_featured_on_home boolean       DEFAULT false,
  showcase_name             text,
  showcase_type             text,
  showcase_neighborhood     text,
  showcase_services         text[],
  showcase_status           text,
  showcase_description      text,
  showcase_url              text,
  showcase_image_url        text,          -- public URL (Supabase Storage after migration)
  showcase_image_path       text,          -- Storage object path
  showcase_image_set        boolean       DEFAULT false,
  showcase_color            text,
  -- nested project tracking (JSONB: Record<track, {projectStatus, teamMembers, ...}>)
  project_tracks            text[],
  track_projects            jsonb,
  -- administrative
  intake_source             text,
  sort_index                integer,
  github_url                text,
  drive_folder_url          text,
  client_notes              text,
  active_services           text[],        -- legacy
  languages                 text[],        -- legacy
  created_at                timestamptz,
  updated_at                timestamptz
);

CREATE INDEX IF NOT EXISTS businesses_owner_email_idx ON businesses (owner_email);
CREATE INDEX IF NOT EXISTS businesses_showcase_enabled_idx ON businesses (showcase_enabled) WHERE showcase_enabled = true;

-- ---------------------------------------------------------------------------
-- bids
-- timeline is a nested object keyed by push IDs → keep as JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id            text PRIMARY KEY,
  name          text,
  contact_name  text,
  contact_email text,
  phone         text,
  status        text,          -- Active Partner | In Conversation | Outreach | Paused | Dead
  priority      text,          -- High | Medium | Low
  borough       text,
  address       text,
  zip_code      text,
  lat           numeric,
  lng           numeric,
  next_action   text,
  notes         text,
  sort_index    integer,
  timeline      jsonb,         -- Record<pushId, {date, action, type, note, createdAt}>
  created_at    timestamptz,
  updated_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- team
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team (
  id                             text PRIMARY KEY,
  name                           text,
  email                          text,
  alternate_email                text,
  school                         text,
  grade                          text,
  status                         text,
  role                           text,
  pod                            text,
  slack_handle                   text,
  divisions                      text[],
  accepted_date                  text,
  join_date                      text,
  skills                         text[],
  notes                          text,
  last_warning_cycle_id          text,
  last_auto_strike_cycle_id      text,
  last_biweekly_checkin_mark     text,
  last_biweekly_checkin_cycle_id text,
  created_at                     timestamptz,
  updated_at                     timestamptz
);

CREATE INDEX IF NOT EXISTS team_email_idx ON team (email);
CREATE INDEX IF NOT EXISTS team_alternate_email_idx ON team (alternate_email);

-- ---------------------------------------------------------------------------
-- applications
-- interviewEvaluations is a nested Record<uid, evaluation> → JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                         text PRIMARY KEY,
  full_name                  text,
  email                      text,
  school_name                text,
  grade                      text,
  city_state                 text,
  referral                   text,
  tracks_selected            text[],
  has_resume                 boolean,
  resume_url                 text,
  tools_software             text,
  accomplishment             text,
  status                     text,
  -- interview
  interview_invite_token     text,
  interview_invite_sent_at   text,
  interview_reminder_sent_at text,
  interview_slot_id          text,
  interview_scheduled_at     text,
  interview_evaluations      jsonb,   -- Record<uid, {interviewerUid, rating, comments, ...}>
  -- administrative
  final_decision_role        text,
  notes                      text,
  source                     text,
  source_timestamp_raw       text,
  created_at                 timestamptz,
  updated_at                 timestamptz
);

CREATE INDEX IF NOT EXISTS applications_email_idx ON applications (email);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications (status);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               text PRIMARY KEY,
  name             text,
  business_id      text REFERENCES businesses (id),
  division         text,    -- Tech | Marketing | Finance
  status           text,    -- Planning | Active | On Hold | Delivered | Complete
  team_lead        text,
  team_members     text[],
  start_date       text,
  target_end_date  text,
  actual_end_date  text,
  week1_deliverable text,
  final_deliverable text,
  progress         text,    -- 0% | 25% | 50% | 75% | 100%
  slack_channel    text,
  drive_folder_url text,
  client_notes     text,
  created_at       timestamptz,
  updated_at       timestamptz
);

CREATE INDEX IF NOT EXISTS projects_business_id_idx ON projects (business_id);

-- ---------------------------------------------------------------------------
-- finance_assignments
-- deadlines is an array of {label, date} → JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance_assignments (
  id                    text PRIMARY KEY,
  title                 text,
  topic                 text,
  type                  text,    -- Report | Case Study
  status                text,    -- Upcoming | Ongoing | Completed
  seed_key              text,
  team_label            text,
  region                text,
  assigned_member_names text[],
  assigned_member_ids   text[],
  deadline              text,
  interview_due_date    text,
  first_draft_due_date  text,
  final_due_date        text,
  deadlines             jsonb,   -- [{label, date}]
  deliverable_url       text,
  notes                 text,
  created_at            timestamptz,
  updated_at            timestamptz
);

-- ---------------------------------------------------------------------------
-- cycles
-- creditTargets and strikeThresholds are complex nested objects → JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
  id                          text PRIMARY KEY,
  name                        text,
  start_date                  text,
  end_date                    text,
  active                      boolean DEFAULT false,
  credit_targets              jsonb,    -- Partial<Record<track, Record<CycleRole, number>>>
  strike_thresholds           jsonb,    -- {warning, demotion, reserve}
  pacing_percent_per_checkin  numeric,
  created_at                  timestamptz,
  updated_at                  timestamptz
);

CREATE INDEX IF NOT EXISTS cycles_active_idx ON cycles (active) WHERE active = true;

-- ---------------------------------------------------------------------------
-- infractions  (catalog of infraction types)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infractions (
  id          text PRIMARY KEY,
  name        text,
  description text,
  points      integer,   -- 1=minor, 2=major, 3=severe
  created_at  timestamptz,
  updated_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- member_strikes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_strikes (
  id              text PRIMARY KEY,
  member_id       text,
  member_name     text,
  cycle_id        text,
  infraction_id   text,
  infraction_name text,
  points          integer,
  source          text,    -- manual | auto_pace
  issued_at       text,
  issued_by       text,
  note            text
);

CREATE INDEX IF NOT EXISTS member_strikes_member_id_idx ON member_strikes (member_id);
CREATE INDEX IF NOT EXISTS member_strikes_cycle_id_idx  ON member_strikes (cycle_id);

-- ---------------------------------------------------------------------------
-- member_credit_adjustments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_credit_adjustments (
  id          text PRIMARY KEY,
  member_id   text,
  member_name text,
  cycle_id    text,
  points      integer,   -- may be negative
  reason      text,
  created_at  timestamptz,
  created_by  text
);

CREATE INDEX IF NOT EXISTS member_credit_adj_member_id_idx ON member_credit_adjustments (member_id);
CREATE INDEX IF NOT EXISTS member_credit_adj_cycle_id_idx  ON member_credit_adjustments (cycle_id);

-- ---------------------------------------------------------------------------
-- email_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
  id                   text PRIMARY KEY,
  key                  text,
  label                text,
  description          text,
  subject              text,
  body                 text,
  available_variables  text[],
  active               boolean DEFAULT true,
  updated_at           timestamptz,
  updated_by           text
);

CREATE UNIQUE INDEX IF NOT EXISTS email_templates_key_idx ON email_templates (key);

-- ---------------------------------------------------------------------------
-- assignment_catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_catalog (
  id              text PRIMARY KEY,
  title           text,
  description     text,
  status          text,    -- open | claimed | in_progress | submitted | approved | closed
  primary_track   text,    -- Tech | Marketing | Finance
  visible_tracks  text[],  -- legacy
  credits         integer,
  difficulty      text,
  estimated_hours numeric,
  min_role        text,    -- Analyst | Senior Analyst | Associate
  capacity        integer,
  deadline        text,
  business_id     text,
  cycle_id        text,
  notes           text,
  created_at      timestamptz,
  updated_at      timestamptz,
  created_by      text
);

CREATE INDEX IF NOT EXISTS assignment_catalog_cycle_id_idx  ON assignment_catalog (cycle_id);
CREATE INDEX IF NOT EXISTS assignment_catalog_status_idx    ON assignment_catalog (status);

-- ---------------------------------------------------------------------------
-- assignment_claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment_claims (
  id               text PRIMARY KEY,
  assignment_id    text REFERENCES assignment_catalog (id),
  member_id        text,
  member_name      text,
  cycle_id         text,
  status           text,    -- claimed | in_progress | submitted | approved | rejected
  deliverable_url  text,
  submission_notes text,
  claimed_at       timestamptz,
  submitted_at     timestamptz,
  approved_at      timestamptz,
  rejected_at      timestamptz,
  reject_reason    text,
  credits_awarded  integer,
  approved_by      text
);

CREATE INDEX IF NOT EXISTS assignment_claims_member_id_idx     ON assignment_claims (member_id);
CREATE INDEX IF NOT EXISTS assignment_claims_assignment_id_idx ON assignment_claims (assignment_id);

-- ---------------------------------------------------------------------------
-- user_profiles  (keyed by Firebase Auth UID)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id         text PRIMARY KEY,   -- Firebase UID
  email      text,
  auth_role  text,               -- admin | interviewer | member
  name       text,
  school     text,
  grade      text,
  active     boolean DEFAULT true,
  created_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles (email);

-- ---------------------------------------------------------------------------
-- audit_logs
-- details is an open Record<string, unknown> → JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           text PRIMARY KEY,
  timestamp    timestamptz,
  action       text,    -- create | update | delete | import | export
  collection   text,
  record_id    text,
  actor_uid    text,
  actor_email  text,
  actor_name   text,
  details      jsonb
);

CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx   ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_logs_collection_idx  ON audit_logs (collection);

-- ---------------------------------------------------------------------------
-- invite_codes  (code string is both PK and the actual code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invite_codes (
  id            text PRIMARY KEY,   -- the code string
  code          text,
  role          text,               -- admin | interviewer | member
  expires_at    text,
  active        boolean DEFAULT true,
  used          boolean DEFAULT false,
  multi_use     boolean DEFAULT false,
  used_by       text,
  used_at       text,
  last_used_by  text,
  last_used_at  text,
  signup_count  integer DEFAULT 0,
  source        text,               -- manual | auto_rotation
  created_by    text,
  created_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- interview_invites  (booking token is PK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_invites (
  id              text PRIMARY KEY,   -- booking token
  applicant_name  text,
  applicant_email text,
  role            text,
  expires_at      bigint,             -- Unix ms
  status          text,               -- pending | booked | expired | cancelled
  booked_slot_id  text,
  multi_use       boolean DEFAULT false,
  created_by      text,
  created_at      timestamptz,
  note            text
);

-- ---------------------------------------------------------------------------
-- interview_slots
-- evaluationByUid is a nested Record<uid, evaluation> → JSONB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_slots (
  id                     text PRIMARY KEY,
  datetime               timestamptz,
  duration_minutes       integer,
  location               text,
  available              boolean DEFAULT true,
  booked_by              text,
  booker_name            text,
  booker_email           text,
  interviewer_member_ids text[],
  evaluation_by_uid      jsonb,    -- Record<uid, {interviewerUid, rating, comments, ...}>
  recurring_weekly       boolean DEFAULT false,
  recurring_series_id    text,
  no_show                boolean DEFAULT false,
  reminder_sent_at       timestamptz,
  created_by             text,
  created_at             timestamptz
);

CREATE INDEX IF NOT EXISTS interview_slots_datetime_idx   ON interview_slots (datetime);
CREATE INDEX IF NOT EXISTS interview_slots_available_idx  ON interview_slots (available) WHERE available = true;

-- ---------------------------------------------------------------------------
-- interview_settings  (singleton row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_settings (
  id           text PRIMARY KEY DEFAULT 'singleton',
  zoom_link    text,
  zoom_enabled boolean DEFAULT false,
  updated_at   timestamptz,
  updated_by   text
);

INSERT INTO interview_settings (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- calendar_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_events (
  id          text PRIMARY KEY,
  title       text,
  description text,
  start       timestamptz,
  "end"       timestamptz,
  all_day     boolean DEFAULT false,
  i_cal_uid   text,
  color       text,
  created_by  text,
  created_at  timestamptz
);

CREATE INDEX IF NOT EXISTS calendar_events_start_idx ON calendar_events (start);

-- ---------------------------------------------------------------------------
-- abuse_guards  (rate-limiting buckets; composite PK)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abuse_guards (
  bucket       text    NOT NULL,
  key          text    NOT NULL,
  count        integer DEFAULT 0,
  reset_at     bigint,
  blocked      boolean DEFAULT false,
  last_seen_at bigint,
  PRIMARY KEY (bucket, key)
);

-- ---------------------------------------------------------------------------
-- inquiries  (public contact-form submissions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id         text PRIMARY KEY,
  name       text,
  email      text,
  inquiry    text,
  source     text,
  created_at timestamptz,
  updated_at timestamptz
);
