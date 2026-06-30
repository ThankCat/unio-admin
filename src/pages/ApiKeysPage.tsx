import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeftIcon, PlusIcon } from "lucide-react";
import {
  getApiKeysOpsSummary,
  getApiKeysOpsTable,
  type ApiKeyOpsRow,
} from "@/lib/api/customerOps";
import { getUser } from "@/lib/api/users";
import { revokeApiKey, updateApiKey } from "@/lib/api/apiKeys";
import { apiErrorMessage } from "@/lib/api/client";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { MetricCard, MetricGrid } from "@/components/common/MetricCard";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { ConfigurableDataTable } from "@/components/data-table";
import { apiKeyOpsColumns } from "@/components/ops-tables/api-keys-columns";
import { CreateApiKeyDialog } from "@/components/customer/CreateApiKeyDialog";
import { formatInt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type PendingKeyAction =
  | { type: "toggle"; key: ApiKeyOpsRow }
  | { type: "revoke"; key: ApiKeyOpsRow };

export function ApiKeysPage() {
  const { userId: userIdParam } = useParams();
  const userId = Number(userIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const queryClient = useQueryClient();
  const rangeQuery = { ...params, range: value.preset };

  if (!Number.isFinite(userId) || userId <= 0) {
    return <Navigate to="/users" replace />;
  }

  const user = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
  });

  const summary = useQuery({
    queryKey: ["api-keys", userId, "ops-summary"],
    queryFn: () => getApiKeysOpsSummary(userId),
    refetchInterval: 60_000,
  });
  const table = useQuery({
    queryKey: ["api-keys", userId, "ops-table", rangeQuery],
    queryFn: () => getApiKeysOpsTable(userId, rangeQuery),
    placeholderData: keepPreviousData,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["api-keys", userId] });

  const [pendingAction, setPendingAction] = useState<PendingKeyAction | null>(null);

  const toggle = useMutation({
    mutationFn: (k: ApiKeyOpsRow) => updateApiKey({ id: k.id, disabled: k.status !== "disabled" ? true : false }),
    onSuccess: () => { toast.success("已更新 Key"); refetch(); setPendingAction(null); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => revokeApiKey(id),
    onSuccess: () => { toast.success("已吊销 Key"); refetch(); setPendingAction(null); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const mutating = toggle.isPending || revoke.isPending;

  function confirmPending() {
    if (!pendingAction) return;
    if (pendingAction.type === "toggle") toggle.mutate(pendingAction.key);
    else revoke.mutate(pendingAction.key.id);
  }

  const s = summary.data;
  const columns = useMemo(
    () =>
      apiKeyOpsColumns({
        onToggle: (k) => setPendingAction({ type: "toggle", key: k }),
        onRevoke: (k) => setPendingAction({ type: "revoke", key: k }),
      }),
    [],
  );

  const disabling = pendingAction?.type === "toggle" && pendingAction.key.status !== "disabled";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link to={`/users/${userId}`}><ChevronLeftIcon data-icon="inline-start" />返回用户</Link>
          </Button>
          <h2 className="font-heading text-lg font-semibold tracking-tight">API Key</h2>
          {user.isPending ? (
            <Skeleton className="mt-1 h-4 w-48" />
          ) : (
            <p className="text-muted-foreground text-sm">
              {user.data?.email ?? "—"} · 真实调用入口：线路、限额与用量
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
          <CreateApiKeyDialog userId={userId}>
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
        <ConfigurableDataTable
          storageKey={`api-keys:${userId}:ops-table`}
          data={table.data ?? []}
          columns={columns}
          loading={table.isPending}
          pinnedColumnId="name"
          emptyMessage="暂无 API Key"
          getRowId={(r) => String(r.id)}
          tableClassName={table.isFetching && !table.isPending ? "opacity-60" : undefined}
        />
      )}

      <ConfirmActionDialog
        open={pendingAction != null}
        onOpenChange={(o) => { if (!o && !mutating) setPendingAction(null); }}
        title={
          pendingAction?.type === "revoke"
            ? "吊销 API Key"
            : disabling
              ? "停用 API Key"
              : "启用 API Key"
        }
        description={
          pendingAction
            ? pendingAction.type === "revoke"
              ? `确认吊销「${pendingAction.key.name}」？吊销不可恢复，该 Key 将立即失效，使用它的调用会全部失败。`
              : disabling
                ? `确认停用「${pendingAction.key.name}」？停用后该 Key 暂停服务，可随时重新启用。`
                : `确认启用「${pendingAction.key.name}」？启用后该 Key 恢复正常调用。`
            : undefined
        }
        confirmLabel={
          pendingAction?.type === "revoke" ? "确认吊销" : disabling ? "确认停用" : "确认启用"
        }
        destructive={pendingAction?.type === "revoke" || disabling}
        pending={mutating}
        onConfirm={confirmPending}
      />
    </div>
  );
}
