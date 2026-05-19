import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, writeAuditLog } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = (body.slug ?? "credit-infraction-policy").trim();

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("member_acknowledgments").delete().eq("page_slug", slug);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  await writeAuditLog({
    action: "reset",
    collection: "memberAcknowledgments",
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name || verified.caller.email,
    details: { slug },
  });

  return NextResponse.json({ success: true });
}
