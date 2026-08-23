import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => null) as { surface?: unknown; orderedIds?: unknown } | null;
  const surface = body?.surface;
  const orderedIds = Array.isArray(body?.orderedIds)
    ? body.orderedIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if ((surface !== "showcase" && surface !== "home") || orderedIds.length === 0 || new Set(orderedIds).size !== orderedIds.length) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: count, error } = await sb.rpc("set_public_card_order", {
    p_surface: surface,
    p_ordered_ids: orderedIds,
  });
  if (error || count !== orderedIds.length) {
    return NextResponse.json({ error: error?.message ?? "order_was_not_saved" }, { status: 500 });
  }

  await writeAuditLog({
    action: "update",
    collection: "businesses.publicOrder",
    recordId: surface,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: { surface, count: orderedIds.length, orderedIds },
  });

  return NextResponse.json({ ok: true, count });
}
