"use client";

import dynamic from "next/dynamic";
import type { PublicPartnership } from "@/data/partnerships";

// Client-only so reduced-motion is known before the first frame and the
// draw-in never renders once on the server and again on the client.
const IntroductionMap = dynamic(() => import("./IntroductionMap"), {
  ssr: false,
  loading: () => <div className="aspect-[1000/680] w-full" aria-hidden="true" />,
});

export default function IntroductionMapSection({ partners, describedBy }: { partners: PublicPartnership[]; describedBy: string }) {
  return <IntroductionMap partners={partners} describedBy={describedBy} />;
}
