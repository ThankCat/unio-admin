import { useParams, Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeftIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import {
  getApiKeysOpsSummary,
  getApiKeysOpsTable,
  type ApiKeyOpsRow,
} from "@/lib/api/customerOps";
import { revokeApiKey, updateApiKey, type ApiKey } from "@/lib/api/apiKeys";
import { apiErrorMessage } from "@/lib/api/client";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { CreateApiKeyDialog } from "@/components/customer/CreateApiKeyDialog";
import { ApiKeySpendLimitDialog } from "@/components/customer/ApiKeySpendLimitDialog";
import { formatCompact, formatInt, formatRelativeTime, formatUSD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { colPct } from "@/lib/table-columns";

// 把 ops 行映射成最小 ApiKey，喂给复用的限额对话框（仅用到 id/spend_limit）。
function toApiKey(row: ApiKeyOpsRow): ApiKey {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    key_prefix: row.key_prefix,
    status: row.status,
    spend_limit: row.spend_limit,
    spent_total: row.spent_total,
    route_id: null,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    disabled_at: null,
    revoked_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function ApiKeysPage() {
  const { projectId: projectIdParam } = useParams();
  const projectId = Number(projectIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const queryClient = useQueryClient();
  const rangeQuery = { ...params, range: value.preset };

  const summary = useQuery({
    queryKey: ["api-keys", projectId, "ops-summary"],
    queryFn: () => getApiKeysOpsSummary(projectId),
    refetchInterval: 60_000,
  });
  const table = useQuery({
    queryKey: ["api-keys", projectId, "ops-table", rangeQuery],
    queryFn: () => getApiKeysOpsTable(projectId, rangeQuery),
    placeholderData: keepPreviousData,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["api-keys", projectId] });

  const toggle = useMutation({
    mutationFn: (k: ApiKeyOpsRow) => updateApiKey({ id: k.id, disabled: k.status !== "disabled" ? true : false }),
    onSuccess: () => { toast.success("已更新 Key"); refetch(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => revokeApiKey(id),
    onSuccess: () => { toast.success("已吊销 Key"); refetch(); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link to="/projects"><ChevronLeftIcon data-icon="inline-start" />返回项目</Link>
          </Button>
          <h2 className="font-heading text-lg font-semibold tracking-tight">API Key</h2>
          <p className="text-muted-foreground text-sm">真实调用入口：线路、限额与用量</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
          <CreateApiKeyDialog projectId={projectId}>
            <Button size="sm"><PlusIcon data-icon="inline-start" />新建 Key</Button>
          </CreateApiKeyDialog>
        </div>
      </div>

      <MetricGrid className="lg:grid-cols-3">
        <MetricCard label="Key 总数" loading={summary.isPending} value={formatInt(s?.key_total ?? 0)} />
        <MetricCard label="启用 Key" loading={summary.isPending} value={formatInt(s?.key_enabled ?? 0)} />
        <MetricCard label="已达上限" loading={summary.isPending} value={formatInt(s?.spend_capped ?? 0)} intent={s && s.spend_capped > 0 ? "warning" : "default"} />
      </MetricGrid>

      {table.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{(table.error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={colPct.primaryMd}>Key</TableHead>
                <TableHead className={colPct.badge}>状态</TableHead>
                <TableHead className={colPct.textMd}>线路</TableHead>
                <TableHead className={`${colPct.money} text-right`}>限额</TableHead>
                <TableHead className={`${colPct.money} text-right`}>已用</TableHead>
                <TableHead className={`${colPct.num} text-right`}>请求</TableHead>
                <TableHead className={`${colPct.money} text-right`}>消费</TableHead>
                <TableHead className={colPct.timeSm}>最近</TableHead>
                <TableHead className={`${colPct.action} text-right`}>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : table.data && table.data.length > 0 ? (
                table.data.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>
                      <div className="truncate font-medium">{k.name}</div>
                      <div className="text-muted-foreground truncate font-mono text-xs">{k.key_prefix}…</div>
                    </TableCell>
                    <TableCell><Badge variant={k.status === "active" ? "default" : "outline"}>{k.status}</Badge></TableCell>
                    <TableCell className="text-xs">{k.route_name || "项目默认 → 内置经济"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{k.spend_limit ? formatUSD(k.spend_limit) : "不限"}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatUSD(k.spent_total)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatCompact(k.request_total)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatUSD(k.consumption_usd)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{k.last_used_at ? formatRelativeTime(k.last_used_at) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <ApiKeySpendLimitDialog apiKey={toApiKey(k)}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>调整限额</DropdownMenuItem>
                          </ApiKeySpendLimitDialog>
                          {k.status !== "revoked" ? (
                            <DropdownMenuItem onSelect={() => toggle.mutate(k)}>
                              {k.status === "disabled" ? "启用" : "停用"}
                            </DropdownMenuItem>
                          ) : null}
                          {k.status !== "revoked" ? (
                            <DropdownMenuItem variant="destructive" onSelect={() => revoke.mutate(k.id)}>
                              吊销
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={9} className="text-muted-foreground py-10 text-center text-sm">暂无 API Key</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
