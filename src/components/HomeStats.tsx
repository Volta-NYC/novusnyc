interface Stat {
  value: string;
  label: string;
}

export default function HomeStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="home-stat rounded-xl border border-white/15 bg-white/[0.04] px-3 py-4 text-center md:px-5 md:py-5"
          >
            <div className="mb-1.5 font-display text-3xl font-bold text-n-orange md:text-4xl">
              {s.value}
            </div>
            <div className="font-body text-[10px] uppercase tracking-[0.12em] text-white/80 md:text-xs md:tracking-[0.14em]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
