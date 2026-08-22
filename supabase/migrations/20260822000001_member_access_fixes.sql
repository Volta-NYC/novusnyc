-- Member-facing access corrections.
--
-- 1. assignments still carried the credit-system policies: a member could read
--    every open task in the org but lost sight of their own the moment it was
--    marked Done, and nobody below admin could write — so a member ticking off
--    their own task hit RLS and the click did nothing, silently. Pod tasks are
--    scoped to the pod now, and LITs can run their own pod's board.
-- 2. The three reporting views ran with the owner's rights, which bypasses RLS
--    entirely, and carried the default anon grant — so the public anon key
--    could read every member's hours and attendance without signing in.

DROP POLICY IF EXISTS assignments_member_select_open    ON assignments;
DROP POLICY IF EXISTS assignments_member_select_claimed ON assignments;

CREATE POLICY assignments_member_select_pod ON assignments FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND pod_id IS NOT NULL
    AND (pod_id = ANY (my_pods()) OR my_team_id() = ANY (assigned_member_ids))
  );

-- Completion is the one write a member owns, and only on their own task.
CREATE POLICY assignments_member_complete ON assignments FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND pod_id IS NOT NULL AND my_team_id() = ANY (assigned_member_ids))
  WITH CHECK (deleted_at IS NULL AND pod_id IS NOT NULL AND my_team_id() = ANY (assigned_member_ids));

CREATE POLICY assignments_lit_all ON assignments FOR ALL TO authenticated
  USING (pod_id IS NOT NULL AND pod_id = ANY (my_led_pods()))
  WITH CHECK (pod_id IS NOT NULL AND pod_id = ANY (my_led_pods()));

ALTER VIEW member_contributions  SET (security_invoker = on);
ALTER VIEW member_hours_totals   SET (security_invoker = on);
ALTER VIEW member_hours_ledger   SET (security_invoker = on);

REVOKE ALL ON member_contributions  FROM anon;
REVOKE ALL ON member_hours_totals   FROM anon;
REVOKE ALL ON member_hours_ledger   FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON member_contributions, member_hours_totals, member_hours_ledger FROM authenticated;

GRANT SELECT ON member_contributions, member_hours_totals, member_hours_ledger TO authenticated;
