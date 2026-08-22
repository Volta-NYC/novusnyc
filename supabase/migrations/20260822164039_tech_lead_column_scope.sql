-- RLS grants a row, not a column, so the tech-lead UPDATE policy also handed
-- over the public showcase flags and the archive/delete tombstones — the very
-- things the UI keeps for admins. Postgres has no per-column RLS, so the
-- protected columns are pinned back to their stored values for a caller whose
-- only claim is is_tech_lead().

CREATE OR REPLACE FUNCTION public.businesses_protect_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF my_auth_role() IN ('owner','admin') THEN
    RETURN NEW;
  END IF;

  IF is_tech_lead() THEN
    NEW.showcase_enabled          := OLD.showcase_enabled;
    NEW.showcase_featured_on_home := OLD.showcase_featured_on_home;
    NEW.archived                  := OLD.archived;
    NEW.deleted_at                := OLD.deleted_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS businesses_protect_admin_columns ON businesses;
CREATE TRIGGER businesses_protect_admin_columns
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_protect_admin_columns();
