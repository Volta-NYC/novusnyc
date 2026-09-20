-- Strip the styling out of every backend email.
--
-- The templates carried a wrapper div setting font-family, font-size,
-- line-height, colour and max-width, plus per-paragraph margins, coloured
-- links and a peach button. Rendered in a real inbox that reads as a marketing
-- blast, not a note from a person -- which is both the wrong impression for an
-- acceptance letter and a mild spam signal.
--
-- What is left is what a person typing in Gmail actually produces: bare <p>
-- tags, default client typography, default link colour. Paragraph spacing now
-- comes from the client's own <p> margins rather than hand-set pixels.
--
-- Anchor text changed too: showing a full URL as the visible link text is a
-- phishing convention. "your member portal" carries the same link without it.
--
-- custom_* templates are left alone; those were authored by hand in the portal
-- editor and their formatting is deliberate.

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to the Novus Ambassadors team within our Marketing department.</p>
<p>You’ll help more students learn about Novus and get involved in our work. This includes connecting with schools, student organizations, and community programs, sharing opportunities to join, and building relationships that help us recruit future members.</p>
<p>To get started, access <a href="{{portalLink}}">your member portal</a>. Please also join <a href="{{whatsappLink}}">our WhatsApp group</a> for team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you help grow the team!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_ambassadors';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Grants &amp; Funding team within our Marketing department.</p>
<p>You’ll help secure the funding that supports Novus’s work with small businesses. This includes researching grant opportunities, checking eligibility requirements, drafting application materials, and organizing information about our projects and impact. You may also help with fundraising and financial planning for the organization.</p>
<p>To get started, access <a href="{{portalLink}}">your member portal</a>. Please also join <a href="{{whatsappLink}}">our WhatsApp group</a> for team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_grants';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Small Business Outreach team within our Marketing department.</p>
<p>You’ll help us find and connect with small businesses that could benefit from our website and marketing services. Your work will include researching businesses, reaching out to owners, and learning about what they need so we can identify where Novus can help.</p>
<p>To get started, access <a href="{{portalLink}}">your member portal</a>. Please also join <a href="{{whatsappLink}}">our WhatsApp group</a> for team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to have you join us!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_outreach';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Social Media &amp; Branding team within our Marketing department.</p>
<p>You’ll help create social media content and promotional materials for the small businesses we work with, as well as content for Novus’s own platforms. This could include planning posts, designing graphics, and writing captions that reflect each business’s personality and help customers learn what it offers.</p>
<p>To get started, access <a href="{{portalLink}}">your member portal</a>. Please also join <a href="{{whatsappLink}}">our WhatsApp group</a> for team updates.</p>
<p>Please reply all with a short introduction so we can help you get started with the team.</p>
<p>We’re excited to see what you create!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_social';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You’ve been accepted to Novus’s Digital &amp; Tech department.</p>
<p>You’ll work with our technology team to build and improve websites for small businesses. Depending on your project, this may include developing pages, setting up forms and backend features, improving accessibility and search visibility, and helping launch and maintain a business’s website.</p>
<p>To get started, access <a href="{{portalLink}}">your member portal</a>.</p>
<p>I’ve CC’d Tahmid Islam, our Director of Technology. Please reply all with a self-introduction and share a little about your coding experience and the kind of work you’re interested in so he can help you get started.</p>
<p>We’re excited to build with you!</p>
<p>Best,<br>Ethan<br>Novus NYC</p>$b$, updated_at = now() where key = 'acceptance_tech';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Congratulations! You've been accepted to Novus NYC.</p>
<p>Use the link below to set up your member portal account:</p>
<p><a href="{{link}}">Set Up Your Account</a></p>
<p>You'll be taken to a page where you can request a secure setup link. The link can be re-requested at any time, so this email doesn't expire.</p>
<p>Best,<br>Ethan Zhang<br>Novus NYC</p>$b$, updated_at = now() where key = 'applicant_accepted';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p>An infraction was recorded on your record:</p><p>{{infractionName}} ({{points}} points)</p><p>{{notePart}}</p><p>You're now at <strong>{{totalPoints}} points</strong> — {{standing}}.</p><p>If you think this is wrong, reply to this email and we'll look at it.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'infraction_issued';

update email_templates set body = $b$<p>Hi {{applicantName}},</p><p>Your Novus interview is confirmed.</p><p><strong>Time:</strong> {{interviewTime}}<br><strong>Meeting:</strong> {{zoomLink}}</p><p><a href="{{googleCalendarUrl}}">Add to Google Calendar</a><br>A calendar invite (.ics) is attached.</p><p>If you need to reschedule, reply to this email and we'll sort it out.</p><p>We look forward to speaking with you.</p><p>Best,<br>Ethan Zhang</p>$b$, updated_at = now() where key = 'interview_confirmation';

update email_templates set body = $b$<p>Hi {{applicantName}},</p><p>Your <strong>Novus interview</strong> has been rescheduled.</p><p><strong>Previous time:</strong> {{previousTime}}<br><strong>New time:</strong> {{interviewTime}}<br><strong>Meeting:</strong> {{zoomLink}}</p><p><a href="{{googleCalendarUrl}}">Open in Google Calendar</a><br>A fresh calendar invite (.ics) is attached.</p><p>If you need to reschedule again, reply to this email.</p><p>Best,<br>Ethan Zhang</p>$b$, updated_at = now() where key = 'interview_rescheduled';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>You've been invited to set up your account on the Novus NYC member portal.</p>
<p>Use the link below to get started:</p>
<p><a href="{{link}}">Set Up Your Account</a></p>
<p>Best,<br>Ethan Zhang<br>Novus NYC</p>$b$, updated_at = now() where key = 'invite';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>We received a request to reset the password for your Novus NYC member portal account. Use the link below to choose a new password.</p>
<p><a href="{{link}}">Reset Password</a></p>
<p><em>This link expires in 1 hour and can only be used once.</em></p>
<p>Best,<br>Ethan Zhang</p>$b$, updated_at = now() where key = 'password-reset';

update email_templates set body = $b$<p>Hi {{litName}},</p><p>The <strong>{{podName}}</strong> meeting on {{meetingDate}} has no attendance saved yet. It takes about a minute: the roster is already filled in and everyone starts marked Present, so you only mark the exceptions.</p><p>Until it's saved, nobody in the pod earns hours for that meeting, and none of it reaches their service letter.</p><p><a href="{{portalLink}}">Fill in attendance →</a></p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'pod_attendance_missing';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p><strong>{{meetingTitle}}</strong> is scheduled for {{meetingDate}} at {{meetingTime}}.</p><p><a href="{{meetingLink}}">Join or view meeting details</a></p><p><a href="{{portalLink}}">Open the member portal</a></p>$b$, updated_at = now() where key = 'pod_meeting_reminder';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p>You've been assigned a task in <strong>{{podName}}</strong>.</p><p>{{taskTitle}}</p><p>{{dueDatePart}}</p><p>Mark it done in the portal when you finish so the hours land on your record.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'pod_task_assigned';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p><strong>{{taskTitle}}</strong> ({{podName}}) is due {{dueDate}}.</p><p>If it's already done, mark it in the portal. If it's going to be late, tell your LIT — a missed deadline nobody hears about is what earns an infraction.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'pod_task_due_soon';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p>You've been assigned to build the website for <strong>{{businessName}}</strong>{{neighborhoodPart}}.</p><p>{{contactPart}}</p><p>Everything else — notes, links, status — is on the project in the portal.</p><p>Move it to <strong>Draft Ready</strong> once there's a preview link worth showing the client.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'project_assigned';

update email_templates set body = $b$<p>Hi {{leadName}},</p><p><strong>{{businessName}}</strong> has been moved to Draft Ready by {{assigneeNames}}.</p><p><a href="{{previewUrl}}">Open the preview →</a></p><p>If it's good to send, move it to With Client.</p>
<p>Novus NYC · <a href="{{portalLink}}">member portal</a></p>$b$, updated_at = now() where key = 'project_draft_ready';

update email_templates set body = $b$<p>Hi {{memberName}},</p><p>You completed <strong>{{totalHours}} certified service hours</strong> from {{period}}.</p><p>{{workSummary}}</p><p><a href="{{portalLink}}">Review your service record</a></p><p>If you need a formal verification letter, ask your Novus leadership team to generate one from the member directory.</p>$b$, updated_at = now() where key = 'service_hours_summary';

update email_templates set body = $b$<p>Hi {{firstName}},</p>
<p>Here is the link to set up your Novus NYC member portal account.</p>
<p><a href="{{link}}">Set Up Account</a></p>
<p><em>This link expires in 24 hours and can only be used once. If it expires, <a href="{{signupUrl}}">click here</a> to request a new one.</em></p>
<p>Best,<br>Ethan Zhang</p>$b$, updated_at = now() where key = 'setup-link';
