-- POST-DEPLOY ONLY: the matching application code must be live first.
-- Pods now own meetings/tasks, chapters come from the chapters table, and
-- business service choices come from the canonical code list.

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM public.assignment_templates) THEN
    RAISE EXCEPTION 'assignment_templates still has rows; refusing to drop it';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.assignments
    WHERE template_id IS NOT NULL OR project_group_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'assignments still reference legacy templates or project groups';
  END IF;
END
$block$;

ALTER TABLE public.assignments
  DROP COLUMN IF EXISTS template_id,
  DROP COLUMN IF EXISTS project_group_id;

DROP TABLE IF EXISTS public.assignment_templates CASCADE;
DROP TABLE IF EXISTS public.project_groups CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS services,
  DROP COLUMN IF EXISTS chapters;

NOTIFY pgrst, 'reload schema';
