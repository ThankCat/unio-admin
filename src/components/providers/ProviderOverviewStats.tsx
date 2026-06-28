import type { ReactNode } from "react";
import type { ProviderOpsDetail } from "@/lib/api/providersOps";
import { formatCompact, formatInt } from "@/lib/format";
import { AttemptLatencyCell } from "@/components/ops-tables/AttemptLatencyCell";
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

export function ProviderOverviewStats({ detail }: { detail: ProviderOpsDetail }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Stat label="渠道" value={`${detail.channel_enabled}/${detail.channel_total}`} />
      <Stat label="尝试数" value={formatCompact(detail.attempt_total)} />
      <Stat
        label="成功率"
        value={
          <AttemptSuccessRateCell
            attemptTotal={detail.attempt_total}
            attemptSucceeded={detail.attempt_succeeded}
            successRate={detail.success_rate}
            className="font-heading text-base font-semibold"
          />
        }
      />
      <Stat label="超时" value={formatInt(detail.timeout_total)} />
      <Stat
        label="平均延迟"
        value={
          <AttemptLatencyCell
            latency={detail.latency}
            className="font-heading text-base font-semibold"
          />
        }
      />
    </div>
  );
}

export function ProviderOverviewStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[62px] w-full rounded-md" />
      ))}
    </div>
  );
}
