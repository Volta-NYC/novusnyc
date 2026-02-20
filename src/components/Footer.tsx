import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-v-dark text-white/70 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-3 gap-10 mb-12 items-start">

          <div className="flex flex-col items-start">
            <Image src="/logo.png" alt="Volta" width={64} height={64} className="object-contain mb-4" />
            <span className="font-display font-bold text-xl text-white tracking-tight mb-3">VOLTA NYC</span>
            <p className="font-body text-sm leading-relaxed text-white/50">
              A registered nonprofit connecting student teams with NYC small businesses.
            </p>
          </div>

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

          <div>
            <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">Connect</p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:volta.newyork@gmail.com"
                className="font-body text-sm hover:text-white transition-colors"
              >
                <span className="text-white/50">Email: </span>
                <span className="text-v-green">volta.newyork@gmail.com</span>
              </a>
              <a
                href="https://www.linkedin.com/company/volta-nyc/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-sm hover:text-white transition-colors"
              >
                <span className="text-white/50">LinkedIn: </span>
                <span className="text-v-green">volta-nyc</span>
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
