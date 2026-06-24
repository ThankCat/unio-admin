import type { HealthBucket } from "@/lib/api/dashboard";

// 渠道/模型/线路健康四档的统一中文标签与 Badge 配色，跨页面复用。
export const HEALTH_LABEL: Record<HealthBucket, string> = {
  healthy: "健康",
  degraded: "降级",
  unhealthy: "不健康",
  no_data: "无数据",
};

export const HEALTH_VARIANT: Record<
  HealthBucket,
  "default" | "secondary" | "destructive" | "outline"
> = {
  healthy: "default",
  degraded: "secondary",
  unhealthy: "destructive",
  no_data: "outline",
};

// 由成功率与样本量推导健康分桶（与后端阈值一致：≥0.95 健康，≥0.80 降级，否则不健康）。
export function healthBucketOf(succeeded: number, total: number): HealthBucket {
  if (total === 0) return "no_data";
  const rate = succeeded / total;
  if (rate >= 0.95) return "healthy";
  if (rate >= 0.8) return "degraded";
  return "unhealthy";
}
