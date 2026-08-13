interface Stat {
  value: string;
  label: string;
}

export default function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      <div className="mobile-stat-row grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="home-stat rounded-2xl border border-white/20 bg-black/35 px-4 py-5 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-sm md:px-6 md:py-6"
          >
            <div className="mb-1.5 font-display text-3xl font-bold text-n-orange md:text-4xl">
              {s.value}
            </div>
            <div className="font-body text-[10px] uppercase tracking-[0.14em] text-white/75 md:text-xs">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
