-- Applied only after the website-tracker code stopped reading both columns.
-- Live-data audit on 2026-08-23 found 0/138 nonzero hours_logged values and
-- 0/138 target_date values.
DROP TRIGGER IF EXISTS businesses_certify_hours ON public.businesses;
DROP FUNCTION IF EXISTS public.reconcile_project_certified_hours();

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS hours_logged,
  DROP COLUMN IF EXISTS target_date;
