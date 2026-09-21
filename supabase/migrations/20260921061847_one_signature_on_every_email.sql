-- One sign-off on every backend email: Best, / Ethan / Novus NYC.
--
-- The org-wide Workspace footer and the info@ group footer are both gone, so
-- this signature is now the only ending a message carries. Templates had
-- drifted into four variants (Ethan Zhang, Ethan Zhang / Novus NYC, Ethan,
-- and a "Novus NYC · member portal" footer line with no sign-off at all).
--
-- infraction_issued and project_draft_ready lose that footer line, but keep
-- the portal link as an ordinary sentence since both point the reader there.
--
-- Also clears leftovers from when these emails had buttons: Title Case anchor
-- text, "click here", and a decorative arrow.
--
-- Targeted replace() rather than body rewrites, so copy edited in the portal
-- editor survives. Replaying is a no-op once the old strings are gone; the
-- append is guarded so it cannot add a second signature.

update email_templates
   set body = replace(body, $o$<p>Best,<br>Ethan Zhang</p>$o$, $n$<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'interview_confirmation';

update email_templates
   set body = replace(body, $o$<p>Best,<br>Ethan Zhang</p>$o$, $n$<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'interview_rescheduled';

update email_templates
   set body = replace(body, $o$<p>Best,<br>Ethan Zhang</p>$o$, $n$<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'password-reset';

update email_templates
   set body = replace(body, $o$<p>Best,<br>Ethan Zhang</p>$o$, $n$<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'setup-link';

update email_templates
   set body = replace(body, $o$<p>Best,<br>Ethan Zhang<br>Novus NYC</p>$o$, $n$<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'invite';

update email_templates
   set body = replace(body, $o$>Set Up Your Account</a>$o$, $n$>Set up your account</a>$n$), updated_at = now()
 where key = 'applicant_accepted';

update email_templates
   set body = replace(body, $o$>Set Up Your Account</a>$o$, $n$>Set up your account</a>$n$), updated_at = now()
 where key = 'invite';

update email_templates
   set body = replace(body, $o$>Set Up Account</a>$o$, $n$>Set up your account</a>$n$), updated_at = now()
 where key = 'setup-link';

update email_templates
   set body = replace(body, $o$>Reset Password</a>$o$, $n$>Reset your password</a>$n$), updated_at = now()
 where key = 'password-reset';

update email_templates
   set body = replace(body, $o$<a href="{{signupUrl}}">click here</a> to request a new one$o$, $n$you can <a href="{{signupUrl}}">request a new one</a>$n$), updated_at = now()
 where key = 'setup-link';

update email_templates
   set body = replace(body, $o$<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$o$, $n$<p>You can see your full record in <a href="{{portalLink}}">the member portal</a>.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'infraction_issued';

update email_templates
   set body = replace(body, $o$Open the preview →</a>$o$, $n$Open the preview</a>$n$), updated_at = now()
 where key = 'project_draft_ready';

update email_templates
   set body = replace(body, $o$move it to With Client.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$o$, $n$move it to With Client in <a href="{{portalLink}}">the member portal</a>.</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$n$), updated_at = now()
 where key = 'project_draft_ready';

update email_templates
   set body = body || $s$
<p>Best,<br>Ethan<br>Novus NYC</p>$s$, updated_at = now()
 where key = 'service_hours_summary'
   and body not like '%Best,<br>Ethan<br>Novus NYC%';
