export function formatCounter(count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  const scaled = safeCount * 1.2;
  const rounded = Math.ceil(scaled / 10) * 10;
  return `${rounded}+`;
}
