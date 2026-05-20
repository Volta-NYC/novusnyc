-- Add password reset email template and automation config so the reset
-- email is sent through our own SMTP pipeline (consistent with other
-- auth emails like setup-link and member-invite).

INSERT INTO email_templates (id, key, label, description, subject, body, available_variables, active, updated_by)
VALUES (
  gen_random_uuid(),
  'password-reset',
  'Password reset',
  'Sent when a member requests a password reset link.',
  'Reset your Volta NYC password',
  $BODY$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,'EB Garamond',serif;font-size:15px;line-height:1.7;color:#111111;background-color:#ffffff;max-width:520px;margin:0 auto;padding:32px 24px;">

    <img src="https://voltanyc.org/logo.png" alt="Volta NYC" width="36" style="display:block;margin-bottom:28px;">

    <p style="margin:0 0 20px;">Hi {{firstName}},</p>

    <p style="margin:0 0 16px;">We received a request to reset the password for your Volta NYC member portal account. Click the button below to choose a new password.</p>

    <p style="margin:0 0 28px;">
      <a href="{{link}}" style="display:inline-block;background-color:#85CC17;color:#0d0d0d;font-weight:700;padding:7px 18px;border-radius:5px;text-decoration:none;font-size:13px;">Reset Password</a>
    </p>

    <p style="margin:0 0 16px;font-size:13px;color:#555555;"><em>Note: This link expires in 1 hour and can only be used once. If you did not request a password reset, you can safely ignore this email.</em></p>

    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang</p>

  </div>
</body>
</html>$BODY$,
  ARRAY['firstName', 'link'],
  true,
  'seed'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO automation_configs (automation_id, label, description, template_key, enabled, updated_by)
VALUES (
  'password_reset',
  'Password reset',
  'Sent when a member requests a password reset link.',
  'password-reset',
  true,
  'seed'
)
ON CONFLICT (automation_id) DO NOTHING;
