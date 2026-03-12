type AcceptanceRole =
  | "Analyst"
  | "Senior Analyst"
  | "Associate"
  | "Senior Associate"
  | "Project Lead";

function normalizeRole(value: string): AcceptanceRole | "" {
  const key = value.trim().toLowerCase();
  if (key === "analyst") return "Analyst";
  if (key === "senior analyst") return "Senior Analyst";
  if (key === "associate") return "Associate";
  if (key === "senior associate") return "Senior Associate";
  if (key === "project lead") return "Project Lead";
  return "";
}

function wrapper(content: string): string {
  return `<div style="font-family: Garamond, 'EB Garamond', serif; font-size: 15px; line-height: 1.7; color: #111111; color-scheme: light;">${content}</div>`;
}

function formatTrack(track: string): string {
  return track.includes(",") ? `across <strong>${track}</strong>` : `on <strong>${track}</strong>`;
}

function bookingButton(link: string): string {
  return `<p><a href="${link}" style="display:inline-block; background-color:#85CC17; color:#ffffff !important; -webkit-text-fill-color:#ffffff; padding:4px 12px; border-radius:3px; text-decoration:none; font-size:12px; font-family:Garamond,'EB Garamond',serif;"><span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff;">Book Your Interview Slot</span></a></p>`;
}

function signupButton(link: string): string {
  return `<p><a href="${link}" style="display:inline-block; background-color:#85CC17; color:#ffffff !important; -webkit-text-fill-color:#ffffff; padding:4px 12px; border-radius:3px; text-decoration:none; font-size:12px; font-family:Garamond,'EB Garamond',serif;"><span style="color:#ffffff !important; -webkit-text-fill-color:#ffffff;">Create Your Member Account</span></a></p>`;
}

function interviewInviteEmail(name: string, bookingLink: string): string {
  return wrapper(
    `<p>Dear ${name},</p>` +
      `<p>Congratulations! You have been invited to the next stage of the selection process.</p>` +
      `<p>While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Volta and the work we're doing with our current business partners.</p>` +
      `<p><strong>Next Steps:</strong> We'd like to schedule a formal interview to discuss your placement within the team and your specific interests.</p>` +
      `<p>Your interview will take place <strong>next week</strong>. Please secure your time slot within the next 48 hours:</p>` +
      bookingButton(bookingLink) +
      `<p>We look forward to learning more about you.</p>` +
      `<p>Sincerely,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

function analystEmail(name: string, track: string, signupLink: string): string {
  return wrapper(
    `<p>Hi ${name},</p>` +
      `<p>Congratulations! You've been accepted to Volta NYC as an <strong>Analyst</strong> ${formatTrack(track)}.</p>` +
      `<p>You'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>` +
      signupButton(signupLink) +
      `<p>Best,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

function seniorAnalystEmail(name: string, track: string, signupLink: string): string {
  return wrapper(
    `<p>Hi ${name},</p>` +
      `<p>Congratulations! You've been accepted to Volta NYC as a <strong>Senior Analyst</strong> ${formatTrack(track)}.</p>` +
      `<p>You'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>` +
      signupButton(signupLink) +
      `<p>Best,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

function associateEmail(name: string, track: string, signupLink: string): string {
  return wrapper(
    `<p>Hi ${name},</p>` +
      `<p>Congratulations! You've been accepted to Volta NYC as an <strong>Associate</strong> ${formatTrack(track)}.</p>` +
      `<p>You'll be assigned to a project within the next week. Based on your application, you're on a clear path for early leadership consideration as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>` +
      signupButton(signupLink) +
      `<p>Best,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

function seniorAssociateEmail(name: string, track: string, signupLink: string): string {
  return wrapper(
    `<p>Hi ${name},</p>` +
      `<p>Congratulations! You've been accepted to Volta NYC as a <strong>Senior Associate</strong> ${formatTrack(track)}.</p>` +
      `<p>You'll be assigned to a project within the next week. We're bringing you in as a Senior Associate because we trust your ability to lead and see your potential to take on more responsibility as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>` +
      signupButton(signupLink) +
      `<p>Best,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

function projectLeadEmail(name: string, track: string, signupLink: string): string {
  return wrapper(
    `<p>Hi ${name},</p>` +
      `<p>Congratulations! We're excited to offer you a <strong>Project Lead</strong> role at Volta NYC.</p>` +
      `<p>You'll be assigned to lead one of our upcoming projects within the next week. Project Leads are accountable for delivery, quality, and communication. If you have peers you'd like to bring on, feel free to let us know. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>` +
      signupButton(signupLink) +
      `<p>Best,<br>Ethan Zhang<br>Volta NYC</p>`
  );
}

export function buildInterviewInviteTemplate(input: {
  name: string;
  bookingLink: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Next Steps: Volta Interview Invitation",
    html: interviewInviteEmail(input.name, input.bookingLink),
    text: [
      `Dear ${input.name},`,
      "",
      "Congratulations! You have been invited to the next stage of the selection process.",
      "While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Volta and the work we're doing with our current business partners.",
      "Next Steps: We'd like to schedule a formal interview to discuss your placement within the team and your specific interests.",
      "Your interview will take place next week. Please secure your time slot within the next 48 hours:",
      input.bookingLink,
      "",
      "We look forward to learning more about you.",
      "",
      "Sincerely,",
      "Ethan Zhang",
      "Volta NYC",
    ].join("\n"),
  };
}

export function buildAcceptanceTemplate(input: {
  name: string;
  role: string;
  tracks: string;
  signupLink: string;
}): { subject: string; html: string; text: string } {
  const resolvedRole = normalizeRole(input.role);
  const tracks = input.tracks.trim() || "your selected track(s)";
  const signupLink = input.signupLink;

  if (resolvedRole === "Analyst") {
    return {
      subject: "Volta NYC — Analyst Acceptance",
      html: analystEmail(input.name, tracks, signupLink),
      text: `Hi ${input.name},\n\nCongratulations! You've been accepted to Volta NYC as an Analyst on ${tracks}.\n\nYou'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
    };
  }
  if (resolvedRole === "Senior Analyst") {
    return {
      subject: "Volta NYC — Senior Analyst Acceptance",
      html: seniorAnalystEmail(input.name, tracks, signupLink),
      text: `Hi ${input.name},\n\nCongratulations! You've been accepted to Volta NYC as a Senior Analyst on ${tracks}.\n\nYou'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
    };
  }
  if (resolvedRole === "Associate") {
    return {
      subject: "Volta NYC — Associate Acceptance",
      html: associateEmail(input.name, tracks, signupLink),
      text: `Hi ${input.name},\n\nCongratulations! You've been accepted to Volta NYC as an Associate on ${tracks}.\n\nYou'll be assigned to a project within the next week. Based on your application, you're on a clear path for early leadership consideration as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
    };
  }
  if (resolvedRole === "Senior Associate") {
    return {
      subject: "Volta NYC — Senior Associate Acceptance",
      html: seniorAssociateEmail(input.name, tracks, signupLink),
      text: `Hi ${input.name},\n\nCongratulations! You've been accepted to Volta NYC as a Senior Associate on ${tracks}.\n\nYou'll be assigned to a project within the next week. We're bringing you in as a Senior Associate because we trust your ability to lead and see your potential to take on more responsibility as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
    };
  }
  if (resolvedRole === "Project Lead") {
    return {
      subject: "Volta NYC — Project Lead Acceptance",
      html: projectLeadEmail(input.name, tracks, signupLink),
      text: `Hi ${input.name},\n\nCongratulations! We're excited to offer you a Project Lead role at Volta NYC.\n\nYou'll be assigned to lead one of our upcoming projects within the next week. Project Leads are accountable for delivery, quality, and communication. If you have peers you'd like to bring on, feel free to let us know. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
    };
  }

  return {
    subject: "Volta NYC — Analyst Acceptance",
    html: analystEmail(input.name, tracks, signupLink),
    text: `Hi ${input.name},\n\nCongratulations! You've been accepted to Volta NYC as an Analyst on ${tracks}.\n\nYou'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.\n\n${signupLink}\n\nBest,\nEthan Zhang\nVolta NYC`,
  };
}

