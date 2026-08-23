-- Enforce assignment claimant capacity at the DB level.
-- A trigger fires BEFORE INSERT on assignment_claims and raises an exception
-- when capacity > 0 and the non-rejected claim count has already reached that
-- limit. The check is atomic (no race window) because it runs inside the same
-- transaction as the INSERT.

CREATE OR REPLACE FUNCTION check_assignment_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity     integer;
  v_active_count integer;
BEGIN
  -- capacity = 0 means unlimited — skip the check entirely.
  SELECT capacity INTO v_capacity
  FROM assignments
  WHERE id = NEW.assignment_id;

  IF v_capacity IS NULL OR v_capacity = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM assignment_claims
  WHERE assignment_id = NEW.assignment_id
    AND status <> 'rejected';

  IF v_active_count >= v_capacity THEN
    RAISE EXCEPTION 'This assignment is full (% / % spots taken).', v_active_count, v_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_assignment_capacity ON assignment_claims;
CREATE TRIGGER enforce_assignment_capacity
  BEFORE INSERT ON assignment_claims
  FOR EACH ROW
  EXECUTE FUNCTION check_assignment_capacity();

NOTIFY pgrst, 'reload schema';
