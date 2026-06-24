import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import {
  getApiKeysOpsTable,
  getProjectsOpsSummary,
  getProjectsOpsTable,
  type ProjectOpsRow,
} from "@/lib/api/customerOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { RangeFilter } from "@/components/common/RangeFilter";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { formatCompact, formatInt, formatRelativeTime, formatUSD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/common/TablePagination";

const PAGE_SIZE = 20;

export function ProjectsPage() {
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ProjectOpsRow | null>(null);
  const search = useDebouncedValue(searchInput.trim(), 300);
  const rangeQuery = { ...params, range: value.preset };

  const summary = useQuery({
    queryKey: ["projects", "ops-summary", rangeQuery],
    queryFn: () => getProjectsOpsSummary(rangeQuery),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const table = useQuery({
    queryKey: ["projects", "ops-table", rangeQuery, search, page],
    queryFn: () => getProjectsOpsTable({ ...rangeQuery, page, page_size: PAGE_SIZE, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const pageCount = table.data ? Math.max(1, Math.ceil(table.data.total / PAGE_SIZE)) : 1;
  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">项目</h2>
          <p className="text-muted-foreground text-sm">工作空间与 API Key 汇总</p>
        </div>
        <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
      </div>

      <MetricGrid className="lg:grid-cols-5">
        <MetricCard label="项目总数" loading={summary.isPending} value={formatInt(s?.project_total ?? 0)} />
        <MetricCard label="API Key 总数" loading={summary.isPending} value={formatInt(s?.key_total ?? 0)} />
        <MetricCard label="启用 Key" loading={summary.isPending} value={formatInt(s?.key_enabled ?? 0)} />
        <MetricCard label="区间请求" loading={summary.isPending} value={formatCompact(s?.request_total ?? 0)} />
        <MetricCard label="区间消费" loading={summary.isPending} value={formatUSD(s?.consumption_usd ?? "0")} />
      </MetricGrid>

      <div className="relative w-64">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} placeholder="搜索项目名 / 用户" className="pl-8" />
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
                  <TableHead>项目</TableHead>
                  <TableHead>所属用户</TableHead>
                  <TableHead>默认线路</TableHead>
                  <TableHead className="text-right">Key</TableHead>
                  <TableHead className="text-right">请求</TableHead>
                  <TableHead className="text-right">消费</TableHead>
                  <TableHead>最近</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ))
                ) : table.data.items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-muted-foreground py-10 text-center text-sm">暂无项目</TableCell></TableRow>
                ) : (
                  table.data.items.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.user_email}</TableCell>
                      <TableCell className="text-xs">{p.default_route_name || "由 Key 决定"}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.key_enabled}/{p.key_total}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCompact(p.request_total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(p.consumption_usd)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{p.last_used_at ? formatRelativeTime(p.last_used_at) : "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/projects/${p.id}/api-keys`}>API Keys</Link>
                        </Button>
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

      <ProjectDetailSheet project={selected} range={rangeQuery} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProjectDetailSheet({ project, range, onClose }: { project: ProjectOpsRow | null; range: { from?: string; to?: string; range?: string }; onClose: () => void }) {
  const keys = useQuery({
    queryKey: ["project", project?.id, "ops-keys", range],
    queryFn: () => getApiKeysOpsTable(project!.id, range),
    enabled: project != null,
    placeholderData: keepPreviousData,
  });
  return (
    <Sheet open={project != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {project ? (
          <>
            <SheetHeader>
              <SheetTitle>{project.name}</SheetTitle>
              <SheetDescription>
                {project.user_email} · 默认线路 {project.default_route_name || "由 Key 决定"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Key" value={`${project.key_enabled}/${project.key_total}`} />
                <Stat label="区间请求" value={formatCompact(project.request_total)} />
                <Stat label="区间消费" value={formatUSD(project.consumption_usd)} />
              </div>
              <Button asChild size="sm" className="w-fit">
                <Link to={`/projects/${project.id}/api-keys`}>管理 API Key</Link>
              </Button>
              <div className="text-muted-foreground text-xs">本项目 API Key</div>
              {keys.isPending ? (
                <Skeleton className="h-32 w-full" />
              ) : keys.data && keys.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">请求</TableHead>
                      <TableHead className="text-right">消费</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.data.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="text-sm">{k.name}</TableCell>
                        <TableCell><Badge variant={k.status === "active" ? "default" : "outline"}>{k.status}</Badge></TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatCompact(k.request_total)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatUSD(k.consumption_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">无 API Key</p>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
