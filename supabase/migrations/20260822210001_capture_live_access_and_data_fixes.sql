-- Capture the fixes that were made directly against the shared production
-- database, so a clean environment has the same schema, policies and public
-- values. Every statement is idempotent because production already has some
-- or all of this state.

-- Private roster notes. The old team.notes column was visible to every member.
CREATE TABLE IF NOT EXISTS public.member_notes (
  member_id  text PRIMARY KEY REFERENCES public.team(id) ON DELETE CASCADE,
  note       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'team' AND column_name = 'notes'
  ) THEN
    EXECUTE $sql$
      INSERT INTO public.member_notes (member_id, note, updated_at)
      SELECT id, notes, coalesce(updated_at, now())
        FROM public.team
       WHERE coalesce(notes, '') <> ''
      ON CONFLICT (member_id) DO UPDATE
        SET note = EXCLUDED.note,
            updated_at = greatest(member_notes.updated_at, EXCLUDED.updated_at)
    $sql$;
  END IF;
END
$block$;

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_notes_admin_all ON public.member_notes;
CREATE POLICY member_notes_admin_all ON public.member_notes
  FOR ALL TO authenticated
  USING (my_auth_role() IN ('owner', 'admin'))
  WITH CHECK (my_auth_role() IN ('owner', 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_notes TO authenticated;
GRANT ALL ON public.member_notes TO service_role;

ALTER TABLE public.team DROP COLUMN IF EXISTS notes;

-- Service-role requests carry no member JWT. Treating them as role "none"
-- caused trusted server writes to be silently pinned by column guards.
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT current_setting('request.jwt.claims', true) IS NULL
      OR current_setting('request.jwt.claims', true) = ''
      OR coalesce(auth.role(), '') = 'service_role'
      OR my_auth_role() IN ('owner', 'admin')
$function$;

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
    NEW.archived                  := OLD.archived;
    NEW.deleted_at                := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pods_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
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

-- Client records are visible to LITs and above. A plain member sees only work
-- assigned to them. Remove the older broad SELECT policies first.
DROP POLICY IF EXISTS businesses_admin_select ON public.businesses;
DROP POLICY IF EXISTS businesses_member_select ON public.businesses;
DROP POLICY IF EXISTS businesses_scoped_select ON public.businesses;
CREATE POLICY businesses_scoped_select ON public.businesses
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      my_auth_role() IN ('owner', 'admin')
      OR is_tech_lead()
      OR coalesce(array_length(my_led_pods(), 1), 0) > 0
      OR my_team_id() = ANY(coalesce(assignees, '{}'::text[]))
    )
  );

-- Public/admin values that were corrected live. Explicit overrides preserve
-- the published all-time claims while the admin panel still shows live counts.
UPDATE public.site_settings
   SET public_stat_overrides = coalesce(public_stat_overrides, '{}'::jsonb) ||
       jsonb_build_object(
         'homeStudentMembers', '400+',
         'homeBusinessesSupported', '170+',
         'communityOrganizations', '26+',
         'homeNetworkLocations', '13+',
         'aboutBusinesses', '170+',
         'aboutWebsiteProjects', '150+',
         'aboutMarketingProjects', '90+'
       )
 WHERE id = 'singleton';

UPDATE public.pods SET track = 'Marketing';
UPDATE public.businesses
   SET live_url = 'https://agenciadeempleosnyc.com', updated_at = now()
 WHERE lower(name) = 'golden rose employment agency';
UPDATE public.automation_configs
   SET enabled = false, updated_at = now()
 WHERE automation_id = 'service_hours_summary';

NOTIFY pgrst, 'reload schema';
