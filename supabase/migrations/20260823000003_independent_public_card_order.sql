-- The full Showcase and the smaller Home selection are two separate ordered
-- surfaces. A shared sort_index made arranging one silently rearrange the other.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS showcase_sort_index bigint,
  ADD COLUMN IF NOT EXISTS home_sort_index bigint;

UPDATE public.businesses
SET showcase_sort_index = sort_index
WHERE showcase_enabled IS TRUE
  AND showcase_sort_index IS NULL;

UPDATE public.businesses
SET home_sort_index = sort_index
WHERE showcase_featured_on_home IS TRUE
  AND home_sort_index IS NULL;

-- Keep publication and ordering owner/admin-only while tech leadership retains
-- its intentionally narrower project-tracker access.
CREATE OR REPLACE FUNCTION public.businesses_protect_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF is_tech_lead() THEN
    NEW.showcase_enabled          := OLD.showcase_enabled;
    NEW.showcase_featured_on_home := OLD.showcase_featured_on_home;
    NEW.showcase_sort_index       := OLD.showcase_sort_index;
    NEW.home_sort_index           := OLD.home_sort_index;
    NEW.archived                  := OLD.archived;
    NEW.deleted_at                := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$function$;
