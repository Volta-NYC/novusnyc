"use client";

import Image from "next/image";
import Wordmark from "@/components/Wordmark";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import heroSkyline from "../../public/hero-nyc-skyline.jpg";
import { useParallax } from "@/hooks/useParallax";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const { y: backgroundY, enabled: parallaxEnabled } = useParallax(sectionRef, {
    range: [-120, 170],
    offset: ["start start", "end start"],
  });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -170]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 1, 0.15]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return (
    <section ref={sectionRef} className="home-depth-section home-hero-depth relative overflow-hidden bg-[#17151a]">
      <motion.div
        aria-hidden="true"
        className="absolute -inset-y-[34vh] inset-x-0"
        style={{
          y: isDesktop && parallaxEnabled ? backgroundY : 0,
          willChange: isDesktop && parallaxEnabled ? "transform" : "auto",
        }}
      >
        <Image
          src={heroSkyline}
          alt=""
          fill
          priority
          fetchPriority="high"
          placeholder="blur"
          quality={72}
          sizes="(max-width: 768px) 1200px, (max-width: 1280px) 1800px, 2400px"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 home-shared-wash" />
      <div className="absolute inset-0 hero-vignette opacity-70 pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center px-5 pb-16 pt-28 sm:pb-20 sm:pt-32 md:pb-24 md:pt-40">
        <motion.div
          className="relative z-10 flex w-full max-w-5xl justify-center"
          style={{
            y: isDesktop && parallaxEnabled ? titleY : 0,
            opacity: isDesktop && parallaxEnabled ? titleOpacity : 1,
            willChange: isDesktop && parallaxEnabled ? "transform, opacity" : "auto",
          }}
        >
          <div
            aria-hidden="true"
            className="font-display font-bold leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
            }}
          >
            <span className="flex items-center gap-3 text-left sm:gap-4">
              <Image
                src="/logo.png"
                alt=""
                width={223}
                height={200}
                className="object-contain flex-shrink-0 w-auto"
                style={{
                  height: "clamp(2.5rem, 5.4vw, 4.15rem)",
                  transform: "translateY(-7%)",
                }}
                priority
              />
              <Wordmark className="text-n-orange" />
            </span>
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 mt-10 flex w-full max-w-5xl flex-col items-center text-center md:mt-12"
          style={{
            y: isDesktop && parallaxEnabled ? contentY : 0,
            opacity: isDesktop && parallaxEnabled ? contentOpacity : 1,
            willChange: isDesktop && parallaxEnabled ? "transform, opacity" : "auto",
          }}
        >
          <h1 className="max-w-4xl font-display text-[clamp(2.35rem,7vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.04em] text-white [text-shadow:0_8px_28px_rgba(0,0,0,0.65)]">
            Real experience for students. Real support for NYC small businesses.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/95 [text-shadow:0_2px_12px_rgba(0,0,0,0.75)] md:text-xl">
            Student teams build websites and provide marketing support for New York City
            small businesses, completely free.
          </p>
          <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Link
              href="/join"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-transparent bg-n-orange px-6 py-4 font-display text-base font-bold text-n-ink shadow-xl shadow-black/35 transition-all hover:scale-[1.02] hover:bg-n-orange-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            >
              Join as a Student
            </Link>
            <Link
              href="/partners"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border-2 border-transparent bg-n-yellow px-6 py-4 font-display text-base font-bold text-n-ink shadow-xl shadow-black/35 transition-all hover:scale-[1.02] hover:bg-n-yellow-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            >
              Get Free Business Support
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
