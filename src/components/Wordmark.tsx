import { sora } from "@/lib/fonts";

/**
 * The NOVUS wordmark.
 */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`${sora.className} inline-block font-bold ${className}`}
      style={{ letterSpacing: "-0.02em" }}
    >
      NOVUS
    </span>
  );
}
