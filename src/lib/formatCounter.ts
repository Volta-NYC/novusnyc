export function formatCounter(count: number, exact?: boolean): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  if (exact) return `${safeCount}`;
  const rounded = Math.ceil(safeCount / 10) * 10;
  return `${rounded}+`;
}
