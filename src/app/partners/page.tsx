import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import ContactForm from "@/components/ContactForm";
import { partnerServices } from "@/data";

export const metadata: Metadata = {
  title: "For Businesses | Volta NYC",
  description:
    "NYC small businesses: get a free website, social media strategy, grant writing, or SEO from a dedicated student team. No cost, no catch. Volta NYC is a registered 501(c)(3) nonprofit.",
  openGraph: {
    title: "Work With Volta NYC — Free for NYC Small Businesses",
    description:
      "Student teams build websites, grow social media, write grants, and optimize SEO for NYC small businesses — at no cost. Reach out to get started.",
  },
};

export default function Partners() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-dark pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-[0.06]" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              For Businesses & BIDs
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              A dedicated team<br />
              <span className="text-v-green">for your business.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-8">
              Volta places student teams on real projects for NYC small businesses —
              websites, social media, grant writing, SEO, and more.
              Professional-grade work, no cost to you.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="#contact"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                Work with us →
              </a>
              <Link
                href="/showcase"
                className="border border-white/20 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:border-white/50 transition-colors"
              >
                See our work
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHAT YOU GET + WHY IT'S FREE ─────────────────────── */}
      <section className="py-20 bg-white border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <AnimatedSection direction="left">
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-5">
                What your business gets
              </p>
              <ul className="space-y-4">
                {[
                  "A custom website, built and deployed",
                  "Social media strategy and account management",
                  "Grant research and full application writing",
                  "Google Maps, Yelp, and SEO optimization",
                  "POS and sales data analysis",
                  "Digital payment and online ordering setup",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-v-ink text-base">
                    <span className="w-1.5 h-1.5 rounded-full bg-v-green flex-shrink-0 mt-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="bg-v-bg border border-v-border rounded-2xl p-8">
                <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-4">
                  Why is this free?
                </p>
                <p className="font-body text-v-ink text-lg leading-relaxed mb-4">
                  Our students want hands-on experience they can put on a resume
                  and in their portfolio. Working with real businesses gives them that.
                </p>
                <p className="font-body text-v-muted leading-relaxed">
                  Your business gets the work done, they get the skills and credentials.
                  This is the mutual benefit we want to create.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Three steps.
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                n: "1",
                title: "Tell us what you need",
                desc: "Fill out the form below or get referred by your local BID. We respond within a few days.",
              },
              {
                n: "2",
                title: "We scope the work",
                desc: "A quick call or in-person visit to understand your business, your challenges, and what's realistic.",
              },
              {
                n: "3",
                title: "Your team gets to work",
                desc: "A dedicated student pod is assigned to your project. One point of contact throughout.",
              },
            ].map((s, i) => (
              <AnimatedSection key={s.n} delay={i * 0.1} className="text-center">
                <p className="font-display font-bold text-v-green text-5xl leading-none mb-4">{s.n}</p>
                <h3 className="font-display font-bold text-v-ink text-lg mb-2">{s.title}</h3>
                <p className="font-body text-sm text-v-muted leading-relaxed">{s.desc}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              What we deliver
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Six service areas.
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {partnerServices.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.07}>
                <div className="bg-white border border-v-border rounded-2xl p-7 project-card h-full">
                  <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink mb-2">{s.title}</h3>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ─────────────────────────────────────── */}
      <section className="py-20 bg-v-bg" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Start a conversation
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-4">
              Work with us
            </h2>
            <p className="font-body text-v-muted max-w-xl">
              Tell us about your business and what you need. Switch the form to your
              preferred language using the toggle below. If you were referred by a BID,
              mention that in your message.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <ContactForm />
          </AnimatedSection>
        </div>
      </section>

      {/* ── BID SECTION ──────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
                For BIDs & district organizations
              </p>
              <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-5">
                We coordinate<br />through your district.
              </h2>
              <p className="font-body text-v-muted leading-relaxed mb-6">
                We partner with Business Improvement Districts to coordinate
                neighborhood-level operations — identifying businesses that need
                support, making introductions, and ensuring follow-through on every
                project.
              </p>
              <a
                href="mailto:info@voltanyc.org"
                className="inline-block bg-v-ink text-white font-display font-bold text-sm px-7 py-3 rounded-full hover:bg-v-ink/80 transition-colors"
              >
                Contact us directly
              </a>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="bg-v-bg border border-v-border rounded-2xl p-8">
                <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
                  Currently active
                </p>
                <p className="font-display font-bold text-v-ink text-6xl leading-none mb-1">9</p>
                <p className="font-body text-v-muted mb-6">BID partnerships across NYC</p>
                <div className="pt-6 border-t border-v-border">
                  <p className="font-body text-sm text-v-muted">
                    Active across 9 neighborhoods in Brooklyn, Queens, Manhattan, the Bronx, and Staten Island.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </>
  );
}
