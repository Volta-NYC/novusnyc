import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

type AppRow = Record<string, unknown>;
type SlotRow = Record<string, unknown>;

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
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

function normalizeName(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
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

const TERMINAL_APPLICATION_STATUSES = new Set(["accepted", "not accepted", "rejected"]);

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => ({} as { dryRun?: boolean }));
  const dryRun = !!body?.dryRun;

  const [appsData, slotsData] = await Promise.all([
    dbRead("applications", verified.caller.idToken),
    dbRead("interviewSlots", verified.caller.idToken),
  ]);

  const apps = (appsData ?? {}) as Record<string, AppRow>;
  const slots = (slotsData ?? {}) as Record<string, SlotRow>;

  const bookedSlots = Object.entries(slots)
    .map(([id, row]) => ({ id, row: row ?? {} }))
    .filter(({ row }) => !row.available && !!String(row.bookedBy ?? "").trim());

  let patched = 0;
  let skipped = 0;

  for (const [appId, app] of Object.entries(apps)) {
    const existingSlotId = String(app.interviewSlotId ?? "").trim();
    if (existingSlotId) {
      skipped += 1;
      continue;
    }

    const appEmail = normalize(app.email);
    const appCanonical = canonicalEmail(appEmail);
    const appName = String(app.fullName ?? "");
    const appToken = normalize(app.interviewInviteToken);

    const match = bookedSlots.find(({ row }) => {
      const slotToken = normalize(row.bookedBy);
      if (appToken && slotToken && appToken === slotToken) return true;

      const slotEmail = normalize(row.bookerEmail);
      const slotCanonical = canonicalEmail(slotEmail);
      if (appEmail && slotEmail && (appEmail === slotEmail || appCanonical === slotCanonical)) return true;

      const slotName = String(row.bookerName ?? "");
      if (appName && slotName && namesLikelyMatch(appName, slotName)) return true;
      return false;
    });

    if (!match) {
      skipped += 1;
      continue;
    }

    const currentStatus = normalize(app.status);
    const patch: Record<string, unknown> = {
      interviewSlotId: match.id,
      interviewScheduledAt: String(match.row.datetime ?? ""),
      updatedAt: new Date().toISOString(),
    };
    if (!app.statusManualOverride && !TERMINAL_APPLICATION_STATUSES.has(currentStatus)) {
      patch.status = "Interview Scheduled";
    }

    if (!dryRun) {
      await dbPatch(`applications/${appId}`, patch, verified.caller.idToken);
    }
    patched += 1;
  }

  return NextResponse.json({
    success: true,
    dryRun,
    patched,
    skipped,
    totalApplications: Object.keys(apps).length,
    totalBookedSlots: bookedSlots.length,
  });
}
