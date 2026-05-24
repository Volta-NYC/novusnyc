// Run: SUPABASE_URL=... SUPABASE_KEY=<service_role_key> node scripts/seed-handbook.mjs
// Seeds the credit-infraction-policy handbook page with the full member handbook.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL / SUPABASE_KEY).");
  process.exit(1);
}

const TITLE = "Member Handbook";

const CONTENT = `
<h2>Welcome to Volta NYC</h2>
<p>
  This handbook covers everything you need to know as a Volta member: how credits work,
  what infractions are, and how to navigate the Members Portal. Read it carefully —
  you'll be asked to acknowledge it before accessing the portal, and its policies apply
  to all active members.
</p>

<h2>The Credit System</h2>
<p>
  Credits are Volta's measure of active contribution. Every assignment you complete
  earns credits, and your credit total determines your standing in the organization.
  Credits are not an abstract score — they represent real work delivered to real businesses.
</p>

<h3>How Credits Are Earned</h3>
<p>
  Credits are awarded when an admin or Senior Associate approves your submitted work on
  an assignment. The credit value for each assignment is set in advance and visible
  before you claim it. Some assignments require admin approval before credits are
  officially logged; others are awarded automatically on submission.
</p>
<p>
  <strong>Recurring assignments</strong> (marked with a ↻ icon) pay credits per
  check-in rather than as a one-time award. Each time you submit a check-in and it is
  approved, you receive the stated credit amount again. There is no cap on how many
  check-ins you can complete per cycle.
</p>

<h3>Credit Requirements Per Cycle</h3>
<p>
  Each semester, Volta runs a <strong>cycle</strong>. Every standard member is expected
  to earn a minimum number of credits during the cycle to remain in good standing.
  The minimum requirement is communicated at the start of each cycle. Members who fall
  below the minimum without an approved exemption are subject to review at cycle end.
</p>
<p>
  Leadership members (founders, board, cycle leads) are exempt from the credit minimum
  and operate under a separate accountability structure.
</p>

<h3>Credit Adjustments</h3>
<p>
  Admins may issue manual credit adjustments — positive or negative — to correct
  errors or account for exceptional circumstances. All adjustments are logged in the
  audit trail. If you believe your credit total is incorrect, contact your cycle lead.
</p>

<h2>Assignments</h2>
<p>
  Assignments are discrete tasks created by admins and assigned to specific businesses.
  They live in the Assignment Catalog, which you can browse from the <strong>Work</strong>
  page in the portal.
</p>

<h3>Claiming an Assignment</h3>
<p>
  To take on an assignment, open it from your catalog and click <strong>Claim</strong>.
  Once claimed, the assignment appears in your Work page under <em>In Progress</em>.
  Only one member can hold a claim on a given assignment at a time (unless the assignment
  explicitly allows multiple claimants).
</p>
<p>
  You can unclaim an assignment before you submit — doing so releases it back to the
  catalog. Unclaiming after submission is not permitted while the submission is under review.
</p>

<h3>Submitting Work</h3>
<p>
  When your work is complete, open the assignment from your Work page and click
  <strong>Submit</strong>. You'll be asked to provide a deliverable link (e.g. a Google
  Doc, Figma file, or live URL) and any notes for the reviewer. Submit early if possible —
  reviewers may request revisions, and you want buffer before the assignment deadline.
</p>
<p>
  Once submitted, the assignment moves to <em>Awaiting Review</em>. You'll see its
  status update in real time when the reviewer approves or rejects it. If rejected, you
  can revise and resubmit.
</p>

<h3>Deadlines</h3>
<p>
  Most assignments have a deadline. Deadlines are visible on the assignment card and
  on your Work page. Assignments overdue at cycle close will be flagged; consistently
  missing deadlines may result in infractions at admin discretion.
</p>

<h3>Assignment Tracks</h3>
<p>
  Assignments belong to one of two tracks: <strong>Tech</strong> or <strong>Marketing</strong>.
  Your track determines which assignments you are primarily responsible for, though you
  may claim assignments across tracks unless the assignment specifies otherwise.
</p>

<h2>The Infraction System</h2>
<p>
  Infractions are formal records of policy violations or performance failures. They are
  issued by admins via the team directory and carry a point value between 1 and 3
  depending on severity. Points accumulate across the cycle.
</p>

<h3>Point Thresholds and Consequences</h3>
<p>
  The following thresholds govern how accumulated infraction points are acted upon.
  All consequences are cumulative — reaching a higher threshold carries the penalties
  of all lower thresholds as well.
</p>
<ul>
  <li><strong>3 points — Written Warning.</strong> A formal written warning is issued
      via email and logged in your member record.</li>
  <li><strong>5 points — Second Warning &amp; Probationary Status.</strong> You are
      placed on probation for the remainder of the cycle. Probation restricts access to
      certain high-visibility assignments and may affect business assignments.</li>
  <li><strong>8 points — Review for Demotion or Removal.</strong> Leadership convenes
      a review. Depending on context, the outcome may be demotion to reserve status,
      removal from the current cycle, or permanent removal from Volta.</li>
</ul>
<p>
  Points do not automatically reset between cycles. Carry-over policy is set each
  semester by leadership and communicated at cycle kickoff.
</p>

<h3>Common Infraction Types</h3>
<p>
  The full list of defined infractions — including their descriptions and point values —
  is shown in the <strong>Infraction Reference</strong> table below this text. Admins
  may issue any infraction type in that table; they may not issue infractions outside of
  it without first adding the type through the admin panel.
</p>

<h3>Contesting an Infraction</h3>
<p>
  If you believe an infraction was issued incorrectly, reach out directly to your cycle
  lead or Ethan within 5 days of being notified. Provide context and any supporting
  evidence. Leadership will review and may reverse or reduce the infraction if warranted.
</p>

<h2>Using the Members Portal</h2>
<p>
  The Members Portal lives at <strong>voltanyc.org/members</strong>. Sign in with the
  email address on file for your account.
</p>

<h3>Sidebar Navigation</h3>
<p>
  The left sidebar contains all the sections available to your role. You can collapse
  it by clicking the arrow icon in the header, or expand it by clicking the Volta logo
  when collapsed. On mobile, the sidebar is accessed via the hamburger menu at the top
  of the screen.
</p>

<h3>Overview Page</h3>
<p>
  The Overview page (/members/me) shows your profile, your current credit total, your
  track, and a summary of your assignment history this cycle. This is your personal
  dashboard — check it regularly to stay on top of your standing.
</p>

<h3>Work Page</h3>
<p>
  The Work page (/members/work) is split into two tabs:
</p>
<ul>
  <li><strong>My Work</strong> — all assignments you have claimed in the current cycle,
      grouped by status (In Progress, Awaiting Review, Completed, Needs Resubmission).</li>
  <li><strong>Assignment Catalog</strong> — all open assignments available for you to
      claim, filtered to your cycle and role.</li>
</ul>
<p>
  Click any assignment to open its detail page, where you can claim, submit, or view
  submission history.
</p>

<h3>Handbook Page</h3>
<p>
  This page. You're here. It also contains the live Infraction Reference table below,
  which is always up to date with the current infraction catalog.
</p>

<h2>Communication &amp; Expectations</h2>
<p>
  Members are expected to respond to Slack messages and emails within <strong>48 hours</strong>
  during active cycle weeks. Failure to respond is itself an infractable offense.
</p>
<p>
  If you need to take a leave of absence, notify your cycle lead in advance. Extended
  unplanned absences without notice may result in removal from active assignments and
  infractions.
</p>
<p>
  All work delivered to client businesses represents Volta. It must be professional,
  on-brand, and delivered on time. Quality issues reflected in client feedback will
  be reviewed and may result in infractions.
</p>
`.trim();

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/handbook_pages`;

  // Check if a row already exists
  const checkRes = await fetch(`${url}?slug=eq.credit-infraction-policy&select=id`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  const existing = await checkRes.json();

  const now = new Date().toISOString();
  const payload = {
    slug: "credit-infraction-policy",
    title: TITLE,
    content: CONTENT,
    updated_by: "system",
    updated_at: now,
  };

  if (existing.length > 0) {
    const id = existing[0].id;
    const res = await fetch(`${url}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PATCH failed (${res.status}): ${text}`);
    }
    console.log("✅ Handbook page updated.");
  } else {
    const { randomUUID } = await import("crypto");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...payload, id: randomUUID() }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`INSERT failed (${res.status}): ${text}`);
    }
    console.log("✅ Handbook page created.");
  }
}

run().catch((e) => { console.error("❌", e.message); process.exit(1); });
