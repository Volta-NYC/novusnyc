import Image from "next/image";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ArrowUpRightIcon, InstagramIcon, LinkedInIcon, MailIcon } from "@/components/Icons";
import { EMAIL } from "@/lib/mail";
import { SOCIAL } from "@/lib/social";

const footerLinks = [
  { href: "/showcase", label: "Our Work" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "For Businesses" },
  { href: "/join", label: "For Students" },
  { href: "/members/login", label: "Member Login" },
  { href: "/apply", label: "Apply Now" },
];

export default function Footer() {
  return (
    <footer className="site-footer relative overflow-hidden bg-n-dark py-14 text-white/70 md:py-16">
      {/*
        The top-left glow used to center at 8% 0% — exactly on the seam where a
        preceding bg-n-dark section (showcase/partners/impact CTAs) meets the
        footer. That put the gradient's steepest falloff right on the boundary
        line, which read as a visible seam between two "identical" dark
        surfaces. Moving the center down and widening the falloff keeps the
        glow but removes the hard edge at the exact seam.
      */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(190,162,186,0.12),transparent_42%),radial-gradient(circle_at_90%_100%,rgba(246,183,141,0.12),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain sm:h-[4.5rem]" />
              <Wordmark className="text-4xl text-n-orange sm:text-5xl" />
            </Link>
            <p className="mt-5 font-body text-sm leading-relaxed text-white/55">
              A New York nonprofit connecting student teams with NYC small businesses.
            </p>
          </div>

          <div className="max-w-sm lg:pb-1 lg:text-right">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-n-orange">Get involved</p>
            <p className="mt-2 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
              Support for businesses. Real client work for students.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/partners"
                className="inline-flex items-center gap-2 rounded-full bg-n-orange px-4 py-2.5 font-body text-sm font-semibold text-n-ink transition-transform hover:-translate-y-0.5"
              >
                Get business support
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-white/35 hover:text-white"
              >
                Join as a student
              </Link>
            </div>
          </div>
        </div>

        <nav aria-label="Footer" className="mt-12 border-y border-white/10 py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-body text-sm text-white/60 transition-colors hover:text-n-orange">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-xs text-white/35">© 2026 Novus Inc.</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${EMAIL.info}`}
              className="inline-flex items-center gap-2 font-body text-xs text-n-orange/85 transition-colors hover:text-n-orange"
            >
              <MailIcon className="h-4 w-4" />
              {EMAIL.info}
            </a>
            <a
              href={SOCIAL.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Novus NYC on LinkedIn"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-n-purple/35 text-n-purple transition-colors hover:border-n-purple hover:bg-n-purple/10"
            >
              <LinkedInIcon className="h-4 w-4" />
            </a>
            <a
              href={SOCIAL.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Novus NYC on Instagram"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-n-yellow/35 text-n-yellow transition-colors hover:border-n-yellow hover:bg-n-yellow/10"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <Link href="/privacy" className="font-body text-xs text-n-orange/75 transition-colors hover:text-n-orange">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
