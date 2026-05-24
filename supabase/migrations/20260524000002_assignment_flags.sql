-- Add applicationRequired and allowMultipleCompletions flags to assignments and templates.
-- credit_targets on cycles is already JSONB — no schema change needed, the app
-- writes the new { baseRequirement, promotionTargets } shape directly.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS application_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_multiple_completions boolean DEFAULT false;

ALTER TABLE assignment_templates
  ADD COLUMN IF NOT EXISTS application_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_multiple_completions boolean DEFAULT false;
