import { NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebaseAdmin";
import { resolveInterviewZoomSettings } from "@/lib/interviews/config";

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "";

async function dbGet(path: string): Promise<unknown> {
  const db = getAdminDB();
  if (db) {
    const snap = await db.ref(path).get();
    return snap.exists() ? snap.val() : null;
  }
  if (!DB_URL) return null;
  const res = await fetch(`${DB_URL}/${path}.json`, { cache: "no-store" });
  if (!res.ok || res.status === 404) return null;
  const data = await res.json() as unknown;
  return data ?? null;
}

export async function GET() {
  let settingsData: unknown = null;
  try {
    settingsData = await dbGet("interviewSettings");
  } catch {
    settingsData = null;
  }

  const effective = resolveInterviewZoomSettings(settingsData, process.env.INTERVIEW_ZOOM_LINK ?? "");
  const settings = (settingsData && typeof settingsData === "object") ? (settingsData as Record<string, unknown>) : {};
  const customZoomLink = typeof settings.zoomLink === "string" ? settings.zoomLink.trim() : "";

  return NextResponse.json({
    zoomLink: effective.zoomLink,
    zoomEnabled: effective.zoomEnabled,
    source: effective.source,
    customZoomLink,
  });
}
