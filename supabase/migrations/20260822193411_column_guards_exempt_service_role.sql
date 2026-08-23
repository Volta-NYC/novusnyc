CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean LANGUAGE sql STABLE
AS $function$
  SELECT current_setting('request.jwt.claims', true) IS NULL
      OR current_setting('request.jwt.claims', true) = ''
      OR coalesce(auth.role(), '') = 'service_role'
      OR my_auth_role() IN ('owner', 'admin')
$function$;

CREATE OR REPLACE FUNCTION public.pods_protect_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  NEW.id := OLD.id; NEW.name := OLD.name; NEW.slug := OLD.slug;
  NEW.chapter_id := OLD.chapter_id; NEW.track := OLD.track;
  NEW.status := OLD.status; NEW.sort_order := OLD.sort_order;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.businesses_protect_admin_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF is_tech_lead() THEN
    NEW.showcase_enabled := OLD.showcase_enabled;
    NEW.showcase_featured_on_home := OLD.showcase_featured_on_home;
    NEW.archived := OLD.archived; NEW.deleted_at := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$function$;
