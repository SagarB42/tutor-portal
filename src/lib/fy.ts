// Australian financial year helpers. AU FY runs 1 July → 30 June.
// fyStart=2025 means FY2025/26 (1 Jul 2025 → 30 Jun 2026).

export type FYRange = {
  fyStart: number;
  label: string; // e.g. "FY25/26"
  start: Date; // inclusive
  end: Date; // exclusive
};

export function getCurrentFYStart(today = new Date()): number {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0 = Jan
  // Jan–Jun belong to the FY that started the previous July.
  return m >= 6 ? y : y - 1;
}

export function fyRange(fyStart: number): FYRange {
  const start = new Date(fyStart, 6, 1); // 1 July
  const end = new Date(fyStart + 1, 6, 1); // 1 July next year (exclusive)
  const yy = String(fyStart).slice(-2);
  const yy2 = String(fyStart + 1).slice(-2);
  return { fyStart, label: `FY${yy}/${yy2}`, start, end };
}

export function parseFYParam(
  raw: string | string[] | undefined,
): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = v ? Number.parseInt(v, 10) : NaN;
  if (!Number.isFinite(n) || n < 2000 || n > 2100) return getCurrentFYStart();
  return n;
}

export function availableFYs(earliestDate: Date | null): number[] {
  const current = getCurrentFYStart();
  const earliestFY = earliestDate
    ? getCurrentFYStart(earliestDate)
    : current - 2;
  const out: number[] = [];
  for (let y = current; y >= Math.min(earliestFY, current - 2); y--) out.push(y);
  return out;
}
