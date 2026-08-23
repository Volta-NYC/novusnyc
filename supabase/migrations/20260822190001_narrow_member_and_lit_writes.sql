-- RLS grants a whole row, so the assignee and LIT update policies handed over
-- every column on the row they were meant to give partial access to. Postgres
-- has no per-column RLS, so protected columns are pinned to their stored values
-- for callers who only qualify through those policies.

-- Assignees may mark their own task done. Nothing else.
CREATE OR REPLACE FUNCTION public.assignments_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF my_auth_role() IN ('owner','admin') THEN RETURN NEW; END IF;
  IF NEW.pod_id IS NOT NULL AND NEW.pod_id = ANY (my_led_pods()) THEN RETURN NEW; END IF;

  IF my_team_id() = ANY (OLD.assigned_member_ids) THEN
    NEW.id                   := OLD.id;
    NEW.title                := OLD.title;
    NEW.description          := OLD.description;
    NEW.pod_id               := OLD.pod_id;
    NEW.assigned_member_ids  := OLD.assigned_member_ids;
    NEW.assigned_member_names:= OLD.assigned_member_names;
    NEW.due_date             := OLD.due_date;
    NEW.hours                := OLD.hours;
    NEW.priority             := OLD.priority;
    NEW.deleted_at           := OLD.deleted_at;
    NEW.created_by           := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS assignments_protect_columns ON assignments;
CREATE TRIGGER assignments_protect_columns
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION public.assignments_protect_columns();

-- A LIT tunes their pod's cadence and default hours; identity, placement and
-- lifecycle stay with admins.
CREATE OR REPLACE FUNCTION public.pods_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF my_auth_role() IN ('owner','admin') THEN RETURN NEW; END IF;

  NEW.id         := OLD.id;
  NEW.name       := OLD.name;
  NEW.slug       := OLD.slug;
  NEW.chapter_id := OLD.chapter_id;
  NEW.track      := OLD.track;
  NEW.status     := OLD.status;
  NEW.sort_order := OLD.sort_order;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pods_protect_columns ON pods;
CREATE TRIGGER pods_protect_columns
  BEFORE UPDATE ON pods
  FOR EACH ROW EXECUTE FUNCTION public.pods_protect_columns();
