-- Volta green (#85CC17) survived in email templates and the portal banner.
--
-- Replacing it is not a straight hex swap. The green was dark enough to carry
-- white text; n-orange (#F6B78D) is a pastel and cannot. Every button that
-- paired the green with #ffffff has its label darkened to n-ink in the same
-- pass, or the swap would produce unreadable white-on-peach.

-- Buttons that used white labels: darken the label with the fill.
UPDATE email_templates
SET body = replace(body, 'background-color:#85CC17;color:#ffffff', 'background-color:#F6B78D;color:#2D282E')
WHERE body LIKE '%background-color:#85CC17;color:#ffffff%';

-- Buttons that already used a dark label: normalize to n-ink.
UPDATE email_templates
SET body = replace(body, 'background-color:#85CC17;color:#0d0d0d', 'background-color:#F6B78D;color:#2D282E')
WHERE body LIKE '%background-color:#85CC17;color:#0d0d0d%';

-- Accent rule on the assignment-update callout, plus its green-tinted panel.
UPDATE email_templates
SET body = replace(replace(body, '#85CC17', '#F6B78D'), '#f9fdf5', '#FDF7F2')
WHERE body LIKE '%#85CC17%' OR body LIKE '%#f9fdf5%';

-- Any remaining stragglers in either hex.
UPDATE email_templates
SET body = replace(replace(body, '#85CC17', '#F6B78D'), '#C4F135', '#F3E28D')
WHERE body LIKE '%#85CC17%' OR body LIKE '%#C4F135%';

-- Portal banner: peach fill needs the ink label, matching the public banner.
UPDATE site_settings
SET portal_banner_bg = '#F6B78D', portal_banner_text = '#2D282E'
WHERE portal_banner_bg ILIKE '#85CC17';
