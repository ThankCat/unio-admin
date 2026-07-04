import { cn } from "@/lib/utils";
import type { SuccessBucket } from "@/lib/api/dashboard";
import { formatInt, formatPercent } from "@/lib/format";

export const SUCCESS_BUCKETS_VISIBLE = 16;
export const SUCCESS_BUCKET_INTERVAL_MS = 10 * 60 * 1000;

function successRateBarClass(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "bg-muted-foreground/30";
  const pct = rate * 100;
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 90) return "bg-emerald-400";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

export function successRateTextClass(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "text-muted-foreground";
  const pct = rate * 100;
  if (pct >= 100) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 90) return "text-emerald-500 dark:text-emerald-300";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function successRateBarHeightClass(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "h-[40%]";
  const pct = rate * 100;
  if (pct >= 99.9) return "h-[96%]";
  if (pct >= 99) return "h-[88%]";
  if (pct >= 95) return "h-[72%]";
  if (pct >= 90) return "h-[55%]";
  return "h-[40%]";
}

function formatBucketTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

type DisplaySuccessBucket = {
  key: string;
  bucket: string;
  value: SuccessBucket | null;
};

function bucketKey(value: string): string | null {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return String(Math.floor(time / SUCCESS_BUCKET_INTERVAL_MS));
}

export function displaySuccessBuckets(buckets: SuccessBucket[]): DisplaySuccessBucket[] {
  const valid = buckets
    .filter((bucket) => bucketKey(bucket.bucket) != null)
    .slice(-SUCCESS_BUCKETS_VISIBLE);
  if (valid.length === 0) return [];

  const byKey = new Map<string, SuccessBucket>();
  for (const bucket of valid) {
    const key = bucketKey(bucket.bucket);
    if (key != null) byKey.set(key, bucket);
  }

  const last = valid[valid.length - 1];
  const lastTime = new Date(last.bucket).getTime();
  const startTime =
    lastTime - (SUCCESS_BUCKETS_VISIBLE - 1) * SUCCESS_BUCKET_INTERVAL_MS;

  return Array.from({ length: SUCCESS_BUCKETS_VISIBLE }, (_, index) => {
    const time = startTime + index * SUCCESS_BUCKET_INTERVAL_MS;
    const key = String(Math.floor(time / SUCCESS_BUCKET_INTERVAL_MS));
    return {
      key,
      bucket: new Date(time).toISOString(),
      value: byKey.get(key) ?? null,
    };
  });
}

/** 按实际时序点逐柱渲染（用于小时/天桶的性能 API，不做 10 分钟网格对齐）。 */
export function displaySeriesBuckets(
  buckets: SuccessBucket[],
  max = SUCCESS_BUCKETS_VISIBLE,
): DisplaySuccessBucket[] {
  return [...buckets]
    .filter((bucket) => Number.isFinite(bucket.success_rate))
    .sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime())
    .slice(-max)
    .map((value, index) => ({
      key: `${value.bucket}-${index}`,
      bucket: value.bucket,
      value,
    }));
}

/**
 * 固定槽位渲染：始终 `slots` 根竖条（每根浅灰底），取最近 `slots` 个「有数据」的桶
 * 按时序右对齐填入，其余为左侧空槽。兼顾「数量固定 + 每槽浅灰底 + 有数据处着色」，
 * 且不因 10 分钟时间网格对齐把稀疏数据打散成一片空槽。无任何数据时返回空（只显示百分比）。
 */
export function displayFixedBuckets(
  buckets: SuccessBucket[],
  slots = SUCCESS_BUCKETS_VISIBLE,
): DisplaySuccessBucket[] {
  const valid = [...buckets]
    .filter((bucket) => Number.isFinite(bucket.success_rate))
    .sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime())
    .slice(-slots);
  if (valid.length === 0) return [];

  const out: DisplaySuccessBucket[] = [];
  for (let i = 0; i < slots - valid.length; i++) {
    out.push({ key: `empty-${i}`, bucket: "", value: null });
  }
  valid.forEach((value, index) => {
    out.push({ key: `${value.bucket}-${index}`, bucket: value.bucket, value });
  });
  return out;
}

/** 将性能时序点转为成功率桶（用于渠道详情等无 breakdown API 的场景）。 */
export function perfPointsToSuccessBuckets(
  points: Array<{ bucket: string; attempt_total: number; attempt_succeeded: number }>,
): SuccessBucket[] {
  return points
    .filter((p) => p.attempt_total > 0)
    .map((p) => ({
      bucket: p.bucket,
      terminal: p.attempt_total,
      succeeded: p.attempt_succeeded,
      success_rate: p.attempt_succeeded / p.attempt_total,
    }));
}

export function SuccessRateTimeline({
  successRate,
  buckets,
  className,
  barWidthClass = "w-32",
  layout = "compact",
  showPercent = true,
  bucketMode = "grid",
}: {
  successRate: number;
  buckets?: SuccessBucket[];
  className?: string;
  barWidthClass?: string;
  /** compact：表格单元格；strip：详情卡片内条带 */
  layout?: "compact" | "strip";
  /** 为 false 时只渲染柱形图（百分比由外部组件展示） */
  showPercent?: boolean;
  /** grid：10 分钟网格对齐；series：时序点逐柱；fixed：固定槽位（右对齐 + 空槽浅灰底） */
  bucketMode?: "grid" | "series" | "fixed";
}) {
  const filtered = (buckets ?? []).filter((bucket) =>
    Number.isFinite(bucket.success_rate),
  );
  const displayBuckets =
    bucketMode === "series"
      ? displaySeriesBuckets(filtered)
      : bucketMode === "fixed"
        ? displayFixedBuckets(filtered)
        : displaySuccessBuckets(filtered);

  const percent = (
    <span
      className={cn(
        "tabular-nums",
        successRateTextClass(successRate),
        layout === "strip" && "font-heading text-sm font-semibold sm:text-base",
      )}
    >
      {formatPercent(successRate)}
    </span>
  );

  if (displayBuckets.length === 0) {
    if (!showPercent) return null;
    return (
      <span
        className={cn(
          "tabular-nums",
          successRateTextClass(successRate),
          layout === "strip" && "font-heading text-sm font-semibold sm:text-base",
          className,
        )}
      >
        {formatPercent(successRate)}
      </span>
    );
  }

  const bars = (
    <div
      className={cn(
        "flex h-4 min-w-0 items-end gap-px overflow-hidden",
        // compact：填满 grid 的 1fr 轨道并随列宽收缩裁剪，避免固定宽度溢出压到右侧百分比。
        layout === "strip" ? "h-5 flex-1" : "w-full",
      )}
    >
      {displayBuckets.map((bucket) => (
        <span
          key={bucket.key}
          className="bg-muted-foreground/15 relative h-full w-[3px] shrink-0 overflow-hidden rounded-sm"
          title={
            bucket.value
              ? `${formatBucketTime(bucket.value.bucket)} · ${formatPercent(
                  bucket.value.success_rate,
                )} · ${formatInt(bucket.value.succeeded)}/${formatInt(
                  bucket.value.terminal,
                )}`
              : `${formatBucketTime(bucket.bucket)} · 无请求`
          }
          aria-label={
            bucket.value
              ? `${formatBucketTime(bucket.value.bucket)} 成功率 ${formatPercent(
                  bucket.value.success_rate,
                )}`
              : `${formatBucketTime(bucket.bucket)} 无请求`
          }
        >
          {bucket.value ? (
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 rounded-sm",
                successRateBarClass(bucket.value.success_rate),
                successRateBarHeightClass(bucket.value.success_rate),
              )}
            />
          ) : null}
        </span>
      ))}
    </div>
  );

  if (layout === "strip") {
    if (!showPercent) {
      return (
        <div className={cn("min-w-0 flex-1", className)} title={`区间成功率 ${formatPercent(successRate)}`}>
          {bars}
        </div>
      );
    }
    return (
      <div
        className={cn("flex w-full items-center gap-4", className)}
        title={`区间成功率 ${formatPercent(successRate)}`}
      >
        {bars}
        {percent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5",
        barWidthClass === "w-32" ? "w-48 max-w-full" : undefined,
        className,
      )}
      title={`区间成功率 ${formatPercent(successRate)}`}
    >
      {bars}
      {percent}
    </div>
  );
}
