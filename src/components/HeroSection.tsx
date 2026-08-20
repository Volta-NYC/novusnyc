"use client";

import Image from "next/image";
import Wordmark from "@/components/Wordmark";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import heroSkyline from "../../public/hero-nyc-skyline.jpg";
import { useParallax } from "@/hooks/useParallax";

export default function HeroSection({ children }: { children?: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const { y: backgroundY, enabled: backgroundParallaxEnabled } = useParallax(sectionRef, {
    range: [0, 170],
    offset: ["start start", "end start"],
  });
  const { y: statsY, enabled: statsParallaxEnabled } = useParallax(sectionRef, {
    range: [0, -80],
    offset: ["start start", "end start"],
  });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], isDesktop ? [0, -170] : [0, -32]);
  const contentY = useTransform(scrollYProgress, [0, 1], isDesktop ? [0, -110] : [0, -20]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.72, 1], isDesktop ? [1, 1, 0.15] : [1, 1, 0.88]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.78, 1], isDesktop ? [1, 1, 0] : [1, 1, 0.82]);

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
          y: backgroundY,
          willChange: backgroundParallaxEnabled ? "transform" : "auto",
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
          sizes="100vw"
          className="object-cover object-top"
        />
      </motion.div>
      <div className="absolute inset-0 home-shared-wash" />
      <div className="absolute inset-0 hero-vignette opacity-70 pointer-events-none" />

      <div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-5 pb-16 pt-28 sm:pb-20 sm:pt-32 md:pb-24 md:pt-36">
        <motion.div
          className="relative z-10 flex w-full max-w-6xl justify-center"
          style={{
            y: backgroundParallaxEnabled ? titleY : 0,
            opacity: backgroundParallaxEnabled ? titleOpacity : 1,
            willChange: backgroundParallaxEnabled ? "transform, opacity" : "auto",
          }}
        >
          <div
            aria-hidden="true"
            className="flex flex-col items-center gap-2 md:hidden"
            style={{ textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)" }}
          >
            <Image
              src="/logo.png"
              alt=""
              width={223}
              height={200}
              className="h-[clamp(4.75rem,21.5vw,5.75rem)] w-auto translate-x-[3%] object-contain"
              priority
            />
            <Wordmark className="text-[clamp(4rem,17.5vw,4.5rem)] leading-none text-n-orange" />
          </div>

          <div
            aria-hidden="true"
            className="hidden font-display font-bold leading-none tracking-tight md:block"
            style={{
              fontSize: "clamp(4.4rem, 8.8vw, 8rem)",
              textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
            }}
          >
            <span className="flex items-center gap-3 text-left sm:gap-5">
              <Image
                src="/logo.png"
                alt=""
                width={223}
                height={200}
                className="object-contain flex-shrink-0 w-auto"
                style={{
                  height: "clamp(4.7rem, 9.25vw, 8.4rem)",
                  transform: "translateY(-7%)",
                }}
                priority
              />
              <Wordmark className="text-n-orange" />
            </span>
          </div>
        </motion.div>

        <motion.div
          className="relative z-10 mt-7 flex w-full max-w-5xl flex-col items-center text-center sm:mt-8 md:mt-10"
          style={{
            y: backgroundParallaxEnabled ? contentY : 0,
            opacity: backgroundParallaxEnabled ? contentOpacity : 1,
            willChange: backgroundParallaxEnabled ? "transform, opacity" : "auto",
          }}
        >
          <h1 className="max-w-[24ch] font-display text-[clamp(1.65rem,3.35vw,2.85rem)] font-bold leading-[1.08] tracking-[-0.03em] text-white [text-shadow:0_8px_28px_rgba(0,0,0,0.65)]">
            Free websites and marketing support for NYC small businesses.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.75)] md:text-lg">
            Built by student teams. Businesses get practical help, and students gain experience they can use in applications and interviews.
          </p>
          <div className="mt-7 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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

      <motion.div
        className="relative z-10 w-full"
        style={{
          y: statsY,
          willChange: statsParallaxEnabled ? "transform" : "auto",
        }}
      >
        {children}
      </motion.div>
    </section>
  );
}
