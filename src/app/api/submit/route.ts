import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { getAdminDB } from "@/lib/firebaseAdmin";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function upsertBusinessLeadFromContactForm(data: Record<string, unknown>): Promise<void> {
  const db = getAdminDB();
  if (!db) throw new Error("firebase_admin_unavailable");

  const businessName = asText(data.businessName);
  const ownerName = asText(data.name);
  const ownerEmail = asText(data.email).toLowerCase();
  const phone = asText(data.phone);
  const neighborhood = asText(data.neighborhood);
  const services = asText(data.services);
  const message = asText(data.message);
  const language = asText(data.language);

  if (!businessName || !ownerName || !ownerEmail) return;

  const businessesSnap = await db.ref("businesses").get();
  const now = Date.now();
  if (businessesSnap.exists()) {
    const entries = businessesSnap.val() as Record<string, Record<string, unknown>>;
    const duplicateRecent = Object.values(entries).some((entry) => {
      const existingName = asText(entry.name).toLowerCase();
      const existingOwner = asText(entry.ownerName).toLowerCase();
      const existingEmail = asText(entry.ownerEmail).toLowerCase();
      const createdAt = Date.parse(asText(entry.createdAt));
      if (!createdAt) return false;
      const within24h = now - createdAt <= 24 * 60 * 60 * 1000;
      return (
        within24h
        && existingName === businessName.toLowerCase()
        && existingOwner === ownerName.toLowerCase()
        && existingEmail === ownerEmail
      );
    });
    if (duplicateRecent) return;
  }

  const timestamp = new Date(now).toISOString();
  const notesParts = [
    "Website form submission",
    neighborhood ? `Neighborhood: ${neighborhood}` : "",
    phone ? `Phone: ${phone}` : "",
    services ? `Services requested: ${services}` : "",
    language ? `Language: ${language}` : "",
    message ? `Message: ${message}` : "",
  ].filter(Boolean);

  await db.ref("businesses").push({
    name: businessName,
    bidId: "",
    ownerName,
    ownerEmail,
    ownerAlternateEmail: "",
    phone,
    alternatePhone: "",
    address: "",
    neighborhood,
    website: "",
    projectStatus: "Upcoming",
    teamLead: "",
    firstContactDate: timestamp.slice(0, 10),
    notes: notesParts.join("\n"),
    division: "Marketing",
    teamMembers: [],
    sortIndex: now,
    intakeSource: "website_form",
    showcaseEnabled: false,
    showcaseFeaturedOnHome: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function splitToCsv(values: unknown): string {
  if (Array.isArray(values)) {
    return values.map((item) => asText(item)).filter(Boolean).join(", ");
  }
  return asText(values);
}

async function upsertApplicationFromForm(data: Record<string, unknown>): Promise<void> {
  const db = getAdminDB();
  if (!db) throw new Error("firebase_admin_unavailable");

  const fullName = asText(data["Full Name"]);
  const email = asText(data.Email).toLowerCase();
  if (!fullName || !email) return;

  const schoolName = asText(data["School Name"]) || asText(data.Education);
  const cityState = asText(data["City, State"]) || asText(data.City);
  const tracks = splitToCsv(data["Tracks Selected"]);
  const createdAt = new Date().toISOString();

  await db.ref("applications").push({
    fullName,
    email,
    schoolName,
    grade: asText(data.Grade),
    cityState,
    referral: asText(data["How They Heard"]),
    tracksSelected: tracks,
    hasResume: asText(data["Has Resume"]),
    resumeUrl: asText(data["Resume URL"]),
    toolsSoftware: asText(data["Tools/Software"]),
    accomplishment: asText(data.Accomplishment),
    status: "New",
    source: "website_form",
    sourceTimestampRaw: asText(data.Timestamp),
    notes: "",
    createdAt,
    updatedAt: createdAt,
  });
}

async function upsertInquiryFromForm(data: Record<string, unknown>): Promise<void> {
  const db = getAdminDB();
  if (!db) throw new Error("firebase_admin_unavailable");

  const name = asText(data.name);
  const email = asText(data.email).toLowerCase();
  const inquiry = asText(data.inquiry);
  if (!name || !email || !inquiry) return;

  const createdAt = new Date().toISOString();
  await db.ref("inquiries").push({
    name,
    email,
    inquiry,
    source: "website_form",
    createdAt,
    updatedAt: createdAt,
  });
}

type AppsScriptForwardResult = {
  configured: boolean;
  ok: boolean;
  status?: number;
};

async function forwardToAppsScriptBackup(data: Record<string, unknown>): Promise<AppsScriptForwardResult> {
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  if (!url) return { configured: false, ok: false };
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow",
    });
    if (!upstream.ok) {
      console.error("apps_script_backup_failed", upstream.status);
      return { configured: true, ok: false, status: upstream.status };
    }
    return { configured: true, ok: true, status: upstream.status };
  } catch (err) {
    console.error("apps_script_backup_unreachable", err);
    return { configured: true, ok: false };
  }
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const formType = typeof data.formType === "string" ? data.formType : "";
  const isKnownFormType = formType === "application" || formType === "contact" || formType === "inquiry";
  if (!isKnownFormType) {
    return NextResponse.json({ error: "unknown_form_type" }, { status: 400 });
  }

  const ip = getClientIp(request.headers);

  const ipLimit = Number(process.env.FORM_RATE_LIMIT_PER_IP ?? 8);
  const ipWindowSec = Number(process.env.FORM_RATE_LIMIT_WINDOW_SEC ?? 3600);
  const ipCheck = await consumeRateLimit({
    bucket: "form-ip",
    key: ip,
    limit: ipLimit,
    windowSec: ipWindowSec,
  });
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "too_many_requests", retryAfterSec: ipCheck.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } }
    );
  }

  const email =
    (typeof data.Email === "string" && data.Email)
    || (typeof data.email === "string" && data.email)
    || "";
  if (email) {
    const emailLimit = Number(process.env.FORM_RATE_LIMIT_PER_EMAIL ?? 5);
    const emailWindowSec = Number(process.env.FORM_RATE_LIMIT_WINDOW_SEC ?? 3600);
    const emailCheck = await consumeRateLimit({
      bucket: "form-email",
      key: email.trim().toLowerCase(),
      limit: emailLimit,
      windowSec: emailWindowSec,
    });
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: "too_many_requests", retryAfterSec: emailCheck.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } }
      );
    }
  }

  let firebaseWriteFailed = false;

  if (formType === "contact") {
    try {
      await upsertBusinessLeadFromContactForm(data);
    } catch {
      firebaseWriteFailed = true;
    }
  }

  if (formType === "application") {
    try {
      await upsertApplicationFromForm(data);
    } catch {
      firebaseWriteFailed = true;
    }
  }

  if (formType === "inquiry") {
    try {
      await upsertInquiryFromForm(data);
    } catch {
      firebaseWriteFailed = true;
    }
  }

  // Always attempt the Google Sheets forward, especially if Firebase write fails.
  const sheetsForward = await forwardToAppsScriptBackup(data);

  if (firebaseWriteFailed) {
    if (sheetsForward.ok) {
      return NextResponse.json({
        success: true,
        stored: "sheets_backup_only",
      });
    }
    return NextResponse.json(
      {
        error: "storage_failed",
        firebase: "write_failed",
        sheets: sheetsForward.configured ? "forward_failed" : "not_configured",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    sheetsBackupForwarded: sheetsForward.ok,
  });
}
