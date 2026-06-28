import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Provider } from "@/lib/api/providers";
import type { ProviderOpsRow } from "@/lib/api/providersOps";
import {
  profitIntent,
  rateIntent,
} from "@/components/dashboard/metrics";
import { RevenueTip } from "@/components/dashboard/RevenueTip";
import { TipHoverCardContent } from "@/components/dashboard/TipHoverCardContent";
import {
  BREAKDOWN_COLUMN_MIN_SIZE,
  BREAKDOWN_COLUMN_SIZE,
  STATUS_LABEL,
} from "@/components/dashboard/breakdown-table/constants";
import { HEALTH_LABEL, HEALTH_VARIANT } from "@/components/channels/health";
import { AttemptLatencyCell } from "@/components/ops-tables/AttemptLatencyCell";
import { DeleteProviderDialog } from "@/components/providers/DeleteProviderDialog";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import { resizableColumn } from "@/components/data-table";
import {
  formatCompact,
  formatInt,
  formatPercent,
  formatTPS,
  formatUSD,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardTrigger } from "@/components/ui/hover-card";

type StatIntent = "default" | "success" | "warning" | "danger";

function statIntentClass(intent: StatIntent | undefined): string {
  switch (intent) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "danger":
      return "text-destructive";
    default:
      return "text-foreground";
  }
}

function providerStatusBadge(status: string) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={status === "enabled" ? "default" : "secondary"}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function columnMeta(
  size: number,
  minSize: number,
  enableHiding = true,
) {
  return {
    size,
    minSize,
    maxSize: 480,
    enableResizing: true,
    enableHiding,
  };
}

function toProvider(row: ProviderOpsRow): Provider {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    created_at: "",
    updated_at: "",
  };
}

export const PROVIDER_OPS_COLUMN_LABELS: Record<string, string> = {
  name: "服务商",
  status: "状态",
  channels: "渠道",
  health: "健康",
  requests: "请求",
  success_rate: "成功率",
  latency: "平均延迟",
  tps: "平均 TPS",
  tokens: "Token",
  margin: "利润",
  timeout: "超时",
  action: "操作",
};

export function providerOpsAutoSizeValue(row: ProviderOpsRow, columnId: string) {
  switch (columnId) {
    case "name":
      return `${row.name} ${row.slug}`;
    case "status":
      return row.status === "enabled" ? "启用" : "停用";
    case "channels":
      return `${row.channel_enabled}/${row.channel_total}`;
    case "health":
      return HEALTH_LABEL[row.health];
    case "requests":
      return formatCompact(row.attempt_total);
    case "success_rate":
      return formatPercent(row.success_rate);
    case "latency":
      return row.latency.sample ? String(row.latency.avg) : "";
    case "tps":
      return formatTPS(row.avg_tps);
    case "tokens":
      return formatCompact(row.tokens);
    case "margin":
      return formatUSD(row.margin_usd);
    case "timeout":
      return formatInt(row.timeout_total);
    case "action":
      return "查看编辑删除";
    default:
      return "";
  }
}

export function providerOpsColumns(): ColumnDef<ProviderOpsRow, unknown>[] {
  return [
    resizableColumn<ProviderOpsRow>("name", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.name, BREAKDOWN_COLUMN_MIN_SIZE.name, false),
      header: "服务商",
      cell: ({ row }) => (
        <>
          <div className="truncate font-medium">{row.original.name}</div>
          <div className="text-muted-foreground truncate text-xs">{row.original.slug}</div>
        </>
      ),
    }),
    resizableColumn<ProviderOpsRow>("channels", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.channels, BREAKDOWN_COLUMN_MIN_SIZE.channels),
      header: "渠道",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.channel_enabled}/{row.original.channel_total}
        </span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("requests", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.requests, BREAKDOWN_COLUMN_MIN_SIZE.requests),
      header: "请求",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCompact(row.original.attempt_total)}</span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("success_rate", {
      ...columnMeta(
        BREAKDOWN_COLUMN_SIZE.success_rate,
        BREAKDOWN_COLUMN_MIN_SIZE.success_rate,
      ),
      header: "成功率",
      cell: ({ row }) => (
        <span
          className={cn(
            "tabular-nums",
            statIntentClass(rateIntent(row.original.success_rate)),
          )}
        >
          {formatPercent(row.original.success_rate)}
        </span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("latency", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.latency, BREAKDOWN_COLUMN_MIN_SIZE.latency),
      header: "平均延迟",
      cell: ({ row }) => <AttemptLatencyCell latency={row.original.latency} />,
    }),
    resizableColumn<ProviderOpsRow>("tps", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.tps, BREAKDOWN_COLUMN_MIN_SIZE.tps),
      header: "平均 TPS",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatTPS(row.original.avg_tps)}</span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("tokens", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.tokens, BREAKDOWN_COLUMN_MIN_SIZE.tokens),
      header: "Token",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCompact(row.original.tokens)}</span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("margin", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.margin, BREAKDOWN_COLUMN_MIN_SIZE.margin),
      header: "利润",
      cell: ({ row }) => (
        <HoverCard openDelay={120} closeDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className={cn(
                "cursor-default tabular-nums underline decoration-dotted underline-offset-2",
                statIntentClass(profitIntent(Number(row.original.margin_usd))),
              )}
            >
              {formatUSD(row.original.margin_usd)}
            </button>
          </HoverCardTrigger>
          <TipHoverCardContent align="end">
            <RevenueTip
              revenue={{
                revenue_usd: row.original.revenue_usd,
                cost_usd: row.original.cost_usd,
                margin_usd: row.original.margin_usd,
              }}
              title={row.original.name}
            />
          </TipHoverCardContent>
        </HoverCard>
      ),
    }),
    resizableColumn<ProviderOpsRow>("timeout", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.failed, BREAKDOWN_COLUMN_MIN_SIZE.failed),
      header: "超时",
      cell: ({ row }) => (
        <span className="tabular-nums">{formatInt(row.original.timeout_total)}</span>
      ),
    }),
    resizableColumn<ProviderOpsRow>("status", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.status, BREAKDOWN_COLUMN_MIN_SIZE.status),
      header: "状态",
      cell: ({ row }) => providerStatusBadge(row.original.status),
    }),
    resizableColumn<ProviderOpsRow>("health", {
      ...columnMeta(BREAKDOWN_COLUMN_SIZE.health, BREAKDOWN_COLUMN_MIN_SIZE.health),
      header: "健康",
      cell: ({ row }) => (
        <Badge variant={HEALTH_VARIANT[row.original.health]}>
          {HEALTH_LABEL[row.original.health]}
        </Badge>
      ),
    }),
    {
      id: "action",
      header: "操作",
      size: 108,
      minSize: 108,
      maxSize: 108,
      enableResizing: false,
      enableHiding: false,
      cell: ({ row }) => {
        const provider = toProvider(row.original);
        return (
          <div
            className="flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button asChild variant="ghost" size="icon-sm" aria-label="查看">
              <Link to={`/providers/${row.original.id}`}>
                <EyeIcon />
              </Link>
            </Button>
            <ProviderFormDialog provider={provider}>
              <Button variant="ghost" size="icon-sm" aria-label="编辑">
                <PencilIcon />
              </Button>
            </ProviderFormDialog>
            <DeleteProviderDialog provider={provider}>
              <Button variant="ghost" size="icon-sm" aria-label="删除">
                <Trash2Icon className="text-destructive" />
              </Button>
            </DeleteProviderDialog>
          </div>
        );
      },
    },
  ];
}
