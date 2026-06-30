import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getUserOpsDetail,
  getUserOpsKeys,
  type UserOpsRow,
} from "@/lib/api/customerOps";
import { getUser } from "@/lib/api/users";
import { formatCompact, formatPercent, formatUSD } from "@/lib/format";
import { ConfigurableDataTable } from "@/components/data-table";
import {
  USER_OPS_KEY_COLUMN_LABELS,
  userOpsKeyColumns,
} from "@/components/detail-tables/customer-detail-columns";
import { UserBalanceDialog } from "@/components/customer/UserBalanceDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/** 用户运维详情正文（子页面用）。 */
export function UserDetailContent({ row, range }: { row: UserOpsRow; range: { from?: string; to?: string; range?: string } }) {
  const [tab, setTab] = useState("overview");
  const userDetail = useQuery({
    queryKey: ["user", row.id],
    queryFn: () => getUser(row.id),
  });
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
  const user = userDetail.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading truncate text-lg font-semibold tracking-tight">{row.email}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {row.display_name} · Key {row.key_total}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/users/${row.id}/api-keys`}>管理 API Key</Link>
          </Button>
          {user ? (
            <UserBalanceDialog user={user}>
              <Button size="sm">调额</Button>
            </UserBalanceDialog>
          ) : (
            <Skeleton className="h-8 w-16" />
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
        </TabsList>
        <div className="pt-4">
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="余额" value={formatUSD(d?.balance_usd ?? row.balance_usd)} />
              <Stat label="可用余额" value={formatUSD(d?.available_usd ?? row.available_usd)} />
              <Stat label="冻结" value={formatUSD(d?.reserved_usd ?? row.reserved_usd)} />
              <Stat label="区间请求" value={formatCompact(d?.request_total ?? 0)} />
              <Stat label="成功率" value={formatPercent(d?.success_rate ?? 0)} />
              <Stat label="区间消费" value={formatUSD(d?.consumption_usd ?? "0")} />
            </div>
          </TabsContent>
          <TabsContent value="keys" className="mt-0">
            {keys.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : keys.data && keys.data.length > 0 ? (
              <ConfigurableDataTable
                storageKey={`user:${row.id}:keys`}
                data={keys.data}
                columns={userOpsKeyColumns()}
                columnLabels={USER_OPS_KEY_COLUMN_LABELS}
                layoutMode="content"
                bordered={false}
                getRowId={(k) => String(k.id)}
              />
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">无 API Key</p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
