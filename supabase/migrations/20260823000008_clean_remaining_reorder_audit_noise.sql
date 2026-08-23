-- Public-card drag ordering formerly wrote one audit row per business. The new
-- endpoint records one batch event, so the old per-row reorder entries carry no
-- useful history regardless of which owner performed the drag.
DELETE FROM public.audit_logs
WHERE collection = 'businesses'
  AND details->'fields' = '["sortIndex"]'::jsonb;
