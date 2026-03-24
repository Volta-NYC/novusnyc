import { NextRequest, NextResponse } from "next/server";
import { dbRead, verifyCaller } from "@/lib/server/adminApi";

const EXPORT_SECTION_PATHS = {
  businesses: "businesses",
  projects: "projects",
  financeAssignments: "financeAssignments",
  members: "team",
  applicants: "applications",
  bids: "bids",
  interviews: "interviewSlots",
  grants: "grants",
  calendar: "calendarEvents",
  users: "userProfiles",
  inviteCodes: "inviteCodes",
  interviewInvites: "interviewInvites",
} as const;

type ExportSection = keyof typeof EXPORT_SECTION_PATHS;

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const sectionsParam = req.nextUrl.searchParams.get("sections") ?? "";
  const requestedSections = Array.from(
    new Set(
      sectionsParam
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ).filter((section): section is ExportSection => section in EXPORT_SECTION_PATHS);

  if (requestedSections.length === 0) {
    let rootData: unknown = null;
    try {
      rootData = await dbRead("", verified.caller.idToken);
    } catch {
      return NextResponse.json({ error: "read_failed" }, { status: 500 });
    }

    const payload = rootData && typeof rootData === "object" ? (rootData as Record<string, unknown>) : {};
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      ...payload,
    });
  }

  const sectionEntries = await Promise.all(
    requestedSections.map(async (section) => {
      const path = EXPORT_SECTION_PATHS[section];
      try {
        const value = await dbRead(path, verified.caller.idToken);
        return [section, value] as const;
      } catch {
        return [section, { __error: "read_failed" }] as const;
      }
    }),
  );

  const payload = Object.fromEntries(sectionEntries);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    sections: requestedSections,
    ...payload,
  });
}
