import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { EXPORT_SECTIONS, type ExportSectionKey } from "@/lib/members/exportSections";

async function fetchTable(table: string): Promise<unknown[]> {
  const sb = getSupabaseAdmin();
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
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

  let entries: ReadonlyArray<readonly [ExportSectionKey, unknown[]]>;
  try {
    entries = await Promise.all(
      sectionsToExport.map(async (section) => [section.key, await fetchTable(section.table)] as const),
    );
  } catch (error) {
    console.error("Admin backup failed", error);
    return NextResponse.json({ error: "backup_read_failed" }, { status: 500 });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    sections: sectionsToExport.map((s) => s.key),
    ...Object.fromEntries(entries),
  });
}
