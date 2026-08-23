-- Every role function resolved against the team table without checking whether
-- that membership is still live, and my_auth_role() fell back to 'member' for
-- anyone it could not find at all. A soft-deleted or deactivated person kept
-- read access, and so did a login with no membership record.
--
-- 'none' is deliberately not a role any policy grants, so an unrecognised
-- caller now matches nothing instead of matching the member policies.

CREATE OR REPLACE FUNCTION public.my_auth_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(
    (SELECT auth_role FROM public.team
      WHERE auth_uid = auth.uid()
        AND deleted_at IS NULL
        AND lower(COALESCE(status, 'Active')) <> 'inactive'
      LIMIT 1),
    'none'
  )
$function$;

CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT id FROM public.team
   WHERE auth_uid = auth.uid()
     AND deleted_at IS NULL
     AND lower(COALESCE(status, 'Active')) <> 'inactive'
   LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.my_led_pods()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT coalesce(array_agg(pm.pod_id), '{}')
    FROM pod_members pm
    JOIN team t ON t.id = pm.member_id
   WHERE t.auth_uid = auth.uid()
     AND t.deleted_at IS NULL
     AND lower(COALESCE(t.status, 'Active')) <> 'inactive'
     AND pm.role = 'lit'
     AND pm.left_at IS NULL
$function$;

CREATE OR REPLACE FUNCTION public.my_pods()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT coalesce(array_agg(pm.pod_id), '{}')
    FROM pod_members pm
    JOIN team t ON t.id = pm.member_id
   WHERE t.auth_uid = auth.uid()
     AND t.deleted_at IS NULL
     AND lower(COALESCE(t.status, 'Active')) <> 'inactive'
     AND pm.left_at IS NULL
$function$;

CREATE OR REPLACE FUNCTION public.is_tech_lead()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team
     WHERE auth_uid = auth.uid()
       AND deleted_at IS NULL
       AND lower(COALESCE(status, 'Active')) <> 'inactive'
       AND role = 'Developer'
  )
$function$;
