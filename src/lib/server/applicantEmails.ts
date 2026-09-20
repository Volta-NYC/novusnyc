function wrapper(content: string): string {
  return `${content}`;
}

// Used when the accepted applicant already has a confirmed portal account —
// they don't need a new invite link, just notification of acceptance.
function confirmedAccountAcceptanceEmail(name: string): string {
  const firstName = name.split(" ")[0] || name;
  return wrapper(
    `<p>Hi ${firstName},</p>` +
      `<p>Congratulations! You've been accepted to Novus NYC.</p>` +
      `<p>You'll be assigned to a project within the next week. Your team, tasks, and project details are organized in the member portal — sign in at <a href="https://www.novusnyc.org/members">novusnyc.org/members</a>.</p>` +
      `<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`
  );
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
      "You'll be assigned to a project within the next week. Your team, tasks, and project details are organized in the member portal — sign in at https://www.novusnyc.org/members.",
      "",
      "Best,",
      "Ethan Zhang",
      "Novus NYC",
    ].join("\n"),
  };
}
