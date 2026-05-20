-- Seed invite and setup-link email templates into the existing email_templates table.
insert into email_templates (id, key, label, description, subject, body, available_variables) values
(
  gen_random_uuid(),
  'invite',
  'Member invite',
  'Sent by admin when inviting a new member to create their portal account. Contains a permanent link that never expires.',
  'Set up your Volta NYC member portal account',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="margin-bottom:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Set up your member portal account</h2>
  <p style="margin:0 0 24px;color:#555;font-size:15px">Hi {{firstName}}, you''ve been invited to join the Volta NYC member portal.</p>
  <a href="{{link}}" style="display:inline-block;background:#85CC17;color:#0d0d0d;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px">Set Up Account</a>
  <p style="margin:24px 0 0;font-size:13px;color:#888">If you didn''t expect this email, you can safely ignore it.</p>
</body>
</html>',
  array['{{name}}', '{{firstName}}', '{{link}}']
),
(
  gen_random_uuid(),
  'setup-link',
  'Portal setup link',
  'Sent when a member requests a fresh setup link from the signup page. Contains a one-time OTP link that expires in 24 hours.',
  'Your Volta NYC portal setup link',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="margin-bottom:24px">
  <h2 style="margin:0 0 8px;font-size:20px">Your portal setup link</h2>
  <p style="margin:0 0 24px;color:#555;font-size:15px">Hi {{firstName}}, click below to set up your Volta NYC member portal account.</p>
  <a href="{{link}}" style="display:inline-block;background:#85CC17;color:#0d0d0d;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px">Set Up Account</a>
  <p style="margin:24px 0 0;font-size:13px;color:#888">This link expires in 24 hours and can only be used once.<br>If you didn''t request this, you can safely ignore it.</p>
</body>
</html>',
  array['{{name}}', '{{firstName}}', '{{link}}']
)
on conflict (key) do nothing;
