import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function readableDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const memberId = req.nextUrl.searchParams.get("memberId")?.trim() ?? "";
  const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
  const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";
  if (!memberId || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const [{ data: member, error: memberError }, { data: entries, error: hoursError }] = await Promise.all([
    sb.from("team").select("id, name, school, email").eq("id", memberId).is("deleted_at", null).maybeSingle(),
    sb.from("certified_hour_entries").select("source, department, occurred_on, hours, detail")
      .eq("member_id", memberId).gte("occurred_on", from).lte("occurred_on", to)
      .order("occurred_on", { ascending: true }),
  ]);
  if (memberError || !member) return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  if (hoursError) return NextResponse.json({ error: hoursError.message }, { status: 500 });

  const rows = (entries ?? []) as { source: string; department: string; occurred_on: string; hours: number | string; detail: string }[];
  const total = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const byDepartment = new Map<string, number>();
  for (const row of rows) {
    const department = String(row.department || "General service");
    byDepartment.set(department, (byDepartment.get(department) ?? 0) + Number(row.hours || 0));
  }
  const departmentText = [...byDepartment.entries()].sort((a, b) => b[1] - a[1])
    .map(([name, hours]) => `${escapeHtml(name)} (${hours.toFixed(2)} hours)`).join(", ");
  const grouped = new Map<string, { department: string; detail: string; hours: number; first: string; last: string }>();
  for (const row of rows) {
    const department = String(row.department || "General service");
    const detail = String(row.detail || row.source);
    const key = `${department}\u0000${detail}`;
    const current = grouped.get(key);
    if (current) {
      current.hours += Number(row.hours || 0);
      if (row.occurred_on < current.first) current.first = row.occurred_on;
      if (row.occurred_on > current.last) current.last = row.occurred_on;
    } else grouped.set(key, { department, detail, hours: Number(row.hours || 0), first: row.occurred_on, last: row.occurred_on });
  }
  const activities = [...grouped.values()].sort((a, b) => b.hours - a.hours || a.detail.localeCompare(b.detail));
  const shown = activities.slice(0, 10);
  if (activities.length > shown.length) {
    shown.push({
      department: "Additional service",
      detail: `${activities.length - shown.length} other certified activities`,
      hours: activities.slice(shown.length).reduce((sum, row) => sum + row.hours, 0),
      first: from,
      last: to,
    });
  }
  const detailRows = shown.map((row) => `<tr><td>${escapeHtml(row.department)}</td><td>${escapeHtml(row.detail)}</td><td class="hours">${row.hours.toFixed(2)}</td></tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Service letter — ${escapeHtml(member.name)}</title><style>
    @page{size:letter;margin:.65in}*{box-sizing:border-box}body{margin:0;color:#29252b;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.45}.toolbar{position:fixed;right:18px;top:18px}.toolbar button{border:0;border-radius:999px;background:#f6b78d;color:#29252b;font-weight:700;padding:10px 18px;cursor:pointer}.brand{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid #f6b78d;padding-bottom:14px}.brand h1{font-size:26pt;letter-spacing:.08em;margin:0;color:#5b334f}.brand p{margin:0;color:#746d75;text-align:right}.date{margin-top:28px}.recipient{margin:20px 0}.subject{font-weight:700}.summary{margin:18px 0;border-left:4px solid #f3e28d;background:#fbf8f2;padding:13px 16px}.summary strong{font-size:17pt;color:#5b334f}.details{margin-top:22px}.details h2{font-size:12pt;margin:0 0 8px}.details table{width:100%;border-collapse:collapse;font-size:9pt}.details th,.details td{border-bottom:1px solid #e4dfe3;padding:6px 5px;text-align:left;vertical-align:top}.details th{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#746d75}.hours{text-align:right!important;font-variant-numeric:tabular-nums}.signature{margin-top:42px}.line{width:245px;border-top:1px solid #29252b;margin-top:38px}.fine{font-size:8pt;color:#746d75;margin-top:22px}@media print{.toolbar{display:none}.details table{break-inside:auto}tr{break-inside:avoid}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
  <header class="brand"><h1>NOVUS</h1><p>Novus NYC<br>Student-led service for small businesses</p></header>
  <p class="date">${escapeHtml(readableDate(new Date().toISOString().slice(0, 10)))}</p>
  <div class="recipient"><strong>${escapeHtml(member.name)}</strong>${member.school ? `<br>${escapeHtml(member.school)}` : ""}${member.email ? `<br>${escapeHtml(member.email)}` : ""}</div>
  <p class="subject">Re: Verification of service from ${escapeHtml(readableDate(from))} through ${escapeHtml(readableDate(to))}</p>
  <p>To whom it may concern:</p>
  <p>This letter verifies that <strong>${escapeHtml(member.name)}</strong> completed service with Novus NYC during the period above. Their work supported Novus operations and New York City small businesses through the activities recorded below.</p>
  <div class="summary"><strong>${total.toFixed(2)} certified service hours</strong><br>${departmentText || "No certified service activity was recorded in this period."}</div>
  ${rows.length ? `<section class="details"><h2>Service summary</h2><table><thead><tr><th>Department</th><th>Work completed</th><th class="hours">Hours</th></tr></thead><tbody>${detailRows}</tbody></table></section>` : ""}
  <p>This total is generated from Novus NYC's certified service-hours journal. Please contact Novus NYC if additional verification is required.</p>
  <div class="signature"><p>Sincerely,</p><div class="line"></div><p><strong>Authorized Novus NYC representative</strong><br>Novus NYC</p></div>
  <p class="fine">Generated by the Novus NYC Members Portal. Letter ID: ${escapeHtml(memberId.slice(0, 8))}-${escapeHtml(from)}-${escapeHtml(to)}</p>
  </body></html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "content-disposition": `inline; filename="novus-service-${String(member.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${from}-${to}.html"`,
    },
  });
}
