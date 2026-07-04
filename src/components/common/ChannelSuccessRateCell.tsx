import type { SuccessBucket } from "@/lib/api/dashboard";
import { SuccessRateTimeline } from "@/components/common/SuccessRateTimeline";

/**
 * 与概览「表现 → 渠道」成功率列完全一致。
 * 默认 fixed 模式：固定 32 根竖条（每根浅灰底），把最近的有数据桶右对齐填入、其余留空槽。
 * 既保证竖条数量固定、每槽有浅灰底，又不会因 10 分钟时间网格对齐把稀疏数据打散成一片空槽。
 */
export function ChannelSuccessRateCell({
  successRate,
  buckets,
  className,
  barWidthClass,
  bucketMode = "fixed",
}: {
  successRate: number;
  buckets?: SuccessBucket[];
  className?: string;
  barWidthClass?: string;
  bucketMode?: "grid" | "series" | "fixed";
}) {
  return (
    <SuccessRateTimeline
      successRate={successRate}
      buckets={buckets}
      className={className}
      barWidthClass={barWidthClass}
      bucketMode={bucketMode}
    />
  );
}
