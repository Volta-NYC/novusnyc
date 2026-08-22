import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Each entry is a { label, table } pair. `table` is the exact Supabase table name.
const EXPORT_SECTIONS = [
  { key: "team",                  label: "Team Members",            table: "team" },
  { key: "userProfiles",          label: "User Profiles",           table: "user_profiles" },
  { key: "businesses",            label: "Businesses",              table: "businesses" },
  { key: "assignments",           label: "Assignments",             table: "assignments" },
  { key: "applicants",            label: "Applicants",              table: "applications" },
  { key: "bids",                  label: "BID Directory",           table: "bids" },
  { key: "memberStrikes",         label: "Member Strikes",          table: "member_strikes" },
  { key: "emailTemplates",        label: "Email Templates",         table: "email_templates" },
  { key: "calendarEvents",        label: "Calendar Events",         table: "calendar_events" },
  { key: "handbookPages",         label: "Handbook Pages",          table: "handbook_pages" },
  { key: "auditLogs",             label: "Audit Logs",              table: "audit_logs" },
  // The pod/hours system is where the work is recorded now, so a "full" export
  // that omitted it was not a full export.
  { key: "chapters",              label: "Chapters",                table: "chapters" },
  { key: "pods",                  label: "Pods",                    table: "pods" },
  { key: "podMembers",            label: "Pod Memberships",         table: "pod_members" },
  { key: "podMeetings",           label: "Pod Meetings",            table: "pod_meetings" },
  { key: "podAttendance",         label: "Pod Attendance",          table: "pod_attendance" },
  { key: "hoursAdjustments",      label: "Hours Adjustments",       table: "hours_adjustments" },
  { key: "infractions",           label: "Infractions",             table: "infractions" },
  { key: "automationConfigs",     label: "Automation Config",       table: "automation_configs" },
] as const;

type ExportKey = (typeof EXPORT_SECTIONS)[number]["key"];

async function fetchTable(table: string): Promise<unknown[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from(table).select("*").order("id" as never);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const sectionsParam = req.nextUrl.searchParams.get("sections") ?? "";
  const requestedKeys = Array.from(
    new Set(
      sectionsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).filter((k): k is ExportKey => EXPORT_SECTIONS.some((s) => s.key === k));

  const sectionsToExport = requestedKeys.length > 0
    ? EXPORT_SECTIONS.filter((s) => requestedKeys.includes(s.key))
    : [...EXPORT_SECTIONS];

  const entries = await Promise.all(
    sectionsToExport.map(async (section) => {
      try {
        const rows = await fetchTable(section.table);
        return [section.key, rows] as const;
      } catch {
        return [section.key, { __error: "read_failed" }] as const;
      }
    }),
  );

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    sections: sectionsToExport.map((s) => s.key),
    ...Object.fromEntries(entries),
  });
}
