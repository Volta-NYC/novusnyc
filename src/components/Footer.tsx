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
  { href: "/reports", label: "Reports & Case Studies" },
  { href: "/guides", label: "Guides for Businesses" },
  { href: "/members/login", label: "Member Login" },
  { href: "/apply", label: "Apply Now" },
];

export default function Footer() {
  return (
    <footer className="site-footer relative overflow-hidden bg-n-dark py-14 text-white/70 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(190,162,186,0.16),transparent_34%),radial-gradient(circle_at_91%_88%,rgba(246,183,141,0.13),transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[0.9fr_1.5fr] lg:gap-20">
          <div className="flex max-w-sm flex-col items-start">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-14 w-auto object-contain" />
              <Wordmark className="text-3xl text-n-orange" />
            </Link>
            <p className="mt-5 font-body text-sm leading-relaxed text-white/55">
              A New York nonprofit connecting student teams with NYC small businesses.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/partners"
                className="inline-flex items-center gap-2 rounded-full bg-n-orange px-4 py-2.5 font-body text-sm font-semibold text-n-ink transition-transform hover:-translate-y-0.5"
              >
                Work with us
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-white/35 hover:text-white"
              >
                Join Novus
              </Link>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-[1.2fr_0.9fr] sm:gap-12">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/45">Explore Novus</p>
              <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
                {footerLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="font-body text-sm text-white/65 transition-colors hover:text-n-orange">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white/45">Stay Connected</p>
              <div className="mt-5 flex flex-col gap-3">
                <a
                  href={`mailto:${EMAIL.info}`}
                  className="inline-flex items-center gap-2 font-body text-sm transition-colors hover:text-white"
                >
                  <MailIcon className="h-4 w-4 text-white/50" />
                  <span className="text-n-orange">{EMAIL.info}</span>
                </a>
                <a
                  href={SOCIAL.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-sm transition-colors hover:text-white"
                >
                  <LinkedInIcon className="h-4 w-4 text-white/50" />
                  <span className="text-n-purple">LinkedIn</span>
                </a>
                <a
                  href={SOCIAL.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-sm transition-colors hover:text-white"
                >
                  <InstagramIcon className="h-4 w-4 text-white/50" />
                  <span className="text-n-yellow">Instagram</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-xs text-white/35">© 2026 Novus Inc.</p>
          <div className="flex items-center gap-5 font-body text-xs text-white/35">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/" className="transition-colors hover:text-white">novusnyc.org</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
