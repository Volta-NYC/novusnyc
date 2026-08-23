import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeSearch(value: string): string {
  return value.replace(/[^a-zA-Z0-9@._\-\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const page = Math.max(0, Number.parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10) || 0);
  const exportAll = req.nextUrl.searchParams.get("export") === "1";
  const limit = Math.min(200, Math.max(25, Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100));
  const action = safeSearch(req.nextUrl.searchParams.get("action") ?? "");
  const collection = safeSearch(req.nextUrl.searchParams.get("collection") ?? "");
  const search = safeSearch(req.nextUrl.searchParams.get("search") ?? "");

  const sb = getSupabaseAdmin();
  const makeQuery = () => {
    let query = sb.from("audit_logs")
      .select("id,timestamp,action,collection,record_id,actor_uid,actor_email,actor_name,details", { count: "exact" })
      .order("timestamp", { ascending: false });
    if (action && action !== "all") query = query.eq("action", action);
    if (collection && collection !== "all") query = query.eq("collection", collection);
    if (search) {
      const pattern = `%${search}%`;
      query = query.or(`actor_name.ilike.${pattern},actor_email.ilike.${pattern},collection.ilike.${pattern},record_id.ilike.${pattern}`);
    }
    return query;
  };

  if (exportAll) {
    const entries: unknown[] = [];
    let total = 0;
    for (let from = 0; ; from += 1000) {
      const { data, error, count } = await makeQuery().range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      entries.push(...(data ?? []));
      if (from === 0) total = count ?? 0;
      if ((data?.length ?? 0) < 1000) break;
    }
    return NextResponse.json({ entries, total, page: 0, limit: entries.length, hasMore: false }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const from = page * limit;
  const { data, error, count } = await makeQuery().range(from, from + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    entries: data ?? [],
    total: count ?? 0,
    page,
    limit,
    hasMore: from + (data?.length ?? 0) < (count ?? 0),
  }, { headers: { "Cache-Control": "no-store" } });
}
