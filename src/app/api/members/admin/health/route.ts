import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthIssue = {
  id: string;
  label: string;
  detail: string;
  count: number;
  href: string;
  severity: "attention" | "info";
};

function required<T>(result: { data: T | null; error: { message: string } | null }, name: string): T {
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data as T;
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const sb = getSupabaseAdmin();
  try {
    const [teamResult, applicationsResult, interviewsResult, podsResult, podMembersResult, businessesResult, automationsResult, templatesResult, handbookResult, settingsResult] = await Promise.all([
      sb.from("team").select("id,name,email,status,auth_uid").is("deleted_at", null),
      sb.from("applications").select("id,status"),
      sb.from("interviews").select("id,status,scheduled_at"),
      sb.from("pods").select("id,name,slug,status"),
      sb.from("pod_members").select("pod_id,role,left_at"),
      sb.from("businesses").select("id,name,showcase_enabled,showcase_featured_on_home,showcase_image_url,live_url,preview_url,address").is("deleted_at", null),
      sb.from("automation_configs").select("automation_id,template_key,enabled"),
      sb.from("email_templates").select("key,active"),
      sb.from("handbook_pages").select("slug,title,content").eq("slug", "credit-infraction-policy").maybeSingle(),
      sb.from("site_settings").select("applications_paused,public_banner_enabled,portal_banner_enabled,handbook_ack_required_at").eq("id", "singleton").maybeSingle(),
    ]);

    const team = required(teamResult, "team");
    const applications = required(applicationsResult, "applications");
    const interviews = required(interviewsResult, "interviews");
    const pods = required(podsResult, "pods");
    const podMembers = required(podMembersResult, "pod_members");
    const businesses = required(businessesResult, "businesses");
    const automations = required(automationsResult, "automation_configs");
    const templates = required(templatesResult, "email_templates");
    const handbook = required(handbookResult, "handbook_pages") as { content?: string | null } | null;
    const settings = required(settingsResult, "site_settings") as {
      applications_paused?: boolean;
      public_banner_enabled?: boolean;
      portal_banner_enabled?: boolean;
      handbook_ack_required_at?: string | null;
    } | null;

    const activeMembersWithoutLogin = team.filter((member) => member.status === "Active" && !member.auth_uid);
    const pendingApplications = applications.filter((application) => application.status === "New");
    const pastScheduledInterviews = interviews.filter((interview) =>
      interview.status === "scheduled" && new Date(interview.scheduled_at).getTime() < Date.now(),
    );
    const activeLitsByPod = new Set(podMembers
      .filter((membership) => membership.role === "lit" && !membership.left_at)
      .map((membership) => membership.pod_id));
    const podsWithoutLit = pods.filter((pod) => pod.status !== "Archived" && !activeLitsByPod.has(pod.id));
    const publicCardsMissingImage = businesses.filter((business) => business.showcase_enabled && !business.showcase_image_url);
    const publicCardsMissingLink = businesses.filter((business) => business.showcase_enabled && !business.live_url && !business.preview_url);
    const activeTemplateKeys = new Set(templates.filter((template) => template.active).map((template) => template.key));
    const brokenAutomations = automations.filter((automation) =>
      automation.enabled && (!automation.template_key || !activeTemplateKeys.has(automation.template_key)),
    );
    const handbookHasContent = String(handbook?.content ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0;

    const issues = ([
      {
        id: "pending-applications",
        label: "Applications waiting for review",
        detail: "Open the applicant queue and make a decision or schedule an interview.",
        count: pendingApplications.length,
        href: "/members/applicants",
        severity: "attention",
      },
      {
        id: "past-interviews",
        label: "Past interviews need an outcome",
        detail: "Mark each interview completed, no-show, or cancelled so the record stays accurate.",
        count: pastScheduledInterviews.length,
        href: "/members/interviews",
        severity: "attention",
      },
      {
        id: "pods-without-lit",
        label: "Active pods without a LIT",
        detail: "Assign a pod lead so meetings, attendance, and assignments have an owner.",
        count: podsWithoutLit.length,
        href: "/members/pods",
        severity: "attention",
      },
      {
        id: "members-without-login",
        label: "Active members without portal access",
        detail: "Invite these members when they need to see assignments, attendance, or certified hours.",
        count: activeMembersWithoutLogin.length,
        href: "/members/team",
        severity: "info",
      },
      {
        id: "public-image",
        label: "Public cards missing an image",
        detail: "These cards can publish, but they will not have a usable visual preview.",
        count: publicCardsMissingImage.length,
        href: "/members/projects?view=public",
        severity: "attention",
      },
      {
        id: "public-link",
        label: "Public cards missing a website link",
        detail: "Add a preview or live URL before featuring the card publicly.",
        count: publicCardsMissingLink.length,
        href: "/members/projects?view=public",
        severity: "attention",
      },
      {
        id: "automation-template",
        label: "Enabled automations missing a usable template",
        detail: "An enabled automation cannot send until its email template exists and is active.",
        count: brokenAutomations.length,
        href: "/members/email",
        severity: "attention",
      },
      {
        id: "handbook-content",
        label: "Member policy has no readable content",
        detail: "Add the conduct, attendance, service-hour, and infraction rules before asking members to acknowledge them.",
        count: handbookHasContent ? 0 : 1,
        href: "/members/admin/policy",
        severity: "attention",
      },
    ] satisfies HealthIssue[]).filter((issue) => issue.count > 0);

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      issues,
      summary: {
        activeMembers: team.filter((member) => member.status === "Active").length,
        pendingApplications: pendingApplications.length,
        scheduledInterviews: interviews.filter((interview) => interview.status === "scheduled").length,
        activePods: pods.filter((pod) => pod.status !== "Archived").length,
        publicCards: businesses.filter((business) => business.showcase_enabled).length,
        enabledAutomations: automations.filter((automation) => automation.enabled).length,
      },
      settings: {
        applicationsOpen: !settings?.applications_paused,
        publicBannerOn: !!settings?.public_banner_enabled,
        portalBannerOn: !!settings?.portal_banner_enabled,
        handbookAcknowledgmentResetAt: settings?.handbook_ack_required_at ?? null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin health check failed", error);
    return NextResponse.json({ error: "health_check_failed" }, { status: 500 });
  }
}
