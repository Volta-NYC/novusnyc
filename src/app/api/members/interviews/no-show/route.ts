import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const slotId = typeof body.slotId === "string" ? body.slotId.trim() : "";
  const noShow = body.noShow !== false;

  if (!slotId) return NextResponse.json({ error: "missing_slot_id" }, { status: 400 });

  const slotData = await dbRead(`interviewSlots/${slotId}`);
  if (!slotData) return NextResponse.json({ error: "slot_not_found" }, { status: 404 });

  const slot = slotData as Record<string, unknown>;
  if (!slot.bookedBy || slot.available) {
    return NextResponse.json({ error: "slot_not_booked" }, { status: 409 });
  }

  await dbPatch(`interviewSlots/${slotId}`, {
    noShow,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, slotId, noShow });
}
