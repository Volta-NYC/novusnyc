"use client";

import dynamic from "next/dynamic";
import AnimatedSection from "@/components/AnimatedSection";
import { chapterConnections, chapterLocations } from "@/data/network";

const NetworkGlobe = dynamic(() => import("@/components/NetworkGlobe"), {
  ssr: false,
  loading: () => <div className="h-[360px] sm:h-[460px] lg:h-[560px]" aria-hidden="true" />,
});

export default function HomeNetworkSection() {
  return (
    <section className="home-network-section relative overflow-hidden py-20 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <AnimatedSection>
          <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-n-orange">Our network</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Built in New York. Growing beyond it.
          </h2>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-white/70 md:text-lg">
            Novus began in New York City and is growing through student-led chapters in communities across the country.
          </p>

          <ul className="mt-8 space-y-3" aria-label="Novus chapter locations">
            {chapterLocations.map((location) => (
              <li key={location.name} className="flex items-center gap-3 font-body text-sm text-white/80">
                <span className={`h-2.5 w-2.5 rounded-full ${location.type === "hub" ? "bg-n-purple shadow-[0_0_14px_rgba(190,162,186,0.9)]" : "bg-n-orange shadow-[0_0_12px_rgba(246,183,141,0.75)]"}`} />
                <span className="font-semibold text-white">{location.name}</span>
                {location.subtitle && <span className="text-xs text-white/50">{location.subtitle}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-7 max-w-md font-body text-sm leading-relaxed text-white/55">
            New York City connects directly with our chapters in Boston and Chicago. More locations are on the way.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.08} direction="right" className="network-globe-frame">
          <NetworkGlobe locations={chapterLocations} connections={chapterConnections} />
        </AnimatedSection>
      </div>
    </section>
  );
}
