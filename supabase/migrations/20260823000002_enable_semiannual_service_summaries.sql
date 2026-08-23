UPDATE public.email_templates
   SET subject = 'Your Novus service hours — {{period}}',
       body = '<p>Hi {{memberName}},</p><p>You completed <strong>{{totalHours}} certified service hours</strong> from {{period}}.</p><p>{{workSummary}}</p><p><a href="{{portalLink}}">Review your service record</a></p><p>If you need a formal verification letter, ask your Novus leadership team to generate one from the member directory.</p>',
       available_variables = ARRAY['memberName','period','totalHours','workSummary','portalLink'],
       active = true,
       updated_at = now(),
       updated_by = 'system'
 WHERE key = 'service_hours_summary';

UPDATE public.automation_configs
   SET enabled = true,
       description = 'Sends each active member one certified-hours summary in January and July.',
       updated_at = now(),
       updated_by = 'system'
 WHERE automation_id = 'service_hours_summary';
