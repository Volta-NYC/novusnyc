-- Add auth columns to team table for Supabase Auth integration.
-- auth_uid links a Supabase Auth user to a team entry.
-- auth_role controls portal access (admin / interviewer / member).

ALTER TABLE team ADD COLUMN IF NOT EXISTS auth_uid UUID UNIQUE;

ALTER TABLE team ADD COLUMN IF NOT EXISTS auth_role TEXT NOT NULL DEFAULT 'member';

CREATE INDEX IF NOT EXISTS team_auth_uid_idx ON team (auth_uid);

-- Grant Ethan Zhang master admin access.
UPDATE team
SET auth_role = 'admin'
WHERE lower(trim(email)) = 'ethan@voltanyc.org';
