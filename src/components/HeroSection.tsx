"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const titleScale = useTransform(scrollYProgress, [0, 0.75], [1, 1.55]);
  const titleY = useTransform(scrollYProgress, [0, 0.75], [0, -180]);
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.28], [1, 0]);
  const ctaY = useTransform(scrollYProgress, [0, 0.28], [0, -24]);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-v-bg pt-16">
      <div className="absolute inset-0 dot-grid opacity-60" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-v-green/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-72 h-72 bg-v-blue/8 rounded-full blur-3xl pointer-events-none" />

      {/* Logo + Title parallax group */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        style={{ scale: titleScale, y: titleY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo inline with VOLTA on same line, NYC below */}
          <h1
            className="font-display font-bold text-v-ink leading-none tracking-tight"
            style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}
          >
            {/* Row 1: logo + VOLTA */}
            <span className="flex items-center justify-center gap-4 md:gap-6 leading-none">
              <Image
                src="/logo.png"
                alt="Volta"
                width={80}
                height={80}
                className="object-contain flex-shrink-0"
                style={{ width: "clamp(52px, 8vw, 90px)", height: "clamp(52px, 8vw, 90px)" }}
                priority
              />
              VOLTA
            </span>
            {/* Row 2: NYC */}
            <span className="block text-v-green">NYC</span>
          </h1>
        </motion.div>
      </motion.div>

      {/* Subtitle + CTAs */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-5 max-w-3xl mx-auto mt-8"
        style={{ opacity: ctaOpacity, y: ctaY }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-body text-lg md:text-xl text-v-muted max-w-2xl leading-relaxed mb-3">
          High school and college students building websites, running social
          media, and writing grants for NYC small businesses.{" "}
          <span className="text-v-ink font-semibold">Free of charge.</span>
        </p>
        <p className="font-body text-sm text-v-muted/70 mb-8">
          A registered 501(c)(3) nonprofit organization.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/join"
            className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-all hover:scale-105 shadow-lg shadow-v-green/20"
          >
            Apply to Join →
          </Link>
          <Link
            href="/partners"
            className="border-2 border-v-blue text-v-blue font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-blue hover:text-white transition-all"
          >
            Partner With Us
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
