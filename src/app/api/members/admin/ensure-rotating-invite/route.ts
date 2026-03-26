import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getOrCreateRotatingInviteLink } from "@/lib/server/inviteCodes";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? "https://voltanyc.org").trim();
  const rotatingInvite = await getOrCreateRotatingInviteLink({
    role: "member",
    createdBy: verified.caller.uid,
    baseUrl,
    idToken: verified.caller.idToken,
  });

  return NextResponse.json({
    success: true,
    created: rotatingInvite.created,
    code: rotatingInvite.code,
    link: rotatingInvite.link,
    expiresAt: rotatingInvite.expiresAt,
  });
}

