import Link from "next/link";
import Image from "next/image";
import { MailIcon, LinkedInIcon, InstagramIcon } from "@/components/Icons";

export default function Footer() {
  return (
    <footer className="bg-v-dark text-white/70 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-3 gap-10 mb-12 items-start">

          <div className="flex flex-col items-start">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="Volta" width={52} height={52} className="object-contain" />
              <span className="font-display font-bold text-3xl tracking-tight text-v-green">VOLTA</span>
            </Link>
            <p className="font-body text-sm leading-relaxed text-white/50">
              A registered nonprofit connecting student teams with NYC small businesses.
            </p>
          </div>

          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Navigate</p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/showcase", label: "Our Work" },
                { href: "/about", label: "About" },
                { href: "/partners", label: "For Businesses" },
                { href: "/join", label: "For Students" },
                { href: "/reports", label: "Reports & Case Studies" },
                { href: "/guides", label: "Guides for Businesses" },
                { href: "/updates", label: "Progress Updates" },
                { href: "/members/login", label: "Member Login" },
                { href: "/apply", label: "Apply Now" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="font-body text-sm hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Connect</p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:info@voltanyc.org"
                className="font-body text-sm hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <MailIcon className="w-4 h-4 text-white/50" />
                <span className="text-white/50">Email:</span>
                <span className="text-v-green">info@voltanyc.org</span>
              </a>
              <a
                href="https://www.linkedin.com/company/volta-nyc/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-sm hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <LinkedInIcon className="w-4 h-4 text-white/50" />
                <span className="text-white/50">LinkedIn:</span>
                <span className="text-v-green">Volta NYC</span>
              </a>
              <a
                href="https://www.instagram.com/voltanyc/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-sm hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <InstagramIcon className="w-4 h-4 text-white/50" />
                <span className="text-white/50">Instagram:</span>
                <span className="text-v-green">Volta NYC</span>
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-body text-xs text-white/30">© 2026 Volta NYC. A registered nonprofit organization.</p>
          <p className="font-body text-xs text-white/30"><Link href="/">voltanyc.org</Link></p>
        </div>
      </div>
    </footer>
  );
}
