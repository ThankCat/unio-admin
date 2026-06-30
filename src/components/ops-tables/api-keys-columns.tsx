import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import type { ApiKeyOpsRow } from "@/lib/api/customerOps";
import type { ApiKey } from "@/lib/api/apiKeys";
import { resizableColumn } from "@/components/data-table";
import { formatCompact, formatRelativeTime, formatUSD } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiKeyRouteDialog } from "@/components/customer/ApiKeyRouteDialog";
import { ApiKeySpendLimitDialog } from "@/components/customer/ApiKeySpendLimitDialog";

// budgetUsagePercent 计算费用上限使用率（向下取整百分比）；未设上限返回 null（不展示比例）。
function budgetUsagePercent(
  spendLimit: string | null,
  spentTotal: string,
): number | null {
  if (!spendLimit) return null;
  const limit = Number(spendLimit);
  const spent = Number(spentTotal);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(spent)) return null;
  return Math.floor((spent / limit) * 100);
}

// copyPlaintextKey 复制完整明文 key（产品决策：明文留存，可多次复制）。
async function copyPlaintextKey(row: ApiKeyOpsRow) {
  if (!row.key_plaintext) {
    toast.error("该 Key 无可复制明文（历史 Key）");
    return;
  }
  try {
    await navigator.clipboard.writeText(row.key_plaintext);
    toast.success("已复制完整 Key 到剪贴板");
  } catch {
    toast.error("复制失败，请手动选择复制");
  }
}

function toApiKey(row: ApiKeyOpsRow): ApiKey {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    key_prefix: row.key_prefix,
    status: row.status,
    spend_limit: row.spend_limit,
    spent_total: row.spent_total,
    route_id: row.route_id,
    rpm_limit: null,
    tpm_limit: null,
    rpd_limit: null,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    disabled_at: null,
    revoked_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function apiKeyOpsColumns(handlers: {
  onToggle: (row: ApiKeyOpsRow) => void;
  onRevoke: (row: ApiKeyOpsRow) => void;
}): ColumnDef<ApiKeyOpsRow, unknown>[] {
  return [
    resizableColumn<ApiKeyOpsRow>("name", {
      header: "Key",
      size: 200,
      minSize: 140,
      enableHiding: false,
      cell: ({ row }) => (
        <>
          <div className="truncate font-medium">{row.original.name}</div>
          <div className="text-muted-foreground truncate font-mono text-xs">
            {row.original.key_prefix}…
          </div>
        </>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("status", {
      header: "状态",
      size: 88,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("route_name", {
      header: "线路",
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.route_name}</span>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("spend_limit", {
      header: "限额",
      size: 112,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.spend_limit ? formatUSD(row.original.spend_limit) : "不限"}
        </span>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("spent_total", {
      header: "已用",
      size: 124,
      cell: ({ row }) => {
        const used = formatUSD(row.original.spent_total);
        const pct = budgetUsagePercent(row.original.spend_limit, row.original.spent_total);
        if (pct === null) {
          return <span className="text-xs">{used}</span>;
        }
        // P2-1：软上限可视化——接近/达到上限即高亮告警（不加硬闸门，spend_limit 命中由后端自动停用）。
        const tone =
          pct >= 100
            ? "text-destructive font-medium"
            : pct >= 80
              ? "text-amber-600 dark:text-amber-500"
              : "text-muted-foreground";
        return (
          <span className={`text-xs ${tone}`}>
            {used} <span className="tabular-nums">({pct}%)</span>
          </span>
        );
      },
    }),
    resizableColumn<ApiKeyOpsRow>("request_total", {
      header: "请求",
      size: 96,
      cell: ({ row }) => <span className="text-xs">{formatCompact(row.original.request_total)}</span>,
    }),
    resizableColumn<ApiKeyOpsRow>("consumption_usd", {
      header: "消费",
      size: 112,
      cell: ({ row }) => <span className="text-xs">{formatUSD(row.original.consumption_usd)}</span>,
    }),
    resizableColumn<ApiKeyOpsRow>("last_used_at", {
      header: "最近",
      size: 120,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.last_used_at ? formatRelativeTime(row.original.last_used_at) : "—"}
        </span>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("action", {
      header: "操作",
      size: 72,
      enableHiding: false,
      cell: ({ row }) => (
        <div >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => copyPlaintextKey(row.original)}>
                复制完整 Key
              </DropdownMenuItem>
              <ApiKeySpendLimitDialog apiKey={toApiKey(row.original)}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>调整限额</DropdownMenuItem>
              </ApiKeySpendLimitDialog>
              <ApiKeyRouteDialog apiKey={toApiKey(row.original)}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>换绑线路</DropdownMenuItem>
              </ApiKeyRouteDialog>
              {row.original.status !== "revoked" ? (
                <DropdownMenuItem onSelect={() => handlers.onToggle(row.original)}>
                  {row.original.status === "disabled" ? "启用" : "停用"}
                </DropdownMenuItem>
              ) : null}
              {row.original.status !== "revoked" ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => handlers.onRevoke(row.original)}
                >
                  吊销
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }),
  ];
}
