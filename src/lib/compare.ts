// 趋势环比：相对变化与成功率百分点变化。

export function relativeChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return (current - previous) / previous;
}

export function formatRelativeChange(change: number | null | undefined): string {
  if (change == null || !Number.isFinite(change)) return "—";
  if (change === 0) return "0%";
  const pct = change * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatRatePointChange(current: number, previous: number): string {
  const pp = (current - previous) * 100;
  if (!Number.isFinite(pp) || pp === 0) return "0pp";
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)}pp`;
}

export type CompareIntent = "default" | "success" | "warning" | "danger";

export function compareIntentHigherIsBetter(
  change: number | null | undefined,
): CompareIntent {
  if (change == null || change === 0) return "default";
  return change > 0 ? "success" : "danger";
}

export function compareIntentLowerIsBetter(
  change: number | null | undefined,
): CompareIntent {
  if (change == null || change === 0) return "default";
  return change < 0 ? "success" : "danger";
}
