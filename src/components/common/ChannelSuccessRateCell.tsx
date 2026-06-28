import type { SuccessBucket } from "@/lib/api/dashboard";
import { SuccessRateTimeline } from "@/components/common/SuccessRateTimeline";

/** 与概览「表现 → 渠道」成功率列完全一致。 */
export function ChannelSuccessRateCell({
  successRate,
  buckets,
  className,
  barWidthClass,
}: {
  successRate: number;
  buckets?: SuccessBucket[];
  className?: string;
  barWidthClass?: string;
}) {
  return (
    <SuccessRateTimeline
      successRate={successRate}
      buckets={buckets}
      className={className}
      barWidthClass={barWidthClass}
    />
  );
}
