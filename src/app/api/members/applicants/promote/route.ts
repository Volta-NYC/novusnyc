import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { promoteApplicantToMember } from "@/lib/server/promoteMember";
import { DEFAULT_MEMBER_ROLE } from "@/lib/members/roles";

type PromoteBody = {
  fullName?: string;
  email?: string;
  schoolName?: string;
  grade?: string;
  role?: string;
  tracksSelected?: string;
  applicationId?: string;
  markAccepted?: boolean;
};

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as PromoteBody;

  try {
    const result = await promoteApplicantToMember({
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      schoolName: body.schoolName,
      grade: body.grade,
      tracksSelected: body.tracksSelected,
      role: (body.role ?? "").trim() || DEFAULT_MEMBER_ROLE,
      source: "Added from accepted application",
      applicationId: body.applicationId,
      decidedBy: verified.caller.email ?? "",
      markAcceptedRole: body.markAccepted
        ? ((body.role ?? "").trim() || DEFAULT_MEMBER_ROLE)
        : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "promote_failed";
    return NextResponse.json(
      { error: message },
      { status: message === "missing_fields" ? 400 : 500 },
    );
  }
}
