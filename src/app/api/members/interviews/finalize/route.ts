import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbPush, dbRead, verifyCaller } from "@/lib/server/adminApi";
import {
  createTransportForFrom,
  getDefaultFromAddress,
  getDefaultReplyToAddress,
  resolveFromWithName,
} from "@/lib/server/smtp";
import { buildConfirmedAccountAcceptanceTemplate } from "@/lib/server/applicantEmails";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { promoteApplicantToMember } from "@/lib/server/promoteMember";

type FinalizeBody = {
  slotIds?: string[];
  teamRole?: string;
  sendAcceptanceEmail?: boolean;
  fromAddress?: string;
  notes?: string;
};

type SlotRecord = Record<string, unknown>;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalEmail(value: unknown): string {
  const raw = normalize(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function namesLikelyMatch(a: unknown, b: unknown): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const lt = new Set(left.split(" ").filter(Boolean));
  const rt = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  lt.forEach((token) => {
    if (rt.has(token)) overlap += 1;
  });
  return overlap >= 2;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sendAcceptanceEmail(input: {
  fromAddress?: string;
  to: string;
  applicantName: string;
  baseUrl: string;
}) {
  const sb = getSupabaseAdmin();

  // Check if email already has a confirmed auth account.
  let confirmedAccountExists = false;
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === input.to.toLowerCase());
    confirmedAccountExists = !!(match?.email_confirmed_at);
  } catch { /* treat as unconfirmed */ }

  if (confirmedAccountExists) {
    const from = normalizeEmail(getDefaultFromAddress());
    const transporter = createTransportForFrom(from).transporter;
    const tpl = buildConfirmedAccountAcceptanceTemplate({ name: input.applicantName });
    await transporter.sendMail({
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      to: input.to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    });
  } else {
    await sb.auth.admin.inviteUserByEmail(input.to, {
      redirectTo: `${input.baseUrl}/members/signup`,
      data: { full_name: input.applicantName },
    });
  }
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as FinalizeBody;
  const slotIds = Array.isArray(body.slotIds) ? body.slotIds.map((id) => String(id ?? "").trim()).filter(Boolean) : [];
  if (slotIds.length === 0) return NextResponse.json({ error: "missing_slot_ids" }, { status: 400 });

  const teamRole = (body.teamRole ?? "").trim() || "Member";
  const sendEmail = !!body.sendAcceptanceEmail;
  const notes = (body.notes ?? "").trim();
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? "https://www.novusnyc.org").trim();

  const [slotsData, applicationsData] = await Promise.all([
    dbRead("interviewSlots"),
    dbRead("applications"),
  ]);
  const slots = (slotsData ?? {}) as Record<string, SlotRecord>;
  const applications = (applicationsData ?? {}) as Record<string, Record<string, unknown>>;

  const appEntries = Object.entries(applications).map(([id, row]) => ({ id, row: row ?? {} }));
  const done: string[] = [];
  const failed: string[] = [];

  for (const slotId of slotIds) {
    const slot = slots[slotId];
    if (!slot || !slot.bookedBy || !slot.bookerEmail) {
      failed.push(slotId);
      continue;
    }
    const slotEmail = normalize(slot.bookerEmail);
    const slotCanonical = canonicalEmail(slot.bookerEmail);
    const slotName = slot.bookerName;
    const slotToken = normalize(slot.bookedBy);

    let target = appEntries.find(({ row }) => normalize(row.interviewSlotId) === normalize(slotId)) ?? null;
    if (!target && slotToken && slotToken !== "public-booking") {
      target = appEntries.find(({ row }) => normalize(row.interviewInviteToken) === slotToken) ?? null;
    }
    if (!target) {
      target = appEntries.find(({ row }) => {
        const em = normalize(row.email);
        return em && (em === slotEmail || canonicalEmail(row.email) === slotCanonical);
      }) ?? null;
    }
    if (!target) {
      target = appEntries.find(({ row }) => namesLikelyMatch(row.fullName, slotName)) ?? null;
    }

    let appId = "";
    let fullName = String(slot.bookerName ?? "").trim() || "Applicant";
    let email = String(slot.bookerEmail ?? "").trim().toLowerCase();
    let schoolName = "";
    let grade = "";
    let tracks = "";
    if (target) {
      appId = target.id;
      fullName = String(target.row.fullName ?? "").trim() || fullName;
      email = String(target.row.email ?? "").trim().toLowerCase() || email;
      schoolName = String(target.row.schoolName ?? "").trim();
      grade = String(target.row.grade ?? "").trim();
      tracks = String(target.row.tracksSelected ?? "").trim();
    } else {
      const createdAt = new Date().toISOString();
      appId = await dbPush("applications", {
        fullName,
        email,
        schoolName: "",
        grade: "",
        cityState: "",
        referral: "",
        tracksSelected: "",
        hasResume: "",
        resumeUrl: "",
        toolsSoftware: "",
        accomplishment: "",
        status: "Interview Scheduled",
        notes: "",
        interviewSlotId: slotId,
        interviewScheduledAt: String(slot.datetime ?? ""),
        source: "manual",
        createdAt,
        updatedAt: createdAt,
      });
    }

    if (!appId || !email) {
      failed.push(slotId);
      continue;
    }

    await dbPatch(`applications/${appId}`, {
      status: "Accepted",
      finalDecisionRole: teamRole,
      interviewSlotId: slotId,
      interviewScheduledAt: String(slot.datetime ?? ""),
      notes: notes || String(target?.row.notes ?? ""),
      updatedAt: new Date().toISOString(),
    });

    await promoteApplicantToMember({
      fullName,
      email,
      schoolName,
      grade,
      tracksSelected: tracks,
      role: teamRole,
      source: "Added from completed interview",
      applicationId: appId,
      decidedBy: verified.caller.email ?? "",
    });

    if (sendEmail) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await sendAcceptanceEmail({
          fromAddress: body.fromAddress,
          to: email,
          applicantName: fullName,
          baseUrl,
        });
      } catch {
        // continue pipeline even if email fails
      }
    }
    done.push(slotId);
  }

  return NextResponse.json({ success: true, finalized: done.length, failed, finalizedSlotIds: done });
}
