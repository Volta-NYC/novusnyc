ALTER TABLE public.grant_opportunities
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'Small Businesses',
  ADD COLUMN IF NOT EXISTS owner_member_id text REFERENCES public.team(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opens_on date,
  ADD COLUMN IF NOT EXISTS required_materials text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified_on date;

ALTER TABLE public.grant_opportunities
  DROP CONSTRAINT IF EXISTS grant_opportunities_audience_check;

ALTER TABLE public.grant_opportunities
  ADD CONSTRAINT grant_opportunities_audience_check
  CHECK (audience IN ('Small Businesses', 'Novus'));

CREATE INDEX IF NOT EXISTS grant_opportunities_owner_idx
  ON public.grant_opportunities (owner_member_id)
  WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';
