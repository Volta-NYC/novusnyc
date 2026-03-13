import { NextResponse } from "next/server";
import { dbRead, dbPatch } from "@/lib/server/adminApi";

function normalizeName(value: string): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeEmail(value: string): string {
  return (value || "").trim().toLowerCase();
}

function canonicalEmail(value: string): string {
  const raw = normalizeEmail(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function namesLikelyMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const lt = new Set(left.split(" ").filter(Boolean));
  const rt = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  lt.forEach((token) => { if (rt.has(token)) overlap += 1; });
  return overlap >= 2;
}

type AppRow = Record<string, unknown>;
type SlotRow = Record<string, unknown>;

function matchSlotToApp(slot: SlotRow & { id: string }, appsMap: Record<string, AppRow>): string | null {
  const bookedBy = String(slot.bookedBy ?? "").trim();
  const slotEmail = normalizeEmail(String(slot.bookerEmail ?? ""));
  const slotCanonical = canonicalEmail(slotEmail);
  const slotName = String(slot.bookerName ?? "");

  for (const [appId, row] of Object.entries(appsMap)) {
    const appToken = String(row.interviewInviteToken ?? "").trim();
    // Already linked? skip
    if (String(row.interviewSlotId ?? "").trim() === slot.id) return appId;
    // Token match
    if (bookedBy && appToken && bookedBy === appToken) return appId;
    // Email match
    const appEmail = normalizeEmail(String(row.email ?? row["Email"] ?? ""));
    if (slotEmail && appEmail && (slotEmail === appEmail || slotCanonical === canonicalEmail(appEmail))) return appId;
    // Name match
    const appName = String(row.fullName ?? row["Full Name"] ?? row.name ?? "");
    if (slotName && appName && namesLikelyMatch(slotName, appName)) return appId;
  }
  return null;
}

export async function GET() {
  try {
    const [appsData, slotsData] = await Promise.all([
      dbRead("applications"),
      dbRead("interviewSlots"),
    ]);
    const appsMap = (appsData || {}) as Record<string, AppRow>;
    const slotsMap = (slotsData || {}) as Record<string, SlotRow>;

    const results: string[] = [];

    // ── 1. Backfill manual notes + status for four specific candidates ──
    const targets = [
      {
        name: "Marcus A Pena Herrera",
        notes: "Marcus A Pena Herrera - ✅\nLooks like a strong coder, easy to talk with, willing to adapt to schedule, should be let in",
        status: "Interview Completed",
      },
      {
        name: "Sophia Chang",
        notes: "Sophia Chang -  ✅+\nMarketing plus finances- aspirations of being a Econ major and does photoshop for a hobby which would be very useful - would accept to both with maybe a higher role in marketing as it seems more useful",
        status: "Interview Completed",
      },
      {
        name: "Sanari Hossain",
        notes: "Sanari Hossain - ⏹️\nMarketing- has had past social media experience- edits videos based in past along with leadership seems like a good fit however; very timid when speaking and not very elaborative, could be an empty person in a group or a team leader it's your call",
        status: "Interview Completed",
      },
      {
        name: "Vivian Hoelscher",
        notes: "Vivian Hoelscher \nDigital & Tech - Interested in CS, willing to learn. Has experience in Netlogo, Python, and the Linux/Unix shell & takes very advanced coursework. Speaks clearly and easy to talk to",
        status: "Interview Completed",
      },
    ];

    for (const target of targets) {
      let matchedId: string | null = null;
      let matchedName = "";
      for (const [id, row] of Object.entries(appsMap)) {
        const rowName = String(row.fullName || row["Full Name"] || row.name || "");
        if (namesLikelyMatch(rowName, target.name)) {
          matchedId = id;
          matchedName = rowName;
          break;
        }
      }
      if (matchedId) {
        await dbPatch(`applications/${matchedId}`, {
          notes: target.notes,
          status: target.status,
          statusManualOverride: true,
          updatedAt: new Date().toISOString(),
        });
        results.push(`Notes/status updated: ${matchedName} (${matchedId})`);
      } else {
        results.push(`Could NOT find applicant for: ${target.name}`);
      }
    }

    // ── 2. Link all booked slots to their matching application ──
    let linkedCount = 0;
    let skippedCount = 0;
    for (const [slotId, slot] of Object.entries(slotsMap)) {
      // Only process booked slots
      if (!slot.bookedBy && !slot.bookerEmail) { skippedCount++; continue; }
      const slotWithId = { ...slot, id: slotId };
      const appId = matchSlotToApp(slotWithId, appsMap);
      if (appId) {
        const existing = String(appsMap[appId]?.interviewSlotId ?? "").trim();
        if (existing !== slotId) {
          await dbPatch(`applications/${appId}`, {
            interviewSlotId: slotId,
            interviewScheduledAt: String(slot.datetime ?? "").trim() || undefined,
            updatedAt: new Date().toISOString(),
          });
          linkedCount++;
          const appName = String(appsMap[appId]?.fullName ?? appsMap[appId]?.["Full Name"] ?? "?");
          results.push(`Linked slot ${slotId} → ${appName} (${appId})`);
        }
      }
    }
    results.push(`Slot linking complete — ${linkedCount} linked, ${skippedCount} unbooked slots skipped.`);

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}
