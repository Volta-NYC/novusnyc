interface Stat {
  value: string;
  label: string;
}

export default function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      <div className="mobile-stat-row grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="home-stat rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-4 py-5 md:px-6 md:py-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          >
            <div className="font-display font-bold text-3xl md:text-4xl text-n-orange mb-1.5">
              {s.value}
            </div>
            <div className="font-body text-[10px] md:text-xs uppercase tracking-[0.14em] text-white/75">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
