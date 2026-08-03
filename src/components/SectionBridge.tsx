import Image from "next/image";

type Tone = "peach" | "lavender" | "yellow";

interface SectionBridgeProps {
  tone: Tone;
  align?: "left" | "right";
}

const toneClasses: Record<Tone, { background: string; line: string }> = {
  peach: { background: "bg-[#fcf3e9]", line: "bg-v-green/45" },
  lavender: { background: "bg-[#f4eff5]", line: "bg-v-blue/45" },
  yellow: { background: "bg-[#fff8df]", line: "bg-v-yellow-dark/55" },
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
