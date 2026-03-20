import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen md:min-h-[104vh] flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Logo + Title */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-8 flex justify-center">
        <h1
          className="font-display font-bold leading-none tracking-tight"
          style={{
            fontSize: "clamp(4.8rem, 13.6vw, 9.2rem)",
            textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
          }}
        >
          <span className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-2 sm:gap-2.5 md:gap-3.5">
            <Image
              src="/logo.png"
              alt="Volta"
              width={200}
              height={200}
              className="object-contain flex-shrink-0"
              style={{
                width: "clamp(7.6rem, 20vw, 16.8rem)",
                height: "clamp(7.6rem, 20vw, 16.8rem)",
              }}
              priority
            />
            <span className="text-v-green">VOLTA</span>
          </span>
        </h1>
      </div>

      {/* Subtitle + CTAs — centered under the title */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-8 mt-8 flex flex-col items-center text-center">
        <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-black/35 backdrop-blur-[2px] px-6 py-6 md:px-8 md:py-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <p className="font-body text-lg md:text-xl text-white/95 max-w-2xl mx-auto leading-relaxed mb-3">
            Digital equity is economic equity. Join a team of students building
            websites, growing social media, and winning grants for NYC&apos;s small
            businesses.{" "}
            <span className="text-v-green font-semibold">Free of charge.</span>
          </p>
          <p className="font-body text-sm text-white/75 mb-8">
            A registered nonprofit organization.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link
              href="/join"
              className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-all hover:scale-[1.03] shadow-xl shadow-black/35"
            >
              Apply to Join
            </Link>
            <Link
              href="/partners"
              className="border-2 border-white/70 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-white/12 transition-all backdrop-blur-sm"
            >
              Get Free Business Support
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
