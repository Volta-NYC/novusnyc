import Image from "next/image";

type Tone = "peach" | "lavender" | "yellow";

interface SectionBridgeProps {
  tone: Tone;
  align?: "left" | "right";
}

const toneClasses: Record<Tone, { background: string; line: string }> = {
  peach: { background: "bg-[#fef6f0]", line: "bg-v-green/35" },
  lavender: { background: "bg-[#f9f5f8]", line: "bg-v-blue/35" },
  yellow: { background: "bg-[#fffbea]", line: "bg-v-yellow-dark/40" },
};

export default function SectionBridge({ tone, align = "left" }: SectionBridgeProps) {
  const colors = toneClasses[tone];

  return (
    <div aria-hidden="true" className={`h-11 ${colors.background}`}>
      <div className={`mx-auto flex h-full max-w-7xl items-center gap-3 px-5 md:px-8 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className={`h-px flex-1 ${colors.line}`} />
        <Image
          src="/logo.png"
          alt=""
          width={32}
          height={42}
          className="h-8 w-auto object-contain opacity-80"
        />
        <span className={`h-px w-12 md:w-20 ${colors.line}`} />
      </div>
    </div>
  );
}
