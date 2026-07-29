-- Stop members from writing their own credit ledger.
--
-- assignment_claims is written straight from the browser (storage.ts), so RLS is
-- the only gate on it. assignment_claims_member_update_own constrained which
-- ROWS a member could touch but not which COLUMNS, and the table carries status,
-- credits_awarded, total_credits_earned and the approved_by/approved_at reviewer
-- fields. Any member could therefore approve their own claim and award
-- themselves arbitrary credits, which cycleCompute() sums into cycle standing
-- and which the demerit automation reads. assignment_claims_member_insert_own
-- had the same hole: nothing stopped a member inserting a pre-approved claim.
--
-- Column-level GRANTs cannot express the rule, because owners and admins
-- legitimately write every one of these columns through the review queue. RLS
-- policies cannot express it either, since WITH CHECK sees only the new row and
-- has no way to compare it against the old one. A trigger is the only place the
-- rule fits.
--
-- The one case where a member may legitimately approve themselves is an
-- assignment with requires_approval = false, where the portal auto-approves on
-- submit and awards exactly assignments.credits. That path stays open, pinned to
-- that exact amount so it cannot be inflated.
--
-- SECURITY DEFINER is required, not incidental: the assignments lookup below has
-- to see the assignment regardless of RLS. assignments_member_select_open only
-- exposes assignments whose status is 'open', so under invoker rights the lookup
-- would come back empty the moment an assignment moved to Active or Under
-- Review, and every legitimate submission would be rejected. This is the same
-- trap that made the original capacity guard undercount.

CREATE OR REPLACE FUNCTION enforce_member_claim_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role        text;
  assignment_credits integer;
  needs_review       boolean;
  auto_approved      boolean;
BEGIN
  -- No end-user session means a service_role write from one of our own API
  -- routes, which is already authorised by verifyCaller. Note this cannot be
  -- expressed as my_auth_role() <> 'member': that helper falls back to a literal
  -- 'member' whenever no team row matches, and service_role has a NULL
  -- auth.uid(), so it would classify our own server routes as members and block
  -- them. The team row is read directly here for the same reason.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT auth_role INTO caller_role FROM team WHERE auth_uid = auth.uid();

  -- Owners and admins award credits through the review queue.
  IF caller_role IS DISTINCT FROM 'member' THEN
    RETURN NEW;
  END IF;

  SELECT credits, requires_approval
    INTO assignment_credits, needs_review
  FROM assignments
  WHERE id = NEW.assignment_id;

  -- An unknown assignment is never auto-approvable.
  auto_approved := (needs_review IS FALSE);

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'claimed' THEN
      RAISE EXCEPTION 'A claim can only be opened as ''claimed''.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF COALESCE(NEW.credits_awarded, 0) <> 0
       OR COALESCE(NEW.total_credits_earned, 0) <> 0
       OR COALESCE(NEW.checkins_approved, 0) <> 0
       OR NEW.approved_at IS NOT NULL
       OR NEW.approved_by IS NOT NULL
       OR NEW.rejected_at IS NOT NULL
       OR NEW.reject_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Credits and review fields are set by a reviewer, not on claim.'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  -- A claim that has already been decided is closed to its owner.
  IF OLD.status IN ('Approved', 'rejected') THEN
    RAISE EXCEPTION 'This submission has already been reviewed and can no longer be edited.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Ledger, reviewer and identity columns belong to the review queue.
  IF NEW.total_credits_earned IS DISTINCT FROM OLD.total_credits_earned
     OR NEW.checkins_approved  IS DISTINCT FROM OLD.checkins_approved
     OR NEW.next_checkin_due   IS DISTINCT FROM OLD.next_checkin_due
     OR NEW.rejected_at        IS DISTINCT FROM OLD.rejected_at
     OR NEW.reject_reason      IS DISTINCT FROM OLD.reject_reason
     OR NEW.member_id          IS DISTINCT FROM OLD.member_id
     OR NEW.assignment_id      IS DISTINCT FROM OLD.assignment_id
     OR NEW.cycle_id           IS DISTINCT FROM OLD.cycle_id
     OR NEW.due_date           IS DISTINCT FROM OLD.due_date THEN
    RAISE EXCEPTION 'Only your deliverable and submission notes can be changed.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Submitting is always allowed. Approving is allowed only where the assignment
  -- is configured to skip review.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'Submitted'
     AND NOT (NEW.status = 'Approved' AND auto_approved) THEN
    RAISE EXCEPTION 'A submission is marked reviewed by a reviewer, not by its author.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Credits may only appear on that auto-approval, and only at face value.
  IF NEW.credits_awarded IS DISTINCT FROM OLD.credits_awarded
     AND NOT (NEW.status = 'Approved'
              AND auto_approved
              AND NEW.credits_awarded IS NOT DISTINCT FROM assignment_credits) THEN
    RAISE EXCEPTION 'Credits are awarded by a reviewer.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.approved_at IS DISTINCT FROM OLD.approved_at
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by)
     AND NOT (NEW.status = 'Approved' AND auto_approved) THEN
    RAISE EXCEPTION 'Approval is recorded by a reviewer.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- my_auth_role() is the authorisation input here, so the function must not be
-- callable as an RPC by the roles it is meant to constrain.
REVOKE ALL ON FUNCTION enforce_member_claim_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_member_claim_integrity ON assignment_claims;

CREATE TRIGGER trg_enforce_member_claim_integrity
  BEFORE INSERT OR UPDATE ON assignment_claims
  FOR EACH ROW
  EXECUTE FUNCTION enforce_member_claim_integrity();

NOTIFY pgrst, 'reload schema';
