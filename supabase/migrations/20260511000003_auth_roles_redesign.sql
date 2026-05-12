-- Restructure auth_role values to match the new three-tier permission model:
--   owner  → Board members (all-encompassing access, formerly 'admin')
--   admin  → Senior Associates (view businesses + full assignment CRUD)
--   member → Analysts, Senior Analysts, Associates

-- 1. Rename existing 'admin' → 'owner' (these were Ethan and manually-set full admins).
UPDATE team SET auth_role = 'owner' WHERE auth_role = 'admin';

-- 2. Remove the interviewer tier — demote to member.
UPDATE team SET auth_role = 'member' WHERE auth_role = 'interviewer';

-- 3. Promote Board members to owner based on their org role.
UPDATE team SET auth_role = 'owner'
WHERE LOWER(TRIM(role)) IN ('board', 'board member');

-- 4. Promote Senior Associates to admin based on their org role.
UPDATE team SET auth_role = 'admin'
WHERE LOWER(TRIM(role)) IN ('senior associate');

-- Reload PostgREST schema cache.
NOTIFY pgrst, 'reload schema';
