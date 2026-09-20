-- Shorten the acceptance sign-off to "Best, / Ethan".
--
-- The org may append its own Novus footer to outgoing mail, and the info@ group
-- was appending a second one, so "Best, / Ethan Zhang / Novus" risked stacking
-- three sign-offs on one email. The name and the org belong in the footer, not
-- in the body.
--
-- A targeted replace rather than a body rewrite: these templates are editable
-- from the portal, and rewriting the whole body would silently discard any copy
-- edits made there since. Replaying is a no-op once the old string is gone.

update email_templates
   set body = replace(
         body,
         '<p style="margin:0;">Best,<br>Ethan Zhang<br>Novus</p>',
         '<p style="margin:0;">Best,<br>Ethan</p>'
       ),
       updated_at = now()
 where key in (
   'acceptance_outreach',
   'acceptance_social',
   'acceptance_grants',
   'acceptance_ambassadors',
   'acceptance_tech'
 );
