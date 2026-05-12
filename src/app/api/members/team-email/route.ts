import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { createTransportForFrom, getDefaultFromAddress, getDefaultReplyToAddress, resolveFromWithName } from "@/lib/server/smtp";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHtmlBody(input: string): string {
  const trimmed = input.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return trimmed;
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:0;background:#ffffff;color:#202124;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">',
    trimmed,
    "</body></html>",
  ].join("");
}

function applyPlaceholders(input: string, meta: Record<string, string>): string {
  return input.replace(/\{\{\s*(firstName|fullName|memberName|school|grade|projects|assignmentTitle|assignmentCode|finalDeadline|region)\s*\}\}/g, (_match, key: string) => {
    if (key === "firstName") {
      return (meta.firstName || meta.fullName || meta.memberName || "").split(/\s+/)[0] ?? "";
    }
    return meta[key] ?? "";
  });
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const formData = await req.formData();
  const requestedFrom = normalizeEmail(String(formData.get("fromAddress") ?? ""));
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const contentMode: "plain" | "html" = formData.get("contentMode") === "plain" ? "plain" : "html";
  const incomingTo = formData.getAll("toRecipients").map(String);
  const incomingCc = formData.getAll("ccRecipients").map(String);
  const incomingBcc = formData.getAll("bccRecipients").map(String);
  const recipientMeta = new Map<string, Record<string, string>>();
  for (const rawMeta of formData.getAll("recipientMeta").map(String)) {
    try {
      const parsed = JSON.parse(rawMeta) as Record<string, unknown>;
      const email = normalizeEmail(String(parsed.email ?? ""));
      if (!email || !isValidEmail(email)) continue;
      recipientMeta.set(email, Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value ?? "")])
      ));
    } catch {
      // Ignore malformed optional metadata.
    }
  }
  // Handle attachments
  const attachmentFiles = formData.getAll("attachments").filter(
    (v): v is File => v instanceof File && v.size > 0,
  );
  const attachments = await Promise.all(
    attachmentFiles.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    })),
  );

  if (!subject || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const dedupeEmails = (emails: string[]) =>
    Array.from(
      new Set(
        emails
          .map((email) => normalizeEmail(String(email ?? "")))
          .filter((email) => email && isValidEmail(email))
      )
    );

  const dedupedTo = dedupeEmails(incomingTo);
  const dedupedCc = dedupeEmails(incomingCc);
  const dedupedBcc = dedupeEmails(incomingBcc);

  const totalRecipients = dedupedTo.length + dedupedCc.length + dedupedBcc.length;

  if (totalRecipients === 0) {
    return NextResponse.json({ error: "no_recipients" }, { status: 400 });
  }
  if (totalRecipients > 400) {
    return NextResponse.json({ error: "too_many_recipients" }, { status: 400 });
  }

  const allowedFrom = Array.from(
    new Set(
      String(process.env.TEAM_EMAIL_ALLOWED_FROM ?? "info@voltanyc.org,ethan@voltanyc.org")
        .split(",")
        .map((value) => normalizeEmail(value))
        .filter((value) => value && isValidEmail(value))
    )
  );
  const defaultFrom = normalizeEmail(getDefaultFromAddress());
  const selectedFrom = requestedFrom || defaultFrom || allowedFrom[0] || "";
  if (!allowedFrom.includes(selectedFrom)) {
    return NextResponse.json({ error: "from_not_allowed" }, { status: 400 });
  }

  let transporter: ReturnType<typeof createTransportForFrom>["transporter"];
  try {
    transporter = createTransportForFrom(selectedFrom).transporter;
  } catch {
    return NextResponse.json({ error: "smtp_not_configured" }, { status: 500 });
  }

  const from = resolveFromWithName(selectedFrom);
  const replyTo = getDefaultReplyToAddress(selectedFrom);
  const textBody = contentMode === "html"
    ? stripHtml(message)
    : message;
  const htmlBody = contentMode === "html"
    ? normalizeHtmlBody(message)
    : message.replace(/\n/g, "<br/>");

  const fallbackToAddress = dedupedTo.length > 0 ? undefined : selectedFrom;
  const hasPlaceholders = /\{\{\s*\w+\s*\}\}/.test(subject) || /\{\{\s*\w+\s*\}\}/.test(message);

  try {
    if (hasPlaceholders && recipientMeta.size > 0) {
      const allRecipients = Array.from(new Set([...dedupedTo, ...dedupedCc, ...dedupedBcc]));
      for (const recipient of allRecipients) {
        const meta = recipientMeta.get(recipient) ?? { email: recipient };
        const renderedSubject = applyPlaceholders(subject, meta);
        const renderedMessage = applyPlaceholders(message, meta);
        const renderedText = contentMode === "html" ? stripHtml(renderedMessage) : renderedMessage;
        const renderedHtml = contentMode === "html" ? normalizeHtmlBody(renderedMessage) : renderedMessage.replace(/\n/g, "<br/>");
        // eslint-disable-next-line no-await-in-loop
        await transporter.sendMail({
          from,
          replyTo,
          to: recipient,
          subject: renderedSubject,
          text: renderedText,
          html: renderedHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    } else {
    await transporter.sendMail({
      from,
      replyTo,
      to: fallbackToAddress ?? dedupedTo,
      cc: dedupedCc.length > 0 ? dedupedCc : undefined,
      bcc: dedupedBcc.length > 0 ? dedupedBcc : undefined,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    }
  } catch (err) {
    console.error("Bulk email error:", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sent: totalRecipients,
    counts: {
      to: dedupedTo.length,
      cc: dedupedCc.length,
      bcc: dedupedBcc.length,
    },
    failed: [],
    from: selectedFrom,
  });
}
