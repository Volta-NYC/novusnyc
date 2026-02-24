import type { Metadata } from "next";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";
import InquiryForm from "@/components/InquiryForm";
import { teamMembers } from "@/data";

export const metadata: Metadata = {
  title: "Contact | Volta NYC",
  description:
    "Meet the student team behind Volta NYC and reach out directly. We respond to every message.",
  openGraph: {
    title: "Contact | Volta NYC",
    description: "The students running Volta NYC — and how to reach them.",
  },
};

export default function Contact() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-bg pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            <AnimatedSection>
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
                Contact & Team
              </p>
              <h1
                className="font-display font-bold text-v-ink leading-none tracking-tight mb-6"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
              >
                The people<br />
                <span className="text-v-green">behind Volta.</span>
              </h1>
            </AnimatedSection>
            <AnimatedSection direction="right" className="md:pt-14">
              <p className="font-body text-v-ink text-lg leading-relaxed mb-4">
                Volta NYC is run entirely by high school and college students.
                We&apos;re the ones answering emails, scoping projects, and
                doing the work.
              </p>
              <p className="font-body text-v-muted text-base leading-relaxed">
                For business inquiries, visit our{" "}
                <a href="/partners#contact" className="text-v-blue hover:underline">
                  For Businesses
                </a>{" "}
                page. For everything else — questions, press, school partnerships
                — reach out below or email a team member directly.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── TEAM ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Leadership
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              The Team
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {teamMembers.map((m, i) => (
              <AnimatedSection key={m.email} delay={i * 0.08}>
                <div className="bg-v-bg border border-v-border rounded-2xl overflow-hidden project-card h-full flex flex-col">
                  <div className="aspect-[3/4] bg-v-border flex items-center justify-center overflow-hidden">
                    {m.photo ? (
                      <Image src={m.photo} alt={m.name} width={400} height={533} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="font-display font-bold text-v-muted/40 text-6xl">{m.initial}</span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-v-ink text-lg leading-tight">
                      {m.name}
                    </h3>
                    <p className="font-body text-sm text-v-muted mt-1">{m.role}</p>
                    {m.desc && <p className="font-body text-sm text-v-muted/60 italic mt-3 leading-relaxed flex-1">{m.desc}</p>}
                    <a
                      href={`mailto:${m.email}`}
                      className="flex items-center gap-2 mt-4 font-body text-sm text-v-blue hover:underline break-all"
                    >
                      <MailIcon className="w-4 h-4 flex-shrink-0" />
                      {m.email}
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM ─────────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Send a message
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-3">
              General Inquiries
            </h2>
            <p className="font-body text-v-muted">
              Questions, press, partnerships, or anything else — we respond to
              every message.
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
