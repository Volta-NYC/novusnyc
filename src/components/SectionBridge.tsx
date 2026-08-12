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
    <div aria-hidden="true" className={`section-bridge h-7 ${colors.background}`}>
      <div className={`mx-auto flex h-full max-w-7xl items-center px-5 md:px-8 ${align === "right" ? "justify-end" : "justify-start"}`}>
        <span className={`h-px w-20 md:w-32 ${colors.line}`} />
      </div>
    </div>
  );
}
