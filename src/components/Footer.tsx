import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-v-dark text-white/70 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-3 gap-10 mb-12 items-start">

          {/* Brand — bigger logo */}
          <div className="flex flex-col items-start">
            <Image src="/logo.png" alt="Volta" width={64} height={64} className="object-contain brightness-200 mb-4" />
            <span className="font-display font-bold text-xl text-white tracking-tight mb-3">VOLTA NYC</span>
            <p className="font-body text-sm leading-relaxed text-white/50">
              A registered nonprofit connecting student teams with NYC small businesses.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Navigate</p>
            <div className="flex flex-col gap-3">
              {[
                { href: "/", label: "Home" },
                { href: "/showcase", label: "Our Work" },
                { href: "/join", label: "Join Volta" },
                { href: "/partners", label: "For Businesses" },
                { href: "/about", label: "About" },
                { href: "/contact", label: "Contact" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="font-body text-sm hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact us */}
          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Contact Us</p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:volta.newyork@gmail.com"
                className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/25 text-white/80 hover:text-white font-body text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                volta.newyork@gmail.com
              </a>
              <a
                href="https://www.linkedin.com/company/volta-nyc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/25 text-white/80 hover:text-white font-body text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-body text-xs text-white/30">© 2026 Volta NYC. A registered nonprofit organization.</p>
          <p className="font-body text-xs text-white/30">nyc.voltanpo.org</p>
        </div>
      </div>
    </footer>
  );
}
