import { NextResponse } from "next/server";
import { dbRead } from "@/lib/server/adminApi";

// Public endpoint — no auth required. Returns the deduplicated, sorted list
// of neighborhoods derived from all businesses in the database. Used by the
// public contact form to populate the neighborhood datalist.

type BusinessRow = { neighborhood?: string; showcaseNeighborhood?: string };

export async function GET() {
  try {
    const data = await dbRead("businesses") as Record<string, BusinessRow> | null;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ neighborhoods: [] });
    }

    const seen = new Set<string>();
    for (const row of Object.values(data)) {
      const raw = String(row?.neighborhood ?? row?.showcaseNeighborhood ?? "").trim();
      if (!raw) continue;
      // Strip borough suffix (e.g. "Park Slope, Brooklyn" → "Park Slope")
      const commaIdx = raw.indexOf(",");
      const clean = commaIdx >= 0 ? raw.slice(0, commaIdx).trim() : raw;
      if (clean) seen.add(clean);
    }

    const neighborhoods = Array.from(seen).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ neighborhoods }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ neighborhoods: [] });
  }
}
