"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.12]);
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -42]);
  const titleScale = useTransform(scrollYProgress, [0, 0.75], [1, 1.34]);
  const titleY = useTransform(scrollYProgress, [0, 0.75], [0, -118]);
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const ctaY = useTransform(scrollYProgress, [0, 0.35], [0, -16]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-v-bg pt-16">
      <motion.div className="absolute inset-0 hero-photo" style={{ scale: bgScale, y: bgY }} />
      <div className="absolute inset-0 hero-photo-wash" />
      <div className="absolute inset-0 hero-vignette pointer-events-none" />

      {/* Title parallax group */}
      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto px-8 flex justify-center"
        style={{ scale: titleScale, y: titleY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="font-display font-bold text-white leading-none tracking-tight"
            style={{
              fontSize: "clamp(4.4rem, 12.8vw, 8.6rem)",
              textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
            }}
          >
            VOLTA NYC
          </h1>
        </motion.div>
      </motion.div>

      {/* Subtitle + CTAs — centered under the title */}
      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto px-8 mt-8 flex flex-col items-center text-center"
        style={{ opacity: ctaOpacity, y: ctaY }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-black/35 backdrop-blur-[2px] px-6 py-6 md:px-8 md:py-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <p className="font-body text-lg md:text-xl text-white/95 max-w-2xl mx-auto leading-relaxed mb-3">
            Digital equity is economic equity. Join a team of students building
            websites, growing social media, and winning grants for NYC&apos;s small
            businesses.{" "}
            <span className="text-v-green font-semibold">Free of charge.</span>
          </p>
          <p className="font-body text-sm text-white/75 mb-8">
            A registered 501(c)(3) nonprofit organization.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/join"
              className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-all hover:scale-[1.03] shadow-xl shadow-black/35"
            >
              Apply to Join →
            </Link>
            <Link
              href="/partners"
              className="border-2 border-white/70 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-white/12 transition-all backdrop-blur-sm"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
