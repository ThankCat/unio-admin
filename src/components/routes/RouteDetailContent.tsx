import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { deleteRoute, getRoute, type Route } from "@/lib/api/routes";
import { apiErrorMessage } from "@/lib/api/client";
import {
  getRouteOpsBindings,
  getRouteOpsChannelPool,
  getRouteOpsDetail,
  getRouteOpsModels,
  getRouteOpsPerformance,
  getRouteOpsRequests,
  type RouteOpsRow,
} from "@/lib/api/routesOps";
import type { RangeQuery } from "@/lib/api/dashboard";
import { formatCompact, formatLatencyMs, formatPercent } from "@/lib/format";
import { ConfigurableDataTable, ServerDataTable } from "@/components/data-table";
import {
  ROUTE_OPS_KEY_COLUMN_LABELS,
  ROUTE_OPS_MODEL_COLUMN_LABELS,
  ROUTE_OPS_POOL_COLUMN_LABELS,
  ROUTE_OPS_REQUEST_COLUMN_LABELS,
  routeOpsKeyColumns,
  routeOpsModelColumns,
  routeOpsPoolColumns,
  routeOpsRequestColumns,
} from "@/components/detail-tables/route-detail-columns";
import { RouteFormDialog } from "@/components/routes/RouteFormDialog";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function fmtTs(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-base font-semibold tabular-nums">{value}</div>
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

/** 线路运维详情正文（子页面用）。 */
export function RouteDetailContent({ row, range }: { row: RouteOpsRow; range: RangeQuery }) {
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const routeQ = useQuery({ queryKey: ["route", row.id], queryFn: () => getRoute(row.id) });

  const del = useMutation({
    mutationFn: () => deleteRoute(row.id),
    onSuccess: () => {
      toast.success("已删除线路");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      navigate("/routes");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold tracking-tight">{row.name}</h2>
            <Badge variant={row.status === "enabled" ? "default" : "outline"}>
              {row.status === "enabled" ? "启用" : "停用"}
            </Badge>
            {row.serviceable ? (
              <Badge variant="default">可服务</Badge>
            ) : (
              <Badge variant="destructive">不可服务</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {row.mode} · {row.pool_kind === "all" ? "全量动态" : "手挑渠道"} · 绑定 用户{" "}
            {row.bound_users} / Key {row.bound_keys}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!routeQ.data}
            onClick={() => setEditOpen(true)}
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            disabled={del.isPending}
          >
            删除
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="pool">渠道池</TabsTrigger>
          <TabsTrigger value="performance">路由表现</TabsTrigger>
          <TabsTrigger value="models">模型</TabsTrigger>
          <TabsTrigger value="bindings">绑定</TabsTrigger>
          <TabsTrigger value="requests">请求</TabsTrigger>
        </TabsList>
        <div className="pt-4">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab id={row.id} range={range} />
          </TabsContent>
          <TabsContent value="pool" className="mt-0">
            <PoolTab id={row.id} poolKind={row.pool_kind} />
          </TabsContent>
          <TabsContent value="performance" className="mt-0">
            <PerformanceTab id={row.id} range={range} />
          </TabsContent>
          <TabsContent value="models" className="mt-0">
            <ModelsTab id={row.id} range={range} />
          </TabsContent>
          <TabsContent value="bindings" className="mt-0">
            <BindingsTab id={row.id} />
          </TabsContent>
          <TabsContent value="requests" className="mt-0">
            <RequestsTab id={row.id} range={range} />
          </TabsContent>
        </div>
      </Tabs>

      {routeQ.data ? (
        <RouteFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          route={routeQ.data as Route}
          onSaved={() => {
            setEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ["route", row.id] });
            queryClient.invalidateQueries({ queryKey: ["routes"] });
          }}
        />
      ) : null}

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o && del.isPending) return;
          setDeleteOpen(o);
        }}
        title="删除线路"
        description={`确认删除线路「${row.name}」？删除不可恢复，删除后该线路将立即停止服务，绑定到它的用户与 Key 需另行调整。`}
        confirmLabel="确认删除"
        destructive
        pending={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  );
}

function OverviewTab({ id, range }: { id: number; range: RangeQuery }) {
  const q = useQuery({
    queryKey: ["route", id, "ops-detail", range],
    queryFn: () => getRouteOpsDetail(id, range),
    placeholderData: keepPreviousData,
  });
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  const d = q.data;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Stat label="请求" value={formatCompact(d.request_total)} />
      <Stat label="成功率" value={formatPercent(d.success_rate)} />
      <Stat label="Fallback 率" value={formatPercent(d.fallback_rate)} />
      <Stat label="无可用渠道" value={String(d.no_channel_total)} />
      <Stat label="P50 延迟" value={formatLatencyMs(d.latency_p50)} />
      <Stat label="P95 延迟" value={formatLatencyMs(d.latency_p95)} />
    </div>
  );
}

function PoolTab({ id, poolKind }: { id: number; poolKind: string }) {
  const q = useQuery({ queryKey: ["route", id, "ops-pool"], queryFn: () => getRouteOpsChannelPool(id) });
  if (poolKind === "all")
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        全量动态线路：自动使用每个模型的全部可用渠道，无固定渠道池。
      </p>
    );
  if (q.isPending) return <Skeleton className="h-32 w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (q.data.length === 0)
    return <p className="text-muted-foreground py-10 text-center text-sm">渠道池为空</p>;
  return (
    <ConfigurableDataTable
      storageKey={`route:${id}:pool`}
      data={q.data}
      columns={routeOpsPoolColumns()}
      columnLabels={ROUTE_OPS_POOL_COLUMN_LABELS}
      layoutMode="content"
      bordered={false}
      getRowId={(row) => String(row.channel_id)}
    />
  );
}

function PerformanceTab({ id, range }: { id: number; range: RangeQuery }) {
  const q = useQuery({
    queryKey: ["route", id, "ops-perf", range],
    queryFn: () => getRouteOpsPerformance(id, range),
    placeholderData: keepPreviousData,
  });
  if (q.isPending) return <Skeleton className="h-[240px] w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (q.data.length === 0)
    return <p className="text-muted-foreground py-12 text-center text-sm">区间内暂无数据</p>;
  const reqConfig: ChartConfig = {
    request_total: { label: "请求", color: "var(--chart-1)" },
    request_succeeded: { label: "成功", color: "var(--chart-2)" },
  };
  const latConfig: ChartConfig = { latency_p95: { label: "P95(ms)", color: "var(--chart-3)" } };
  return (
    <div className="flex flex-col gap-4">
      <ChartContainer config={reqConfig} className="h-[180px] w-full">
        <AreaChart data={q.data} margin={{ left: 4, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={fmtTs} />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => fmtTs(String(p?.[0]?.payload.bucket))} />} />
          <Area dataKey="request_total" type="monotone" stroke="var(--color-request_total)" fill="var(--color-request_total)" fillOpacity={0.15} />
          <Area dataKey="request_succeeded" type="monotone" stroke="var(--color-request_succeeded)" fill="var(--color-request_succeeded)" fillOpacity={0.15} />
        </AreaChart>
      </ChartContainer>
      <ChartContainer config={latConfig} className="h-[180px] w-full">
        <LineChart data={q.data} margin={{ left: 4, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={fmtTs} />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => fmtTs(String(p?.[0]?.payload.bucket))} />} />
          <Line dataKey="latency_p95" type="monotone" stroke="var(--color-latency_p95)" dot={false} strokeWidth={2} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function ModelsTab({ id, range }: { id: number; range: RangeQuery }) {
  const q = useQuery({
    queryKey: ["route", id, "ops-models", range],
    queryFn: () => getRouteOpsModels(id, range),
    placeholderData: keepPreviousData,
  });
  if (q.isPending) return <Skeleton className="h-40 w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (q.data.length === 0)
    return <p className="text-muted-foreground py-12 text-center text-sm">区间内暂无模型流量</p>;
  return (
    <ConfigurableDataTable
      storageKey={`route:${id}:models`}
      data={q.data}
      columns={routeOpsModelColumns()}
      columnLabels={ROUTE_OPS_MODEL_COLUMN_LABELS}
      layoutMode="content"
      bordered={false}
      getRowId={(row) => row.model_id}
    />
  );
}

function BindingsTab({ id }: { id: number }) {
  const q = useQuery({ queryKey: ["route", id, "ops-bindings"], queryFn: () => getRouteOpsBindings(id) });
  if (q.isPending) return <Skeleton className="h-40 w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  const { keys } = q.data;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-muted-foreground mb-1 text-xs">绑定本线路的 API Key（{keys.length}）</div>
        {keys.length === 0 ? (
          <p className="text-muted-foreground py-2 text-sm">无</p>
        ) : (
          <ConfigurableDataTable
            storageKey={`route:${id}:keys`}
            data={keys}
            columns={routeOpsKeyColumns()}
            columnLabels={ROUTE_OPS_KEY_COLUMN_LABELS}
            layoutMode="content"
            bordered={false}
            getRowId={(row) => String(row.id)}
          />
        )}
      </div>
      <p className="text-muted-foreground text-xs">改线路前请确认上述绑定不受影响。</p>
    </div>
  );
}

function RequestsTab({ id, range }: { id: number; range: RangeQuery }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [range]);

  const q = useQuery({
    queryKey: ["route", id, "ops-requests", range, page],
    queryFn: () => getRouteOpsRequests(id, { ...range, page, page_size: 10 }),
    placeholderData: keepPreviousData,
  });

  const pageCount = Math.max(1, Math.ceil((q.data?.total ?? 0) / 10));

  if (q.isPending) return <Skeleton className="h-40 w-full" />;
  if (q.isError) return <ErrorBox message={(q.error as Error).message} />;
  if (q.data.items.length === 0)
    return <p className="text-muted-foreground py-12 text-center text-sm">区间内暂无请求</p>;

  return (
    <ServerDataTable
      storageKey={`route:${id}:requests`}
      columns={routeOpsRequestColumns()}
      data={q.data.items}
      columnLabels={ROUTE_OPS_REQUEST_COLUMN_LABELS}
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
