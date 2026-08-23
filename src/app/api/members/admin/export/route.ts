import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { EXPORT_SECTIONS, type ExportSectionKey } from "@/lib/members/exportSections";

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
  ).filter((k): k is ExportSectionKey => EXPORT_SECTIONS.some((s) => s.key === k));

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
