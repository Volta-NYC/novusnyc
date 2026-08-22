-- Shared signup codes were replaced by per-person permanent links
-- (/members/signup?email=...), and access is actually gated by a matching row
-- in `team` — signup/complete returns team_member_not_found otherwise. Nothing
-- in the application has read this table since that change; all 10 remaining
-- rows expired in May 2026 and none was ever redeemed.
--
-- The only inbound constraint reference is the table's own primary key.
DROP TABLE IF EXISTS invite_codes;
