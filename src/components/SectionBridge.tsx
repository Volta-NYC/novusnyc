import Image from "next/image";

type Tone = "peach" | "lavender" | "yellow";

interface SectionBridgeProps {
  tone: Tone;
  align?: "left" | "right";
}

const toneClasses: Record<Tone, { background: string; line: string }> = {
  peach: { background: "bg-[#fef6f0]", line: "bg-n-orange/35" },
  lavender: { background: "bg-[#f9f5f8]", line: "bg-n-purple/35" },
  yellow: { background: "bg-[#fffbea]", line: "bg-n-yellow-dark/40" },
};

export default function SectionBridge({ tone, align = "left" }: SectionBridgeProps) {
  const colors = toneClasses[tone];

  return (
    <div aria-hidden="true" className={`section-bridge h-11 ${colors.background}`}>
      <div className={`mx-auto flex h-full max-w-7xl items-center gap-3 px-5 md:px-8 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className={`h-px flex-1 ${colors.line}`} />
        <Image
          src="/logo.png"
          alt=""
          width={223}
          height={200}
          className="h-8 w-auto object-contain opacity-80"
        />
        <span className={`h-px w-12 md:w-20 ${colors.line}`} />
      </div>
    </div>
  );
}
