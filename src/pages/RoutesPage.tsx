import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, SearchIcon } from "lucide-react";
import {
  getRoutesOpsSummary,
  getRoutesOpsTable,
  type RouteOpsRow,
  type RoutesOpsSummary,
} from "@/lib/api/routesOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { RangeFilter } from "@/components/common/RangeFilter";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { RouteDetailSheet } from "@/components/routes/RouteDetailSheet";
import { RouteFormDialog } from "@/components/routes/RouteFormDialog";
import { formatCompact, formatInt, formatLatencyMs, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";
import { colPct } from "@/lib/table-columns";

const PAGE_SIZE = 20;
type StatusTab = "all" | "enabled" | "disabled";

const MODE_LABEL: Record<string, string> = {
  cheapest: "经济",
  stable: "稳定",
  fixed: "固定",
};

export function RoutesPage() {
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<RouteOpsRow | null>(null);
  const search = useDebouncedValue(searchInput.trim(), 300);
  const queryClient = useQueryClient();

  const rangeQuery = { ...params, range: value.preset };

  const summary = useQuery({
    queryKey: ["routes", "ops-summary", rangeQuery],
    queryFn: () => getRoutesOpsSummary(rangeQuery),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const table = useQuery({
    queryKey: ["routes", "ops-table", rangeQuery, statusTab, search, page],
    queryFn: () =>
      getRoutesOpsTable({
        ...rangeQuery,
        page,
        page_size: PAGE_SIZE,
        status: statusTab === "all" ? undefined : statusTab,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const pageCount = table.data ? Math.max(1, Math.ceil(table.data.total / PAGE_SIZE)) : 1;
  const refetchAll = () => queryClient.invalidateQueries({ queryKey: ["routes"] });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">线路</h2>
          <p className="text-muted-foreground text-sm">客户线路（渠道商品）：可服务性、fallback 与绑定</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新建线路
          </Button>
        </div>
      </div>

      <RoutesCards summary={summary.data} loading={summary.isPending} />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as StatusTab); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="enabled">启用</TabsTrigger>
            <TabsTrigger value="disabled">停用</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            placeholder="搜索线路名"
            className="w-56 pl-8"
          />
        </div>
      </div>

      {table.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{(table.error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={colPct.primaryMd}>线路</TableHead>
                  <TableHead className={colPct.textSm}>策略</TableHead>
                  <TableHead className={colPct.badge}>可服务</TableHead>
                  <TableHead className={`${colPct.num} text-right`}>请求</TableHead>
                  <TableHead className={`${colPct.percent} text-right`}>成功率</TableHead>
                  <TableHead className={`${colPct.latency} text-right`}>P95 延迟</TableHead>
                  <TableHead className={`${colPct.percent} text-right`}>Fallback</TableHead>
                  <TableHead className={`${colPct.badgeLg} text-right`}>无可用渠道</TableHead>
                  <TableHead className={`${colPct.num} text-right`}>绑定</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.isPending ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground py-10 text-center text-sm">
                      暂无线路
                    </TableCell>
                  </TableRow>
                ) : (
                  table.data.items.map((rt) => (
                    <TableRow key={rt.id} className="cursor-pointer" onClick={() => setSelected(rt)}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 truncate font-medium">
                          {rt.name}
                          {rt.is_builtin ? <Badge variant="outline">内置</Badge> : null}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {rt.pool_kind === "all" ? "全量动态" : "手挑渠道"}
                          {rt.pool_channels > 0 ? ` · ${rt.pool_channels} 渠道` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{MODE_LABEL[rt.mode] ?? rt.mode}</TableCell>
                      <TableCell>
                        {rt.status !== "enabled" ? (
                          <Badge variant="outline">停用</Badge>
                        ) : rt.serviceable ? (
                          <Badge variant="default">可服务</Badge>
                        ) : (
                          <Badge variant="destructive">异常</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCompact(rt.request_total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(rt.success_rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatLatencyMs(rt.latency_p95)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPercent(rt.fallback_rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rt.no_channel_total > 0 ? (
                          <span className="text-destructive font-medium">{rt.no_channel_total}</span>
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rt.bound_projects}/{rt.bound_keys}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination page={page} pageCount={pageCount} total={table.data?.total ?? 0} onPageChange={setPage} />
        </div>
      )}

      <RouteDetailSheet route={selected} range={rangeQuery} onClose={() => setSelected(null)} onChanged={refetchAll} />
      <RouteFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        route={null}
        onSaved={() => {
          setCreateOpen(false);
          refetchAll();
        }}
      />
    </div>
  );
}

function RoutesCards({ summary, loading }: { summary?: RoutesOpsSummary; loading: boolean }) {
  const s = summary;
  return (
    <MetricGrid className="lg:grid-cols-4">
      <MetricCard label="线路总数" loading={loading} value={formatInt(s?.total ?? 0)} hint={s ? `启用 ${s.enabled} · 内置 ${s.builtin}` : undefined} />
      <MetricCard label="启用线路" loading={loading} value={formatInt(s?.enabled ?? 0)} hint={s ? `停用 ${s.disabled}` : undefined} />
      <MetricCard label="请求量" loading={loading} value={formatCompact(s?.request_total ?? 0)} hint={s ? `成功 ${formatCompact(s.succeeded)}` : undefined} tooltip="按就近绑定归因到线路的请求" />
      <MetricCard label="成功率" loading={loading} value={formatPercent(s?.success_rate ?? 0)} intent={s ? (s.success_rate >= 0.95 ? "success" : s.success_rate >= 0.8 ? "warning" : "danger") : "default"} />
      <MetricCard label="性能" loading={loading} value={formatLatencyMs(s?.latency_p95 ?? 0)} tooltip="P95 完成延迟" />
      <MetricCard label="Fallback 率" loading={loading} value={formatPercent(s?.fallback_rate ?? 0)} intent={s && s.fallback_rate > 0.15 ? "warning" : "default"} tooltip="成功请求中发生过降级切换的占比" />
      <MetricCard label="无可用渠道" loading={loading} value={formatInt(s?.no_channel ?? 0)} intent={s && s.no_channel > 0 ? "danger" : "default"} tooltip="routing 无可用渠道次数" />
      <MetricCard label="内置线路" loading={loading} value={formatInt(s?.builtin ?? 0)} tooltip="经济 / 稳定（不可删）" />
    </MetricGrid>
  );
}
