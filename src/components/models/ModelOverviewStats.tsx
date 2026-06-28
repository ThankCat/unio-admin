import type { ReactNode } from "react";
import type { ModelOpsDetail } from "@/lib/api/modelsOps";
import { formatCompact, formatLatencyMs, formatPercent, formatTPS } from "@/lib/format";
import { AttemptSuccessRateCell } from "@/components/ops-tables/AttemptSuccessRateCell";
import { Skeleton } from "@/components/ui/skeleton";

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function ModelOverviewStats({
  detail,
  revenueUsd,
  marginUsd,
  marginRate,
}: {
  detail: ModelOpsDetail;
  revenueUsd?: string;
  marginUsd?: string;
  marginRate?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Stat label="请求" value={formatCompact(detail.request_total)} />
      <Stat
        label="成功率"
        value={
          <AttemptSuccessRateCell
            attemptTotal={detail.request_total}
            attemptSucceeded={detail.request_succeeded}
            successRate={detail.success_rate}
            className="font-heading text-base font-semibold"
          />
        }
      />
      <Stat label="P95 延迟" value={formatLatencyMs(detail.latency_p95)} />
      <Stat label="TPS" value={formatTPS(detail.tps)} />
      <Stat label="缓存命中率" value={formatPercent(detail.cache_read_rate)} />
      <Stat label="输出 Token" value={formatCompact(detail.output_tokens)} />
      <Stat label="收入 (USD)" value={revenueUsd ? `$${revenueUsd}` : "—"} />
      <Stat label="毛利 (USD)" value={marginUsd ? `$${marginUsd}` : "—"} />
      <Stat
        label="毛利率"
        value={marginRate != null ? formatPercent(marginRate) : "—"}
      />
    </div>
  );
}

export function ModelOverviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-[62px] w-full rounded-md" />
      ))}
    </div>
  );
}
