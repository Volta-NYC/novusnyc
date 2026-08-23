-- Final targeted cleanup requested by the owner. Preserve meaningful access,
-- role, content, applicant and settings history while removing three old UI
-- noise patterns specifically attributed to Ethan Zhang:
--   1. repeated invite clicks for the same member (keep the newest),
--   2. whole-member saves that only reported every legacy form field, and
--   3. whole-business saves that only reported every legacy form field.

WITH ranked_invites AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY record_id
           ORDER BY timestamp DESC, id DESC
         ) AS occurrence
    FROM public.audit_logs
   WHERE collection = 'team'
     AND action = 'invite'
     AND (
       lower(coalesce(actor_email, '')) = 'ethanzhang180@gmail.com'
       OR lower(coalesce(actor_name, '')) = 'ethan zhang'
     )
)
DELETE FROM public.audit_logs
 WHERE id IN (SELECT id FROM ranked_invites WHERE occurrence > 1);

DELETE FROM public.audit_logs
 WHERE collection = 'team'
   AND action = 'update'
   AND (
     lower(coalesce(actor_email, '')) = 'ethanzhang180@gmail.com'
     OR lower(coalesce(actor_name, '')) = 'ethan zhang'
   )
   AND jsonb_typeof(details -> 'fields') = 'array'
   AND jsonb_array_length(details -> 'fields') >= 10
   AND details -> 'fields' ? 'pod'
   AND details -> 'fields' ? 'notes';

DELETE FROM public.audit_logs
 WHERE collection = 'businesses'
   AND action = 'update'
   AND (
     lower(coalesce(actor_email, '')) = 'ethanzhang180@gmail.com'
     OR lower(coalesce(actor_name, '')) = 'ethan zhang'
   )
   AND jsonb_typeof(details -> 'fields') = 'array'
   AND jsonb_array_length(details -> 'fields') >= 20
   AND details -> 'fields' ? 'showcaseImageData'
   AND details -> 'fields' ? 'teamMembers';
