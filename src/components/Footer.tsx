import Link from "next/link";
import Image from "next/image";

const neighborhoods = [
  "Park Slope, Brooklyn",
  "Sunnyside, Queens",
  "Chinatown, Manhattan",
  "Long Island City, Queens",
  "Cypress Hills, Brooklyn",
  "Flatbush, Brooklyn",
  "Flushing, Queens",
  "Mott Haven, Bronx",
  "Bayside, Queens",
];

export default function Footer() {
  return (
    <footer className="bg-v-dark text-white/70 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-3 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/logo.png" alt="Volta" width={28} height={28} className="object-contain brightness-200" />
              <span className="font-display font-bold text-lg text-white tracking-tight">VOLTA NYC</span>
            </div>
            <p className="font-body text-sm leading-relaxed text-white/50 mb-5">
              A registered nonprofit connecting student teams with NYC small businesses.
            </p>
            <div className="flex flex-col gap-2">
              <a href="mailto:volta.newyork@gmail.com" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                volta.newyork@gmail.com
              </a>
              <a href="mailto:ethan@voltanpo.org" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                ethan@voltanpo.org
              </a>
              <a href="mailto:andrew@voltanpo.org" className="font-body text-xs text-white/30 hover:text-white/60 transition-colors">
                andrew@voltanpo.org
              </a>
            </div>
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

          {/* Neighborhoods */}
          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Neighborhoods We Serve</p>
            <div className="flex flex-col gap-2">
              {neighborhoods.map((n) => (
                <span key={n} className="font-body text-sm text-white/40 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-v-green flex-shrink-0" />
                  {n}
                </span>
              ))}
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-body text-xs text-white/30">© 2026 Volta NYC. A registered nonprofit organization.</p>
          <p className="font-body text-xs text-white/30">nyc.voltanpo.org — serving NYC&apos;s small business communities</p>
        </div>
      </div>
    </footer>
  );
}
