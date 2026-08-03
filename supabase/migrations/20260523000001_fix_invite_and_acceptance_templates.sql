-- Fix the invite template (still had old migration-era apology message).
-- This template is used by invite-member route, which sends a permanent landing URL (no OTP).
UPDATE email_templates
SET
  subject = 'Set up your Novus NYC member portal account',
  body    = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">You''ve been invited to set up your account on the Novus NYC member portal.</p>
    <p style="margin:0 0 24px;">Click below to get started:</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Set Up Your Account</a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#555555;"><em>If you didn''t expect this email, you can safely ignore it.</em></p>
    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang<br>Novus NYC</p>
  </div>
</body>
</html>'
WHERE key = 'invite';

-- Update the setup-link template to include the permanent fallback URL variable.
UPDATE email_templates
SET body = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 20px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">Here is the link to set up your Novus NYC member portal account.</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:7px 18px;border-radius:5px;text-decoration:none;font-size:13px;">Set Up Account</a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#555555;"><em>This link expires in 24 hours and can only be used once. If it expires, <a href="{{signupUrl}}" style="color:#F6B78D;">click here</a> to request a new one.</em></p>
    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang</p>
  </div>
</body>
</html>'
WHERE key = 'setup-link';

-- Add the new acceptance+setup template for applicants without portal accounts.
INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active)
VALUES (
  gen_random_uuid(),
  'applicant_accepted_new_user',
  'Applicant Accepted (New User)',
  'Sent to accepted applicants who do not yet have a portal account. Includes both the congratulations message and their account setup link.',
  'Congratulations — You''ve been accepted to Novus NYC',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">Congratulations! You''ve been accepted to Novus NYC.</p>
    <p style="margin:0 0 24px;">Click below to set up your member portal account and get started:</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Set Up Your Account</a>
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#555555;"><em>This link expires in 24 hours. If it expires, you can always <a href="{{signupUrl}}" style="color:#F6B78D;">request a new one here</a>.</em></p>
    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang<br>Novus NYC</p>
  </div>
</body>
</html>',
  ARRAY['firstName', 'name', 'link', 'signupUrl'],
  true
)
ON CONFLICT (key) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description,
  subject     = EXCLUDED.subject,
  body        = EXCLUDED.body,
  available_variables = EXCLUDED.available_variables;
