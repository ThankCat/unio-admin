import { useEffect, useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  CableIcon,
  CircleCheckIcon,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  getModelOpsChannels,
  getModelOpsPerformance,
  getModelOpsRequests,
} from "@/lib/api/modelsOps";
import type { RangeQuery } from "@/lib/api/dashboard";
import { formatCompact, formatLatencySec } from "@/lib/format";
import { ConfigurableDataTable, ServerDataTable } from "@/components/data-table";
import {
  MODEL_OPS_CHANNEL_COLUMN_LABELS,
  MODEL_OPS_REQUEST_COLUMN_LABELS,
  modelOpsChannelColumns,
  modelOpsRequestColumns,
} from "@/components/detail-tables/model-detail-columns";
import { AttemptSuccessRateCell } from "@/components/ops-tables/AttemptSuccessRateCell";
import { DetailSideNav } from "@/components/common/DetailSideNav";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function fmtTs(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SectionFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl ring-1 ring-foreground/10", className)}>
      {children}
    </div>
  );
}

function SectionEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CableIcon;
  title: string;
  description?: string;
}) {
  return (
    <Empty className="border py-14">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>加载失败</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <SectionFrame className="p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-3">
            {Array.from({ length: cols }).map((__, col) => (
              <Skeleton key={col} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
}

export function ModelDetailContent({
  modelId,
  range,
}: {
  modelId: number;
  range: RangeQuery;
}) {
  const sections = useMemo(
    () => [
      {
        id: "channels",
        label: "渠道",
        content: <ChannelsSection modelId={modelId} range={range} />,
      },
      {
        id: "performance",
        label: "性能",
        content: <PerformanceSection modelId={modelId} range={range} />,
      },
      {
        id: "requests",
        label: "请求",
        content: <RequestsSection modelId={modelId} range={range} />,
      },
    ],
    [modelId, range],
  );

  return <DetailSideNav sections={sections} defaultSectionId="channels" />;
}

function ChannelsSection({ modelId, range }: { modelId: number; range: RangeQuery }) {
  const q = useQuery({
    queryKey: ["model", modelId, "ops-channels", range],
    queryFn: () => getModelOpsChannels(modelId, range),
    placeholderData: keepPreviousData,
  });

  const channels = useMemo(
    () => [...(q.data ?? [])].sort((a, b) => b.attempt_total - a.attempt_total),
    [q.data],
  );

  if (q.isPending && !q.data) return <TableSkeleton rows={6} cols={7} />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (channels.length === 0) {
    return (
      <SectionEmpty
        icon={CableIcon}
        title="暂无承载渠道"
        description="为该模型绑定渠道后即可在此查看运行表现"
      />
    );
  }

  return (
    <ConfigurableDataTable
      storageKey={`model:${modelId}:channels`}
      data={channels}
      columns={modelOpsChannelColumns()}
      columnLabels={MODEL_OPS_CHANNEL_COLUMN_LABELS}
      layoutMode="content"
      bordered={false}
      toolbarStart={
        <span className="text-muted-foreground text-sm tabular-nums">
          共 {channels.length} 个渠道
        </span>
      }
    />
  );
}

function PerformanceSection({ modelId, range }: { modelId: number; range: RangeQuery }) {
  const q = useQuery({
    queryKey: ["model", modelId, "ops-perf", range],
    queryFn: () => getModelOpsPerformance(modelId, range),
    placeholderData: keepPreviousData,
  });

  const summary = useMemo(() => {
    if (!q.data?.length) return null;
    const request_total = q.data.reduce((sum, point) => sum + point.request_total, 0);
    const request_succeeded = q.data.reduce((sum, point) => sum + point.request_succeeded, 0);
    const latencyPoints = q.data.filter((point) => point.latency_p95 > 0);
    const latency_p95 = latencyPoints.length
      ? latencyPoints.reduce((sum, point) => sum + point.latency_p95, 0) / latencyPoints.length
      : 0;
    return {
      request_total,
      request_succeeded,
      success_rate: request_total ? request_succeeded / request_total : 0,
      latency_p95,
    };
  }, [q.data]);

  const latencyChartData = useMemo(
    () =>
      (q.data ?? []).map((point) => ({
        bucket: point.bucket,
        latency_p95: point.latency_p95 / 1000,
      })),
    [q.data],
  );

  if (q.isPending && !q.data) return <ChartSkeleton />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (!q.data?.length) {
    return (
      <SectionEmpty
        icon={ActivityIcon}
        title="区间内暂无数据"
        description="扩大时间范围或等待该模型产生请求后再查看"
      />
    );
  }

  const reqConfig: ChartConfig = {
    request_total: { label: "请求", color: "var(--chart-1)" },
    request_succeeded: { label: "成功", color: "var(--chart-2)" },
  };
  const latConfig: ChartConfig = { latency_p95: { label: "P95 (s)", color: "var(--chart-3)" } };

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="总请求" value={formatCompact(summary.request_total)} />
          <MiniStat
            label="成功率"
            value={
              <AttemptSuccessRateCell
                attemptTotal={summary.request_total}
                attemptSucceeded={summary.request_succeeded}
                successRate={summary.success_rate}
                className="text-sm"
              />
            }
          />
          <MiniStat
            label="P95 延迟"
            value={summary.latency_p95 > 0 ? formatLatencySec(summary.latency_p95) : "—"}
          />
        </div>
      ) : null}

      <SectionFrame className="p-4">
        <div className="text-muted-foreground mb-2 text-xs font-medium">请求量</div>
        <ChartContainer config={reqConfig} className="h-[200px] w-full">
          <AreaChart data={q.data} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={fmtTs}
            />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(_, p) => fmtTs(String(p?.[0]?.payload.bucket))} />
              }
            />
            <Area
              dataKey="request_total"
              type="monotone"
              stroke="var(--color-request_total)"
              fill="var(--color-request_total)"
              fillOpacity={0.15}
            />
            <Area
              dataKey="request_succeeded"
              type="monotone"
              stroke="var(--color-request_succeeded)"
              fill="var(--color-request_succeeded)"
              fillOpacity={0.15}
            />
          </AreaChart>
        </ChartContainer>
      </SectionFrame>

      <SectionFrame className="p-4">
        <div className="text-muted-foreground mb-2 text-xs font-medium">P95 延迟</div>
        <ChartContainer config={latConfig} className="h-[200px] w-full">
          <LineChart data={latencyChartData} margin={{ left: 4, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucket"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={fmtTs}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) => fmtTs(String(p?.[0]?.payload.bucket))}
                  formatter={(value) => `${Number(value).toFixed(2)}s`}
                />
              }
            />
            <Line
              dataKey="latency_p95"
              type="monotone"
              stroke="var(--color-latency_p95)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </SectionFrame>
    </div>
  );
}

function RequestsSection({ modelId, range }: { modelId: number; range: RangeQuery }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [range]);

  const q = useQuery({
    queryKey: ["model", modelId, "ops-requests", range, page],
    queryFn: () => getModelOpsRequests(modelId, { ...range, page, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const pageCount = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));

  if (q.isPending && !q.data) return <TableSkeleton rows={5} cols={4} />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (q.data.items.length === 0) {
    return (
      <SectionEmpty
        icon={CircleCheckIcon}
        title="暂无请求"
        description="所选时间范围内没有该模型的请求记录"
      />
    );
  }

  return (
    <ServerDataTable
      storageKey={`model:${modelId}:requests`}
      columns={modelOpsRequestColumns()}
      data={q.data.items}
      columnLabels={MODEL_OPS_REQUEST_COLUMN_LABELS}
      total={q.data.total}
      page={page}
      pageCount={pageCount}
      onPageChange={setPage}
      bordered={false}
      refetching={q.isFetching && !q.isPending}
      pinnedColumnId="at"
      getRowId={(row) => row.request_id}
    />
  );
}
