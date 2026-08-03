function wrapper(content: string): string {
  return `<div style="font-family: Garamond, 'EB Garamond', serif; font-size: 15px; line-height: 1.7; color: #111111; color-scheme: light;">${content}</div>`;
}

function bookingButton(link: string): string {
  return `<p><a href="${link}" style="display:inline-block; background-color:#F6B78D; color:#231F24 !important; -webkit-text-fill-color:#231F24; padding:4px 12px; border-radius:3px; text-decoration:none; font-size:12px; font-family:Garamond,'EB Garamond',serif;"><span style="color:#231F24 !important; -webkit-text-fill-color:#231F24;">Book Your Interview Slot</span></a></p>`;
}

function interviewInviteEmail(name: string, bookingLink: string): string {
  return wrapper(
    `<p>Dear ${name},</p>` +
      `<p>Congratulations! You have been invited to the next stage of the selection process.</p>` +
      `<p>While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Novus and the work we're doing with our current business partners.</p>` +
      `<p><strong>Next Steps:</strong> We'd like to schedule a formal interview to discuss your placement within the team and your specific interests.</p>` +
      `<p>Your interview will take place <strong>next week</strong>. Please secure your time slot within the next 48 hours:</p>` +
      bookingButton(bookingLink) +
      `<p>We look forward to learning more about you.</p>` +
      `<p>Sincerely,<br>Ethan Zhang<br>Novus NYC</p>`
  );
}

// Used when the accepted applicant already has a confirmed portal account —
// they don't need a new invite link, just notification of acceptance.
function confirmedAccountAcceptanceEmail(name: string): string {
  const firstName = name.split(" ")[0] || name;
  return wrapper(
    `<p>Hi ${firstName},</p>` +
      `<p>Congratulations! You've been accepted to Novus NYC.</p>` +
      `<p>You'll be assigned to a project within the next week. Your team, tasks, and project details are organized in the member portal — sign in at <a href="https://novusnyc.org/members" style="color:#F6B78D;">novusnyc.org/members</a>.</p>` +
      `<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`
  );
}

export function buildInterviewInviteTemplate(input: {
  name: string;
  bookingLink: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Next Steps: Novus Interview Invitation",
    html: interviewInviteEmail(input.name, input.bookingLink),
    text: [
      `Dear ${input.name},`,
      "",
      "Congratulations! You have been invited to the next stage of the selection process.",
      "While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Novus and the work we're doing with our current business partners.",
      "Next Steps: We'd like to schedule a formal interview to discuss your placement within the team and your specific interests.",
      "Your interview will take place next week. Please secure your time slot within the next 48 hours:",
      input.bookingLink,
      "",
      "We look forward to learning more about you.",
      "",
      "Sincerely,",
      "Ethan Zhang",
      "Novus NYC",
    ].join("\n"),
  };
}

export function buildConfirmedAccountAcceptanceTemplate(input: {
  name: string;
}): { subject: string; html: string; text: string } {
  const firstName = input.name.split(" ")[0] || input.name;
  return {
    subject: "Congratulations — You've been accepted to Novus NYC",
    html: confirmedAccountAcceptanceEmail(input.name),
    text: [
      `Hi ${firstName},`,
      "",
      "Congratulations! You've been accepted to Novus NYC.",
      "",
      "You'll be assigned to a project within the next week. Your team, tasks, and project details are organized in the member portal — sign in at https://novusnyc.org/members.",
      "",
      "Best,",
      "Ethan Zhang",
      "Novus NYC",
    ].join("\n"),
  };
}
