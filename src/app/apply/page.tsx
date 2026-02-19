import AnimatedSection from "@/components/AnimatedSection";
import ApplicationForm from "@/components/ApplicationForm";

export default function Apply() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-v-green/10 rounded-full blur-3xl" />
        <div className="relative max-w-2xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Apply Now</p>
            <h1 className="font-display font-bold text-v-ink leading-none tracking-tight mb-4" style={{ fontSize: "clamp(2.2rem, 6vw, 4rem)" }}>
              Join Volta NYC
            </h1>
            <p className="font-body text-v-muted text-lg leading-relaxed">
              High school and college students. Real projects for real businesses. 2–4 hours a week, fully remote. Takes about 5 minutes to apply.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="pb-24 bg-v-bg">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <ApplicationForm />
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
