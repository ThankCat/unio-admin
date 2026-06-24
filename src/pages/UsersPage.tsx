import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import {
  getUserOpsDetail,
  getUserOpsKeys,
  getUsersOpsSummary,
  getUsersOpsTable,
  type UserOpsRow,
} from "@/lib/api/customerOps";
import type { User } from "@/lib/api/users";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { RangeFilter } from "@/components/common/RangeFilter";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { UserBalanceDialog } from "@/components/customer/UserBalanceDialog";
import { formatCompact, formatInt, formatPercent, formatRelativeTime, formatUSD } from "@/lib/format";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function UsersPage() {
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<UserOpsRow | null>(null);
  const search = useDebouncedValue(searchInput.trim(), 300);
  const rangeQuery = { ...params, range: value.preset };

  const summary = useQuery({
    queryKey: ["users", "ops-summary", rangeQuery],
    queryFn: () => getUsersOpsSummary(rangeQuery),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const table = useQuery({
    queryKey: ["users", "ops-table", rangeQuery, search, page],
    queryFn: () => getUsersOpsTable({ ...rangeQuery, page, page_size: PAGE_SIZE, search: search || undefined }),
    placeholderData: keepPreviousData,
  });
  const pageCount = table.data ? Math.max(1, Math.ceil(table.data.total / PAGE_SIZE)) : 1;
  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">用户</h2>
          <p className="text-muted-foreground text-sm">客户账户、余额与使用风险</p>
        </div>
        <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
      </div>

      <MetricGrid className="lg:grid-cols-6">
        <MetricCard label="用户总数" loading={summary.isPending} value={formatInt(s?.user_total ?? 0)} />
        <MetricCard label="总余额" loading={summary.isPending} value={formatUSD(s?.balance_usd ?? "0")} />
        <MetricCard label="可用余额" loading={summary.isPending} value={formatUSD(s?.available_usd ?? "0")} tooltip={s ? `冻结 ${formatUSD(s.reserved_usd)}` : undefined} />
        <MetricCard label="低余额用户" loading={summary.isPending} value={formatInt(s?.low_balance_total ?? 0)} intent={s && s.low_balance_total > 0 ? "warning" : "default"} tooltip="可用余额 < $5" />
        <MetricCard label="区间请求" loading={summary.isPending} value={formatCompact(s?.request_total ?? 0)} hint={s ? `成功 ${formatCompact(s.succeeded)}` : undefined} />
        <MetricCard label="区间消费" loading={summary.isPending} value={formatUSD(s?.consumption_usd ?? "0")} />
      </MetricGrid>

      <div className="relative w-64">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setPage(1); }} placeholder="搜索邮箱 / 昵称" className="pl-8" />
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
                  <TableHead>用户</TableHead>
                  <TableHead className="text-right">余额</TableHead>
                  <TableHead className="text-right">可用</TableHead>
                  <TableHead className="text-right">项目</TableHead>
                  <TableHead className="text-right">Key</TableHead>
                  <TableHead className="text-right">请求</TableHead>
                  <TableHead className="text-right">消费</TableHead>
                  <TableHead>最近</TableHead>
                  <TableHead>风险</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                  ))
                ) : table.data.items.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-muted-foreground py-10 text-center text-sm">暂无用户</TableCell></TableRow>
                ) : (
                  table.data.items.map((u) => (
                    <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelected(u)}>
                      <TableCell>
                        <div className="font-medium">{u.email}</div>
                        <div className="text-muted-foreground text-xs">{u.display_name}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(u.balance_usd)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(u.available_usd)}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.project_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{u.key_total}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCompact(u.request_total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(u.consumption_usd)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.last_used_at ? formatRelativeTime(u.last_used_at) : "—"}</TableCell>
                      <TableCell>{u.low_balance ? <Badge variant="secondary">低余额</Badge> : <Badge variant="outline">正常</Badge>}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination page={page} pageCount={pageCount} total={table.data?.total ?? 0} onPageChange={setPage} />
        </div>
      )}

      <UserDetailSheet user={selected} range={rangeQuery} onClose={() => setSelected(null)} />
    </div>
  );
}

function UserDetailSheet({ user, range, onClose }: { user: UserOpsRow | null; range: ReturnType<typeof useRangeQuery>["params"] & { range?: string }; onClose: () => void }) {
  return (
    <Sheet open={user != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {user ? <Body row={user} range={range} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({ row, range }: { row: UserOpsRow; range: { from?: string; to?: string; range?: string } }) {
  const [tab, setTab] = useState("overview");
  const userObj: User = { id: row.id, email: row.email, display_name: row.display_name, created_at: "", updated_at: "" };
  const detail = useQuery({
    queryKey: ["user", row.id, "ops-detail", range],
    queryFn: () => getUserOpsDetail(row.id, range),
    placeholderData: keepPreviousData,
  });
  const keys = useQuery({
    queryKey: ["user", row.id, "ops-keys"],
    queryFn: () => getUserOpsKeys(row.id),
    enabled: tab === "keys",
  });
  const d = detail.data;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{row.email}</SheetTitle>
        <SheetDescription>{row.display_name} · 项目 {row.project_count} · Key {row.key_total}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap gap-2 px-4">
        <UserBalanceDialog user={userObj}>
          <Button size="sm">调额</Button>
        </UserBalanceDialog>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 overflow-hidden px-4 pb-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>
        <div className="mt-3 overflow-y-auto">
          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="余额" value={formatUSD(d?.balance_usd ?? row.balance_usd)} />
              <Stat label="可用余额" value={formatUSD(d?.available_usd ?? row.available_usd)} />
              <Stat label="冻结" value={formatUSD(d?.reserved_usd ?? row.reserved_usd)} />
              <Stat label="区间请求" value={formatCompact(d?.request_total ?? 0)} />
              <Stat label="成功率" value={formatPercent(d?.success_rate ?? 0)} />
              <Stat label="区间消费" value={formatUSD(d?.consumption_usd ?? "0")} />
            </div>
          </TabsContent>
          <TabsContent value="keys">
            {keys.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : keys.data && keys.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">已用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.data.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm">{k.name}</TableCell>
                      <TableCell className="text-xs">{k.project_name}</TableCell>
                      <TableCell><Badge variant={k.status === "active" ? "default" : "outline"}>{k.status}</Badge></TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatUSD(k.spent_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">无 API Key</p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </>
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
