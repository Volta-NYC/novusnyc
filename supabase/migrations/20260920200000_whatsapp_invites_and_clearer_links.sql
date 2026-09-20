-- Populate the WhatsApp invites, and make both links in an acceptance obvious.
--
-- The portal and WhatsApp links were buried mid-paragraph in one sentence.
-- Each now gets its own line and its own action verb, so a reader scanning the
-- message sees two things to do rather than one block of prose.
--
-- The invite codes are stored without WhatsApp's ?s=cl&p=i&mlu=4&ilr=4 click
-- attribution. chat.whatsapp.com/<code> is the canonical invite form and those
-- parameters only tag where the link was copied from; dropping them keeps a
-- tracker-shaped query string out of mail that is already fighting to stay out
-- of spam. They stay editable from the Applicants page.
--
-- Subjects lose the pipe. "Welcome to Novus | X" is a newsletter convention;
-- these are one-to-one messages and should not pattern-match a marketing blast.

update email_templates set subject = 'Welcome to the Novus Ambassadors', body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to the Novus Ambassadors team within our Marketing department.</p>
<p>You’ll help more students learn about Novus and get involved in our work. This includes connecting with schools, student organizations, and community programs, sharing opportunities to join, and building relationships that help us recruit future members.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you help grow the team!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_ambassadors';

update email_templates set subject = 'Welcome to Novus Grants & Funding', body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Grants &amp; Funding team within our Marketing department.</p>
<p>You’ll help secure the funding that supports Novus’s work with small businesses. This includes researching grant opportunities, checking eligibility requirements, drafting application materials, and organizing information about our projects and impact. You may also help with fundraising and financial planning for the organization.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_grants';

update email_templates set subject = 'Welcome to Novus Small Business Outreach', body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Small Business Outreach team within our Marketing department.</p>
<p>You’ll help us find and connect with small businesses that could benefit from our website and marketing services. Your work will include researching businesses, reaching out to owners, and learning about what they need so we can identify where Novus can help.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_outreach';

update email_templates set subject = 'Welcome to Novus Social Media & Branding', body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Social Media &amp; Branding team within our Marketing department.</p>
<p>You’ll help create social media content and promotional materials for the small businesses we work with, as well as content for Novus’s own platforms. This could include planning posts, designing graphics, and writing captions that reflect each business’s personality and help customers learn what it offers.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>Then <a href="{{whatsappLink}}">join our WhatsApp group</a> so you get team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to see what you create!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_social';

update email_templates set subject = 'Welcome to Novus Digital & Tech', body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Digital &amp; Tech department.</p>
<p>You’ll work with our technology team to build and improve websites for small businesses. Depending on your project, this may include developing pages, setting up forms and backend features, improving accessibility and search visibility, and helping launch and maintain a business’s website.</p>
<p>To get started, <a href="{{portalLink}}">open your member portal</a>.</p>
<p>I’ve CC’d Tahmid Islam, our Director of Technology. Please reply all with a self-introduction and share a little about your coding experience and the kind of work you’re interested in so he can help you get started.</p>
<p>We’re excited to build with you!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_tech';

update site_settings
   set acceptance_whatsapp_links = '{"outreach": "https://chat.whatsapp.com/FB9qUP2eZTd9jvIZmDIZYn", "social": "https://chat.whatsapp.com/LvT3vkbZ0ZMDL1Bjox8STy", "grants": "https://chat.whatsapp.com/L8qyGurhb8x5C5zCqUnUZj", "ambassadors": "https://chat.whatsapp.com/FxPAyrRp82gI91wKFqUGNw"}'::jsonb,
       updated_at = now()
 where id = 'singleton';
