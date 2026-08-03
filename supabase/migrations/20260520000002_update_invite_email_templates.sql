-- Update member invite and portal setup link email template bodies.
-- New copy: Garamond font, slim CTA button, logo preserved at top.

UPDATE email_templates
SET
  body = $INVITE$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,'EB Garamond',serif;font-size:15px;line-height:1.7;color:#111111;background-color:#ffffff;max-width:520px;margin:0 auto;padding:32px 24px;">

    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">

    <p style="margin:0 0 20px;">Hi {{firstName}},</p>

    <p style="margin:0 0 16px;">We apologize for the confusion—it has come to our attention that the links sent out yesterday are expired. If you haven't created your new account yet, please use the button below to go to the setup page and request a fresh link.</p>

    <p style="margin:0 0 16px;">Even if you previously created an account, <strong>you must complete this process</strong>. All legacy accounts have been permanently deactivated during our backend migration. Moving forward, this portal will be the central hub for all your member activity, including assignments, credits, infractions, and team updates.</p>

    <p style="margin:0 0 28px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:7px 18px;border-radius:5px;text-decoration:none;font-size:13px;">Create Your Account</a>
    </p>

    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang</p>

  </div>
</body>
</html>$INVITE$,
  updated_at = now(),
  updated_by = 'migration'
WHERE key = 'invite';

UPDATE email_templates
SET
  body = $SETUP$<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,'EB Garamond',serif;font-size:15px;line-height:1.7;color:#111111;background-color:#ffffff;max-width:520px;margin:0 auto;padding:32px 24px;">

    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">

    <p style="margin:0 0 20px;">Hi {{firstName}},</p>

    <p style="margin:0 0 16px;">Here is the link to set up your Novus NYC member portal account.</p>

    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:7px 18px;border-radius:5px;text-decoration:none;font-size:13px;">Set Up Account</a>
    </p>

    <p style="margin:0 0 16px;font-size:13px;color:#555555;"><em>Note: For security purposes, this link expires in 24 hours and can only be used once. If you did not request this link, you can safely ignore this email.</em></p>

    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang</p>

  </div>
</body>
</html>$SETUP$,
  updated_at = now(),
  updated_by = 'migration'
WHERE key = 'setup-link';
