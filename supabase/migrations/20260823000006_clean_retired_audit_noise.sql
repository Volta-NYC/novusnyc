-- Keep the audit log useful: remove records belonging to systems that no
-- longer exist, deleted template/config rows, and known bulk-import/reorder
-- bursts that produced hundreds of indistinguishable row-level entries.
-- Meaningful member, applicant, business, access, policy, and infraction
-- history is intentionally retained.

DELETE FROM public.audit_logs AS log
WHERE
  log.collection IN (
    'assignmentClaims',
    'assignmentCatalog',
    'assignmentTemplates',
    'cycles',
    'projectGroups',
    'calendarEvents'
  )
  OR (
    log.collection = 'assignments'
    AND log.timestamp < timestamptz '2026-08-21 00:00:00+00'
  )
  OR (
    log.collection = 'emailTemplates'
    AND NOT EXISTS (
      SELECT 1 FROM public.email_templates AS template
      WHERE template.id = log.record_id
    )
  )
  OR (
    log.collection = 'automationConfigs'
    AND NOT EXISTS (
      SELECT 1 FROM public.automation_configs AS config
      WHERE config.automation_id = log.record_id
    )
  )
  OR (
    log.collection = 'team'
    AND jsonb_typeof(log.details->'fields') = 'array'
    AND jsonb_array_length(log.details->'fields') > 0
    AND (log.details->'fields') <@ '["lastBiweeklyCheckinMark","lastBiweeklyCheckinCycleId"]'::jsonb
  )
  OR log.actor_name IN (
    'Bulk approval (owner request)',
    'Ethan Zhang (bulk showcase sync)',
    'Ethan Zhang (bulk draft backfill)',
    'Codex'
  )
  OR (
    log.actor_name = 'Ethan Zhang'
    AND log.collection = 'team'
    AND log.details->'fields' = '["grade"]'::jsonb
    AND log.timestamp < timestamptz '2026-05-11 00:00:00+00'
  )
  OR (
    log.actor_name = 'Ethan Zhang'
    AND log.collection = 'businesses'
    AND log.details->'fields' = '["sortIndex"]'::jsonb
  )
  OR (
    log.actor_name = 'Ethan Zhang'
    AND log.collection = 'siteSettings'
    AND log.details->'fields' = '["chapters"]'::jsonb
  );
