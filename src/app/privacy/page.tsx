import type { Metadata } from "next";
import { PRIVACY_POLICY_HTML } from "@/lib/privacyPolicyHtml";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Novus NYC.",
  openGraph: {
    title: "Privacy Policy | Novus NYC",
    description: "Privacy Policy for Novus NYC.",
    images: ["/api/og"],
  },
};

const sanitizedPrivacyHtml = PRIVACY_POLICY_HTML
  .replace(/(<\/li><\/ul>\s*){2,}/g, "</li></ul>")
  .replace(/(<\/a>)<\/a>/g, "$1")
  .replace(/^\s*<\/li><\/ul>\s*$/gm, "")
  .trim();

export default function PrivacyPage() {
  return (
    <main className="bg-n-bg pt-32 pb-20">
      <section className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="mb-12 rounded-[2rem] border border-n-border bg-white px-6 py-8 shadow-[0_18px_50px_rgba(45,40,46,0.08)] md:px-10 md:py-10">
          <p className="font-body text-sm font-semibold uppercase tracking-widest text-n-orange">
            Legal
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-n-ink md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-n-muted">
            This page explains how Novus NYC collects, uses, and protects information
            when you use our website or interact with our services.
          </p>
        </div>

        <article
          className="prose max-w-none rounded-[2rem] border border-n-border bg-white px-6 py-8 font-body text-n-ink shadow-[0_18px_50px_rgba(45,40,46,0.06)] md:px-10 md:py-10"
          dangerouslySetInnerHTML={{ __html: sanitizedPrivacyHtml }}
        />
      </section>
    </main>
  );
}
