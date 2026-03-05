import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller, writeAuditLog } from "@/lib/server/adminApi";
import { resolveInterviewZoomSettings } from "@/lib/interviews/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseSettingsPayload(raw: unknown): {
  zoomLink: string;
  zoomEnabled: boolean;
  updatedAt: number;
  updatedBy: string;
} {
  const data = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};
  const zoomLink = typeof data.zoomLink === "string" ? data.zoomLink.trim() : "";
  return {
    zoomLink,
    zoomEnabled: true,
    updatedAt: Date.now(),
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy.trim() : "",
  };
}

export async function GET() {
  let settingsData: unknown = null;
  try {
    settingsData = await dbRead("interviewSettings");
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

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  const { caller } = verified;

  const body = await req.json().catch(() => ({}));
  const payload = parseSettingsPayload(body);
  payload.updatedBy = caller.uid;

  try {
    await dbPatch("interviewSettings", payload, caller.idToken);
    await writeAuditLog({
      action: "update",
      collection: "interviewSettings",
      recordId: "singleton",
      actorUid: caller.uid,
      actorEmail: caller.email || "unknown",
      actorName: caller.name || "",
      details: { fields: Object.keys(payload) },
    }, caller.idToken).catch(() => {});
  } catch {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  let settingsData: unknown = null;
  try {
    settingsData = await dbRead("interviewSettings", caller.idToken);
  } catch {
    settingsData = payload;
  }

  const effective = resolveInterviewZoomSettings(settingsData, process.env.INTERVIEW_ZOOM_LINK ?? "");
  const settings = (settingsData && typeof settingsData === "object") ? (settingsData as Record<string, unknown>) : {};
  const customZoomLink = typeof settings.zoomLink === "string" ? settings.zoomLink.trim() : "";

  return NextResponse.json({
    success: true,
    zoomLink: effective.zoomLink,
    zoomEnabled: effective.zoomEnabled,
    source: effective.source,
    customZoomLink,
  });
}
