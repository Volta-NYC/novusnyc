import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createTransportForFrom, resolveFromWithName, getDefaultReplyToAddress } from "@/lib/server/smtp";
import { renderTemplate } from "@/lib/server/emailTemplates";

export const runtime = "nodejs";

const DEFAULT_SUBJECT = "Update on {{assignmentTitle}}";
const DEFAULT_BODY = `<p>Hi {{memberName}},</p>
<p>Your team posted an update on the assignment <strong>{{assignmentTitle}}</strong>{{businessNamePart}}.</p>
<div style="margin:16px 0;padding:14px 18px;border-left:3px solid #85CC17;background:#f9fdf5;color:#1a1a1a;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;">{{messageFmt}}</div>
<p><a href="{{portalLink}}" style="color:#5c9911;font-weight:600;">View in portal →</a></p>`;

function normalizeHtmlBody(input: string): string {
  const trimmed = input.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return trimmed;
  return [
    "<!doctype html>",
    '<html><body style="margin:0;padding:32px 24px;background:#ffffff;color:#202124;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;max-width:560px;">',
    trimmed,
    "</body></html>",
  ].join("");
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { assignmentId, message } = body as Record<string, unknown>;

  if (!assignmentId || typeof assignmentId !== "string") {
    return NextResponse.json({ error: "missing_assignment_id" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  const { data: assignment } = await sb
    .from("assignments")
    .select("id, title, business_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
  }

  const rec = assignment as Record<string, unknown>;

  let businessName = "";
  if (rec.business_id) {
    const { data: biz } = await sb
      .from("businesses")
      .select("name")
      .eq("id", rec.business_id as string)
      .maybeSingle();
    businessName = (biz as Record<string, unknown> | null)?.name as string ?? "";
  }

  // Persist the update — admin client bypasses RLS.
  const updateId = crypto.randomUUID();
  const { error: insertError } = await sb.from("assignment_updates").insert({
    id: updateId,
    assignment_id: assignmentId,
    message: message.trim(),
    posted_by: verified.caller.email,
    posted_at: new Date().toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Find active claimants (not rejected, not Approved — they're done).
  const { data: claims } = await sb
    .from("assignment_claims")
    .select("member_id, member_name, status")
    .eq("assignment_id", assignmentId)
    .neq("status", "rejected")
    .neq("status", "Approved");

  if (!claims || claims.length === 0) {
    return NextResponse.json({ saved: true, updateId, emailsSent: 0, emailsSkipped: 0 });
  }

  const memberIds = [...new Set((claims as Record<string, unknown>[]).map((c) => c.member_id as string))];
  const { data: teamRows } = await sb
    .from("team")
    .select("id, email, name")
    .in("id", memberIds)
    .is("deleted_at", null);

  const memberEmailMap = new Map<string, { email: string; name: string }>();
  for (const t of (teamRows ?? []) as Record<string, unknown>[]) {
    if (t.id && t.email) {
      memberEmailMap.set(t.id as string, {
        email: t.email as string,
        name: t.name as string ?? "",
      });
    }
  }

  // Look up the assignment_update automation config + linked template.
  const { data: automationRow } = await sb
    .from("automation_configs")
    .select("template_key, enabled")
    .eq("automation_id", "assignment_update")
    .maybeSingle();

  let subjectTpl = DEFAULT_SUBJECT;
  let bodyTpl = DEFAULT_BODY;

  const ar = automationRow as Record<string, unknown> | null;
  if (ar?.enabled && ar.template_key) {
    const { data: tplRow } = await sb
      .from("email_templates")
      .select("subject, body")
      .eq("key", ar.template_key as string)
      .maybeSingle();
    const tr = tplRow as Record<string, unknown> | null;
    if (tr?.subject && tr?.body) {
      subjectTpl = tr.subject as string;
      bodyTpl = tr.body as string;
    }
  }

  let emailsSent = 0;
  let emailsSkipped = 0;

  try {
    const { transporter } = createTransportForFrom("info@voltanyc.org");
    const from = resolveFromWithName("info@voltanyc.org");
    const replyTo = getDefaultReplyToAddress("info@voltanyc.org");
    const portalLink = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltanyc.org"}/members/work/${assignmentId}`;
    const messageTrimmed = message.trim();
    const messageFmt = messageTrimmed.replace(/\n/g, "<br>");

    for (const claim of claims as Record<string, unknown>[]) {
      const memberId = claim.member_id as string;
      const info = memberEmailMap.get(memberId);
      if (!info?.email) { emailsSkipped++; continue; }

      const vars: Record<string, string> = {
        memberName: info.name || (claim.member_name as string) || "Member",
        assignmentTitle: rec.title as string ?? "",
        message: messageTrimmed,
        messageFmt,
        businessName,
        businessNamePart: businessName ? ` (${businessName})` : "",
        assignmentId,
        portalLink,
      };

      const subject = renderTemplate(subjectTpl, vars);
      const bodyHtml = renderTemplate(bodyTpl, vars);

      try {
        // eslint-disable-next-line no-await-in-loop
        await transporter.sendMail({
          from,
          replyTo,
          to: info.email,
          subject,
          text: messageTrimmed,
          html: normalizeHtmlBody(bodyHtml),
        });
        emailsSent++;
      } catch {
        emailsSkipped++;
      }
    }
  } catch {
    emailsSkipped = claims.length;
  }

  return NextResponse.json({ saved: true, updateId, emailsSent, emailsSkipped });
}
