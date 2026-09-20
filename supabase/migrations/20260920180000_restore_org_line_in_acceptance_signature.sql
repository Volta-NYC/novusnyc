-- Put the org line back in the acceptance sign-off.
--
-- 20260920160000 cut it to "Best, / Ethan" because an org-wide Append footer
-- and the info@ group footer would each have added their own Novus line. Both
-- have since been removed, so nothing else names the organisation and the
-- signature has to carry it again.
--
-- Targeted replace rather than a body rewrite: these templates are editable
-- from the portal, and rewriting the whole body would silently discard copy
-- edits made there. Replaying is a no-op once the old string is gone.

update email_templates
   set body = replace(
         body,
         '<p style="margin:0;">Best,<br>Ethan</p>',
         '<p style="margin:0;">Best,<br>Ethan<br>Novus NYC</p>'
       ),
       updated_at = now()
 where key in (
   'acceptance_outreach',
   'acceptance_social',
   'acceptance_grants',
   'acceptance_ambassadors',
   'acceptance_tech'
 );
