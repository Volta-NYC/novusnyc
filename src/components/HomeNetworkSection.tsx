"use client";

import dynamic from "next/dynamic";
import AnimatedSection from "@/components/AnimatedSection";
import NetworkFluidBackground from "@/components/NetworkFluidBackground";
import { chapterConnections, chapterLocations } from "@/data/network";

const NetworkGlobe = dynamic(() => import("@/components/NetworkGlobe"), {
  ssr: false,
  loading: () => <div className="h-[360px] sm:h-[460px] lg:h-[560px]" aria-hidden="true" />,
});

export default function HomeNetworkSection() {
  return (
    <section className="home-network-section relative overflow-hidden py-20 md:py-24">
      <NetworkFluidBackground />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <AnimatedSection>
          <p className="font-body text-xs font-bold uppercase tracking-[0.22em] text-n-orange">Our network</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Built in New York. Growing beyond it.
          </h2>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-white/70 md:text-lg">
            Novus began in New York City and is growing through student-led chapters in communities across the country.
          </p>

          <div className="mt-8 border-y border-white/10 py-4" aria-label="Novus chapter locations">
            <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              {chapterLocations.length} locations
            </p>
            <p className="mt-2 font-body text-sm leading-6 text-white/65">
              {chapterLocations.map((location, index) => (
                <span key={location.name}>
                  {index > 0 && <span aria-hidden="true"> · </span>}
                  <span className={location.type === "hub" ? "font-semibold text-white" : "text-white/70"}>
                    {location.name}
                  </span>
                  {location.subtitle && <span className="ml-1 text-xs text-n-purple">{location.subtitle}</span>}
                </span>
              ))}
            </p>
            <ul className="sr-only">
              {chapterLocations.map((location) => (
                <li key={location.name}>
                  {location.name}, {location.state}{location.subtitle ? `, ${location.subtitle}` : ""}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-7 max-w-md font-body text-sm leading-relaxed text-white/55">
            From our flagship chapter in New York City, Novus has grown into a nationwide network of student-led teams.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.08} direction="right" className="network-globe-frame">
          <NetworkGlobe locations={chapterLocations} connections={chapterConnections} />
        </AnimatedSection>
      </div>
    </section>
  );
}
