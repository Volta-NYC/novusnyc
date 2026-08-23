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
       AND role = 'Developer'
  )
$function$;

DROP POLICY IF EXISTS businesses_tech_lead_write  ON businesses;
DROP POLICY IF EXISTS businesses_tech_lead_insert ON businesses;

CREATE POLICY businesses_tech_lead_insert ON businesses FOR INSERT TO authenticated
  WITH CHECK (is_tech_lead());

CREATE POLICY businesses_tech_lead_write ON businesses FOR UPDATE TO authenticated
  USING (is_tech_lead() AND deleted_at IS NULL)
  WITH CHECK (is_tech_lead());
