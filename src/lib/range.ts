// 运维控制台共用的时间区间模型（§3.1：5m / 1h / 24h / 7d / 30d；默认 24h）。
// 后端 from/to 为 RFC3339，半开区间 [from, to)。

export type RangePreset =
  | "5m"
  | "1h"
  | "24h"
  | "7d"
  | "30d"
  | "custom";

export type RangeBucket = "minute" | "hour" | "day";

export interface RangeValue {
  preset: RangePreset;
  // 仅 custom 使用；RFC3339（UTC）。
  from?: string;
  to?: string;
}

export const RANGE_PRESETS: {
  value: Exclude<RangePreset, "custom">;
  label: string;
}[] = [
  { value: "5m", label: "5m" },
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export const DEFAULT_RANGE: RangeValue = { preset: "24h" };

// 把区间解析为后端查询参数。
export function rangeParams(v: RangeValue): { from?: string; to?: string } {
  if (v.preset === "custom") {
    return { from: v.from, to: v.to };
  }
  const to = new Date();
  const from = new Date(to);
  switch (v.preset) {
    case "5m":
      from.setMinutes(from.getMinutes() - 5);
      break;
    case "1h":
      from.setHours(from.getHours() - 1);
      break;
    case "24h":
      from.setHours(from.getHours() - 24);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

// 趋势/聚合桶粒度：5分钟/1小时 → minute；24小时/7天 → hour；30天 → day。
export function rangeBucket(v: RangeValue): RangeBucket {
  if (v.preset === "30d") return "day";
  if (v.preset === "5m" || v.preset === "1h") {
    return "minute";
  }
  if (v.preset === "custom" && v.from && v.to) {
    const days =
      (new Date(v.to).getTime() - new Date(v.from).getTime()) / 86_400_000;
    if (days <= 1 / 24) return "minute";
    return days > 8 ? "day" : "hour";
  }
  return "hour";
}

// 上一等长周期 [from - duration, from)，用于趋势环比。
export function previousPeriodParams(params: {
  from?: string;
  to?: string;
}): { from: string; to: string } | null {
  if (!params.from || !params.to) return null;
  const fromMs = new Date(params.from).getTime();
  const toMs = new Date(params.to).getTime();
  const duration = toMs - fromMs;
  if (duration <= 0) return null;
  return {
    from: new Date(fromMs - duration).toISOString(),
    to: new Date(fromMs).toISOString(),
  };
}
