import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";
import InquiryForm from "@/components/InquiryForm";

export const metadata: Metadata = {
  title: "Contact | Volta NYC",
  description:
    "Reach Volta NYC's leadership team directly or send a general inquiry. We respond to all messages.",
  openGraph: {
    title: "Contact Volta NYC",
    description: "Reach the team behind Volta NYC.",
  },
};

const team = [
  { name: "Ethan Zhang", role: "Director", email: "ethan@voltanpo.org", school: "Stuyvesant High School", initial: "E" },
  { name: "Andrew Chin", role: "Director", email: "andrew@voltanpo.org", school: "Stuyvesant High School", initial: "A" },
  { name: "Joseph Long", role: "Assistant Director", email: "joseph.long.nyc@gmail.com", school: "Stuyvesant High School", initial: "J" },
  { name: "Tahmid Islam", role: "Tech Lead", email: "islamtahmidd@gmail.com", school: "Stuyvesant High School", initial: "T" },
];

export default function Contact() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Get in touch</p>
            <h1 className="font-display font-bold text-v-ink leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
              Contact<br /><span className="text-v-green">Volta NYC</span>
            </h1>
            <p className="font-body text-v-muted text-lg max-w-xl leading-relaxed">
              Reach out to our team directly, or fill out the form below. For business inquiries, visit the{" "}
              <a href="/partners#contact" className="text-v-blue hover:underline">For Businesses</a> page.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Team cards */}
      <section className="py-20 bg-white border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Leadership</p>
            <h2 className="font-display font-bold text-v-ink text-3xl">The Team</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((m, i) => (
              <AnimatedSection key={m.email} delay={i * 0.08}>
                <div className="bg-v-bg border border-v-border rounded-2xl p-7 project-card h-full">
                  {/* Photo placeholder — replace div with <Image> when photos are ready */}
                  <div className="w-12 h-12 rounded-full bg-v-green/20 flex items-center justify-center mb-4">
                    <span className="font-display font-bold text-v-green text-lg">{m.initial}</span>
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-lg leading-tight">{m.name}</h3>
                  <p className="font-body text-sm text-v-muted mt-1">{m.role}</p>
                  {m.desc && (
                    <p className="font-body text-sm text-v-muted/80 mt-3 leading-relaxed">{m.desc}</p>
                  )}
                  <a href={`mailto:${m.email}`}
                    className="flex items-center gap-2 mt-4 font-body text-sm text-v-blue hover:underline break-all">
                    <MailIcon className="w-4 h-4 flex-shrink-0" />{m.email}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiry form */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 text-center">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">Send a message</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-3">General Inquiries</h2>
            <p className="font-body text-v-muted">
              Questions, press, partnerships, or anything else — we typically respond within a few days.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <InquiryForm />
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
