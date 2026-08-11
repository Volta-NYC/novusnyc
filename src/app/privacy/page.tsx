import type { Metadata } from "next";
import PrivacySectionNav from "@/components/PrivacySectionNav";
import { EMAIL } from "@/lib/mail";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Novus NYC handles contact, application, booking, member, and analytics data, including cookies and privacy choices.",
  openGraph: {
    title: "Privacy Policy | Novus NYC",
    description:
      "How Novus NYC collects, uses, stores, and shares information across its website, applications, bookings, and member portal.",
    images: ["/api/og"],
  },
};

const sectionClass = "scroll-mt-28 border-t border-n-border pt-10";
const headingClass = "font-display text-2xl font-bold text-n-ink md:text-3xl";
const bodyClass = "mt-4 space-y-4 font-body text-[15px] leading-7 text-n-muted";
const linkClass = "font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900";

export default function PrivacyPage() {
  return (
    <div className="public-surface public-surface-lavender bg-n-bg pb-20 pt-32">
      <section className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-n-border bg-n-dark text-white shadow-[0_24px_70px_rgba(45,40,46,0.16)]">
          <div className="h-2 bg-gradient-to-r from-n-orange via-n-yellow to-n-purple" />
          <div className="px-6 py-9 md:px-10 md:py-12">
            <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-n-orange">
              Legal · Last updated August 10, 2026
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-3xl font-body text-base leading-7 text-white/65 md:text-lg">
              This policy explains what Novus Inc. collects, why we use it, which services help us operate, and the choices available to you.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8">
          <PrivacySectionNav />

          <article className="rounded-[2rem] border border-n-border bg-white px-6 py-8 shadow-[0_18px_50px_rgba(45,40,46,0.06)] md:px-10 md:py-10">
            <section id="scope" className="scroll-mt-28">
              <h2 className={headingClass}>1. Scope</h2>
              <div className={bodyClass}>
                <p>
                  This policy applies to the Novus NYC website at{" "}
                  <a className={linkClass} href="https://www.novusnyc.org">www.novusnyc.org</a>, our public contact and student application forms, interview booking tools, member portal, and related communications.
                </p>
                <p>
                  Novus Inc. is responsible for deciding how the information described here is used. This policy does not govern third-party websites that we link to or project websites operated by the businesses we support.
                </p>
              </div>
            </section>

            <section id="information" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>2. Information we collect</h2>
              <div className={bodyClass}>
                <div>
                  <h3 className="font-display text-lg font-bold text-n-ink">Business and partner inquiries</h3>
                  <p className="mt-2">
                    When you request support, we collect the business name, your name and email address, and any optional phone number, neighborhood, requested services, referral source, preferred language, or message you provide.
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-n-ink">Student applications</h3>
                  <p className="mt-2">
                    When you apply, we collect your name, email address, school, class year or grade, city and state, chapter preference, referral information, selected tracks, relevant tools or experience, written responses, and whether you attach a resume. If you upload a resume, we also process the file and its name.
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-n-ink">Interview booking</h3>
                  <p className="mt-2">
                    We collect the name, email address, selected time, invitation or booking identifier, and scheduling history needed to book, confirm, remind, or reschedule an interview.
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-n-ink">Members and applicants</h3>
                  <p className="mt-2">
                    For people participating in Novus, we may maintain account identifiers, contact and profile information, school and role information, project or assignment activity, submissions, feedback, attendance or interview information, acknowledgments, and administrative audit records. Authentication credentials are handled by our authentication provider; Novus does not receive your plaintext password.
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-n-ink">Technical and usage information</h3>
                  <p className="mt-2">
                    Our hosting and security systems process information ordinarily sent with a web request, such as IP address, browser and device information, requested URL, date and time, and referring page. We use IP addresses and email addresses in short-lived abuse-prevention records to rate-limit public forms, resume uploads, and booking requests.
                  </p>
                </div>
              </div>
            </section>

            <section id="use" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>3. How we use information</h2>
              <div className={bodyClass}>
                <p>We use information to:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-n-orange">
                  <li>review and respond to business support requests;</li>
                  <li>evaluate student applications and communicate application decisions;</li>
                  <li>schedule interviews and send confirmations, reminders, calendar files, or rescheduling messages;</li>
                  <li>create and administer member accounts, teams, projects, assignments, and program records;</li>
                  <li>deliver and improve Novus programs, website content, and communications;</li>
                  <li>measure aggregate website use and completed-form conversions when analytics is permitted;</li>
                  <li>protect the website, prevent spam and abuse, investigate errors, and maintain audit trails; and</li>
                  <li>meet legal, accounting, governance, and nonprofit recordkeeping obligations.</li>
                </ul>
                <p>
                  We do not sell personal information, and we do not use website information for cross-context behavioral advertising or targeted advertising.
                </p>
              </div>
            </section>

            <section id="sharing" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>4. Service providers and sharing</h2>
              <div className={bodyClass}>
                <p>We disclose information only as needed for the purposes above, including to:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-n-purple">
                  <li><strong className="text-n-ink">Supabase</strong>, for database hosting, authentication, file storage, and application infrastructure;</li>
                  <li><strong className="text-n-ink">Vercel</strong>, for website hosting, delivery, logs, and anonymous cookieless web analytics;</li>
                  <li><strong className="text-n-ink">Google</strong>, for optional Google Analytics, form backups in Google Sheets, resume storage in Google Drive, and email or calendar-related communications;</li>
                  <li>Novus directors, administrators, interviewers, and project leads who need the information to perform their roles; and</li>
                  <li>law enforcement, regulators, courts, professional advisers, or other parties when reasonably necessary to comply with law, protect rights or safety, or address fraud and security issues.</li>
                </ul>
                <p>
                  Providers process information under their own terms and privacy commitments. Some may process information from locations outside your state or country.
                </p>
              </div>
            </section>

            <section id="analytics-cookies" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>5. Analytics, cookies, and browser storage</h2>
              <div className={bodyClass}>
                <p>
                  Vercel Web Analytics measures aggregate page views, referrers, approximate location, and device or browser categories without cookies and without giving Novus a persistent identifier for an individual visitor.
                </p>
                <p>
                  Google Analytics is optional. It does not load until you choose <strong className="text-n-ink">Allow analytics</strong>. If allowed, Google Analytics may set first-party cookies such as <code className="rounded bg-n-bg px-1.5 py-0.5 text-sm text-n-ink">_ga</code> and <code className="rounded bg-n-bg px-1.5 py-0.5 text-sm text-n-ink">_ga_*</code> to distinguish browsers and sessions. We disable Google advertising signals and ad-personalization signals in our website configuration.
                </p>
                <p>
                  We store your choice under <code className="rounded bg-n-bg px-1.5 py-0.5 text-sm text-n-ink">novus-analytics-consent</code> in local browser storage. Signed-in members may also have authentication and interface preferences stored in their browser so the portal can keep them signed in and remember their settings.
                </p>
                <p>
                  You can change your selection at any time using <strong className="text-n-ink">Analytics choices</strong> in the site footer. Choosing <strong className="text-n-ink">Necessary only</strong> disables Google Analytics for future activity and removes Google Analytics cookies that the site can access. You can also clear cookies and site data in your browser or use the{" "}
                  <a className={linkClass} href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                    Google Analytics opt-out browser add-on
                  </a>.
                </p>
              </div>
            </section>

            <section id="retention" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>6. How long we keep information</h2>
              <div className={bodyClass}>
                <p>
                  We keep information for as long as reasonably needed to respond to a request, evaluate an application, operate an interview or program, maintain the member portal, document completed work, resolve disputes, protect the service, and satisfy legal or governance requirements.
                </p>
                <p>
                  Retention varies by record type and program status. When information is no longer needed, we may delete it, anonymize it, or retain it in a restricted backup until that backup is overwritten. You may ask about or request deletion of your information using the contact details below; some records may need to be retained where permitted or required by law.
                </p>
              </div>
            </section>

            <section id="security" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>7. Security</h2>
              <div className={bodyClass}>
                <p>
                  We use access controls, authenticated administrative tools, encrypted network connections, role-based permissions, rate limiting, and service-provider safeguards designed to protect information. No online system or transmission can be guaranteed completely secure, so please avoid sending sensitive information that a form does not request.
                </p>
              </div>
            </section>

            <section id="choices" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>8. Your choices and rights</h2>
              <div className={bodyClass}>
                <p>
                  You may ask to access, correct, or delete personal information you provided, withdraw an application where feasible, or ask how a record is being used. Depending on where you live, applicable law may provide additional rights, including rights to obtain a copy, restrict or object to certain processing, or appeal a decision about a privacy request.
                </p>
                <p>
                  To make a request, email{" "}
                  <a className={linkClass} href={`mailto:${EMAIL.info}?subject=Privacy%20request`}>
                    {EMAIL.info}
                  </a>{" "}
                  with the subject “Privacy request.” We may need to verify your identity and authority before acting. You may also unsubscribe using the link in a marketing email, where one is provided, or contact us to stop non-transactional messages.
                </p>
              </div>
            </section>

            <section id="young-people" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>9. Young people</h2>
              <div className={bodyClass}>
                <p>
                  Novus programs are intended for high school and college students, but our website and applications are not directed to children under 13. We do not knowingly collect personal information online from a child under 13. A parent or guardian who believes a child under 13 submitted information should contact us so we can review and delete it where appropriate.
                </p>
              </div>
            </section>

            <section id="changes" className={`${sectionClass} mt-10`}>
              <h2 className={headingClass}>10. Changes and contact</h2>
              <div className={bodyClass}>
                <p>
                  We may update this policy when our services or practices change. The date at the top will show the latest revision, and material changes may also be announced on the website or by email when appropriate.
                </p>
                <p>
                  Questions or privacy requests can be sent to Novus Inc. at{" "}
                  <a className={linkClass} href={`mailto:${EMAIL.info}`}>
                    {EMAIL.info}
                  </a>. If postal contact is necessary, email us for the current mailing address.
                </p>
              </div>
            </section>
          </article>
        </div>
      </section>
    </div>
  );
}
