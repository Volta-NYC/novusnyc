import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { deliverAutomationOnce } from "@/lib/server/automationDelivery";

async function authorize(req: NextRequest, meetingId: string) {
  const verified = await verifyCaller(req, ["owner", "admin", "member"]);
  if (!verified.ok) return { ok: false as const, response: NextResponse.json({ error: verified.error }, { status: verified.status }) };
  const sb = getSupabaseAdmin();
  const { data: meeting, error: meetingError } = await sb.from("pod_meetings").select("id, pod_id, meets_on")
    .eq("id", meetingId).maybeSingle();
  if (meetingError) return { ok: false as const, response: NextResponse.json({ error: "meeting_lookup_failed" }, { status: 500 }) };
  if (!meeting) return { ok: false as const, response: NextResponse.json({ error: "meeting_not_found" }, { status: 404 }) };
  if (verified.caller.role === "owner" || verified.caller.role === "admin") {
    return { ok: true as const, verified, meeting };
  }
  const { data: member, error: memberError } = await sb.from("team").select("id").eq("auth_uid", verified.caller.uid)
    .is("deleted_at", null).neq("status", "Inactive").maybeSingle();
  if (memberError) return { ok: false as const, response: NextResponse.json({ error: "member_lookup_failed" }, { status: 500 }) };
  const membershipResult = member?.id
    ? await sb.from("pod_members").select("id", { count: "exact", head: true })
        .eq("pod_id", meeting.pod_id).eq("member_id", member.id)
        .eq("role", "lit").is("left_at", null)
    : { count: 0, error: null };
  if (membershipResult.error) return { ok: false as const, response: NextResponse.json({ error: "pod_membership_lookup_failed" }, { status: 500 }) };
  if ((membershipResult.count ?? 0) === 0) {
    return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, verified, meeting };
}

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meetingId") ?? "";
  const access = await authorize(req, meetingId);
  if (!access.ok) return access.response;
  const { data, error } = await getSupabaseAdmin().from("member_strikes")
    .select("member_id").eq("source", "attendance").ilike("note", `%${meetingId}%`);
  if (error) return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  return NextResponse.json({ memberIds: [...new Set((data ?? []).map((row) => String(row.member_id)))] });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { meetingId?: string; memberId?: string };
  const meetingId = String(body.meetingId ?? "");
  const memberId = String(body.memberId ?? "");
  const access = await authorize(req, meetingId);
  if (!access.ok) return access.response;
  if (!memberId) return NextResponse.json({ error: "missing_member" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: rosterRow, error: rosterError } = await sb.from("pod_members").select("id")
    .eq("pod_id", access.meeting.pod_id).eq("member_id", memberId)
    .lte("joined_at", `${access.meeting.meets_on}T23:59:59`).maybeSingle();
  if (rosterError) return NextResponse.json({ error: "roster_lookup_failed" }, { status: 500 });
  if (!rosterRow) return NextResponse.json({ error: "member_not_on_roster" }, { status: 400 });

  const { data: existing, error: existingError } = await sb.from("member_strikes").select("id")
    .eq("member_id", memberId).eq("source", "attendance").ilike("note", `%${meetingId}%`).limit(1);
  if (existingError) return NextResponse.json({ error: "infraction_lookup_failed" }, { status: 500 });
  if ((existing ?? []).length > 0) return NextResponse.json({ success: true, alreadyIssued: true });

  const [priorResult, infractionsResult, memberResult, podResult] = await Promise.all([
    sb.from("member_strikes").select("id", { count: "exact", head: true })
      .eq("member_id", memberId).ilike("infraction_name", "%absence%"),
    sb.from("infractions").select("id, name, points").in("name", ["Unexcused Absence", "Repeated Unexcused Absence"]),
    sb.from("team").select("name, email").eq("id", memberId).maybeSingle(),
    sb.from("pods").select("name").eq("id", access.meeting.pod_id).maybeSingle(),
  ]);
  if (priorResult.error || infractionsResult.error || memberResult.error || podResult.error) {
    return NextResponse.json({ error: "infraction_context_lookup_failed" }, { status: 500 });
  }
  const prior = priorResult.count;
  const infractions = infractionsResult.data;
  const member = memberResult.data;
  const pod = podResult.data;
  const wanted = (prior ?? 0) > 0 ? "repeated unexcused absence" : "unexcused absence";
  const infraction = (infractions ?? []).find((row) => String(row.name).toLowerCase() === wanted)
    ?? (infractions ?? []).find((row) => String(row.name).toLowerCase() === "unexcused absence");
  if (!infraction || !member) return NextResponse.json({ error: "infraction_not_configured" }, { status: 409 });

  const strikeId = `strike_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const note = `${pod?.name ?? "Pod"} meeting ${access.meeting.meets_on} (${meetingId})`;
  const { error } = await sb.from("member_strikes").insert({
    id: strikeId, member_id: memberId, member_name: member.name,
    infraction_id: infraction.id, infraction_name: infraction.name, points: infraction.points,
    source: "attendance", issued_at: new Date().toISOString(), issued_by: access.verified.caller.email, note,
  });
  if (error) return NextResponse.json({ error: "strike_insert_failed" }, { status: 500 });

  if (member.email) {
    const { data: total, error: totalError } = await sb.from("member_contributions").select("infraction_points")
      .eq("member_id", memberId).maybeSingle();
    if (totalError) {
      console.error("Attendance infraction total lookup failed", totalError);
      return NextResponse.json({ success: true, strikeId, warning: "notification_not_sent" });
    }
    const delivery = await deliverAutomationOnce("infraction_issued", strikeId, [member.email], {
      memberName: String(member.name ?? "there").split(/\s+/)[0],
      infractionName: String(infraction.name), points: String(infraction.points ?? 0),
      notePart: note, totalPoints: String(total?.infraction_points ?? infraction.points ?? 0),
      standing: "review this notice in the member portal",
    }).catch((deliveryError) => {
      console.error("Attendance infraction notice failed", deliveryError);
      return null;
    });
    if (!delivery || delivery.sent === 0) {
      return NextResponse.json({ success: true, strikeId, warning: "notification_not_sent" });
    }
  }
  return NextResponse.json({ success: true, strikeId });
}
