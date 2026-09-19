import Link from "next/link";

interface Stat {
  value: string;
  label: string;
  href?: string;
}

const CARD = "home-stat block rounded-2xl border border-white/20 bg-black/35 px-4 py-5 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm md:px-6 md:py-6";

export default function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s) => {
          const content = (
            <>
              <div className="mb-1.5 font-display text-3xl font-bold text-n-orange md:text-4xl">
                {s.value}
              </div>
              <div className="font-body text-[10px] uppercase tracking-[0.14em] text-white/75 md:text-xs">
                {s.label}
                {s.href && <span aria-hidden="true" className="ml-1">→</span>}
              </div>
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className={`${CARD} transition-colors hover:border-n-orange/60 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-orange`}
            >
              {content}
            </Link>
          ) : (
            <div key={s.label} className={CARD}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
