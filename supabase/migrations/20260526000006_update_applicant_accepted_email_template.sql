-- Update the applicant_accepted email template to use a permanent signup link
-- instead of a 24-hour expiring OTP link.
--
-- {{link}} now resolves to /members/signup?email=... (permanent).
-- The member visits that page and requests a fresh 24-hour setup link on demand.

UPDATE email_templates
SET body = '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#ffffff;margin:0;padding:0;">
  <div style="font-family:Garamond,''EB Garamond'',serif;font-size:15px;line-height:1.7;color:#111111;max-width:520px;margin:0 auto;padding:32px 24px;">
    <img src="https://novusnyc.org/logo.png" alt="Novus NYC logo" width="36" style="display:block;margin-bottom:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName}},</p>
    <p style="margin:0 0 16px;">Congratulations! You''ve been accepted to Novus NYC.</p>
    <p style="margin:0 0 24px;">Click below to set up your member portal account:</p>
    <p style="margin:0 0 24px;">
      <a href="{{link}}" style="display:inline-block;background-color:#F6B78D;color:#0d0d0d;font-weight:700;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;">Set Up Your Account</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#666666;">You''ll be taken to a page where you can request a secure setup link. The link can be re-requested at any time, so this email doesn''t expire.</p>
    <p style="margin:24px 0 0;">Best,<br>Ethan Zhang<br>Novus NYC</p>
  </div>
</body>
</html>'
WHERE key = 'applicant_accepted';
