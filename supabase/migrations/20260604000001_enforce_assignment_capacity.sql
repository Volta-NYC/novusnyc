-- Enforce assignment claimant capacity at the database level.
--
-- An earlier guard, check_assignment_capacity() (trigger enforce_assignment_
-- capacity), already existed but was SECURITY INVOKER. assignment_claims has
-- RLS, and the member SELECT policy (assignment_claims_member_select_own) only
-- exposes a member's OWN claims. So when a member claimed, the trigger's
-- COUNT(*) ran under that member's RLS view and saw only their own (zero) prior
-- claims on the assignment — the count came back 0 regardless of how many other
-- members had already claimed, and the cap was silently bypassed. That is how a
-- 4th member claimed a capacity-3 assignment. The bug was invisible to admin/SQL
-- testing because privileged roles bypass RLS and therefore counted correctly.
--
-- This replacement is the authoritative guard:
--   * SECURITY DEFINER  → the COUNT bypasses RLS and sees every claim, so it can
--                         never undercount.
--   * FOR UPDATE        → row-locks the assignment so two members claiming the
--                         last spot at the same time serialize instead of racing.
-- capacity 0 / NULL means unlimited.

-- Remove the broken invoker-context guard so it can't mask the real count.
DROP TRIGGER IF EXISTS enforce_assignment_capacity ON assignment_claims;
DROP FUNCTION IF EXISTS check_assignment_capacity();

CREATE OR REPLACE FUNCTION enforce_assignment_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cap          integer;
  active_count integer;
BEGIN
  -- A rejected claim never occupies a spot, so it is always allowed.
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Row-lock the assignment so concurrent claim inserts serialize on it.
  SELECT capacity INTO cap
  FROM assignments
  WHERE id = NEW.assignment_id
  FOR UPDATE;

  -- Unknown assignment or unlimited capacity → nothing to enforce.
  IF cap IS NULL OR cap = 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO active_count
  FROM assignment_claims
  WHERE assignment_id = NEW.assignment_id
    AND status <> 'rejected'
    AND id <> NEW.id;

  IF active_count >= cap THEN
    RAISE EXCEPTION 'This assignment is full — all % spots are already claimed.', cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_assignment_capacity ON assignment_claims;

CREATE TRIGGER trg_enforce_assignment_capacity
  BEFORE INSERT ON assignment_claims
  FOR EACH ROW
  EXECUTE FUNCTION enforce_assignment_capacity();

NOTIFY pgrst, 'reload schema';
