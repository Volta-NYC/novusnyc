import AnimatedSection from "@/components/AnimatedSection";
import ContactForm from "@/components/ContactForm";
import { partnerServices } from "@/data";

export default function Partners() {
  return (
    <>
      <section className="bg-v-blue pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">For businesses & BIDs</p>
            <h1 className="font-display font-bold text-white leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
              Free digital services<br /><span className="text-v-green">for NYC businesses.</span>
            </h1>
            <p className="font-body text-white/80 text-lg max-w-2xl leading-relaxed">
              Volta is a registered nonprofit. We place student teams on projects for small businesses at no cost.
              Our students gain real experience and portfolio work — your business gets the labor.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-3 gap-10 text-center">
          {[
            { step: "1", title: "Reach out", desc: "Fill out the form below or get referred by your local BID. We respond within a few days." },
            { step: "2", title: "We meet", desc: "A quick call or in-person visit to understand what you need and what's realistic." },
            { step: "3", title: "We get to work", desc: "A dedicated student team is assigned. You have one point of contact throughout." },
          ].map((s, i) => (
            <AnimatedSection key={s.step} delay={i * 0.1}>
              <p className="font-display font-bold text-v-green text-4xl mb-3">{s.step}</p>
              <h3 className="font-display font-bold text-v-ink text-lg mb-2">{s.title}</h3>
              <p className="font-body text-sm text-v-muted leading-relaxed">{s.desc}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Why free */}
      <section className="py-14 bg-v-bg border-b border-v-border">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="bg-white border border-v-border rounded-2xl p-8">
              <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Why is this free?</p>
              <p className="font-body text-v-ink text-base leading-relaxed">
                Our students want hands-on experience they can put on a resume and in their portfolio.
                Working with real businesses gives them that. Your business gets the work done,
                they get the skills and credentials. We&apos;re a nonprofit — this is the model.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">What we offer</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Services — all free</h2>
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

      {/* Contact form */}
      <section className="py-20 bg-white border-t border-v-border" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 text-center">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">Get in touch</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-4">Work with us</h2>
            <p className="font-body text-v-muted max-w-xl mx-auto">
              Tell us a bit about your business and what you need. Use the language toggle below to switch the form.
              If you were referred by a BID, mention that in the message.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <ContactForm />
          </AnimatedSection>
        </div>
      </section>

      {/* BID CTA */}
      <section className="py-14 bg-v-dark text-center">
        <div className="max-w-2xl mx-auto px-5">
          <AnimatedSection>
            <h2 className="font-display font-bold text-white text-2xl mb-4">Are you a BID or community organization?</h2>
            <p className="font-body text-white/50 mb-6">
              We work directly with BIDs to identify businesses in your district that could use help.
              Email us to set up a conversation.
            </p>
            <a href="mailto:volta.newyork@gmail.com" className="inline-block border border-white/20 text-white font-display font-bold text-sm px-7 py-3 rounded-full hover:border-v-green hover:text-v-green transition-colors">
              volta.newyork@gmail.com
            </a>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
