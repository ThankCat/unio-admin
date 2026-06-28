import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { ModelOpsRow } from "@/lib/api/modelsOps";
import { profitIntent } from "@/components/dashboard/metrics";
import { RevenueTip } from "@/components/dashboard/RevenueTip";
import { TipHoverCardContent } from "@/components/dashboard/TipHoverCardContent";
import { ModelRowActions } from "@/components/models/ModelRowActions";
import { AttemptLatencyCell } from "@/components/ops-tables/AttemptLatencyCell";
import { AttemptSuccessRateCell } from "@/components/ops-tables/AttemptSuccessRateCell";
import { formatCompact, formatDateTime, formatPercent, formatUSD } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardTrigger } from "@/components/ui/hover-card";
import { ColumnHeader } from "./column-header";
import { TruncateCell } from "./truncate-cell";
import type { FilterField } from "./types";

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

function modelFailed(row: ModelOpsRow): number {
  return Math.max(0, row.request_total - row.request_succeeded);
}

function modelCostUsd(row: ModelOpsRow): string {
  const rev = Number(row.revenue_usd);
  const margin = Number(row.margin_usd);
  if (!Number.isFinite(rev) || !Number.isFinite(margin)) return "0";
  return String(Math.max(0, rev - margin));
}

const facetedFilter: FilterFn<ModelOpsRow> = (row, columnId, filterValue) => {
  const selected = filterValue as string[] | undefined;
  if (!selected?.length) return true;
  return selected.includes(String(row.getValue(columnId)));
};

export const MODEL_OS_COLUMN_LABELS: Record<string, string> = {
  name: "模型",
  bindings: "渠道",
  requests: "请求",
  success_rate: "成功率",
  failed: "失败",
  latency: "平均延迟",
  margin: "利润",
  price: "价格",
  margin_rate: "毛利率",
  created_at: "创建时间",
  status: "状态",
  sellable: "可售",
  action: "操作",
};

export const MODEL_OS_FILTER_FIELDS: FilterField[] = [
  {
    type: "checkbox",
    value: "status",
    label: "状态",
    defaultOpen: true,
    options: [
      { value: "enabled", label: "启用" },
      { value: "disabled", label: "停用" },
    ],
  },
  {
    type: "checkbox",
    value: "sellable",
    label: "可售",
    options: [
      { value: "true", label: "可售" },
      { value: "false", label: "不可售" },
    ],
  },
];

export function getModelSearchText(row: ModelOpsRow): string {
  return `${row.model_id} ${row.display_name} ${row.owned_by}`;
}

export function modelOsColumns(): ColumnDef<ModelOpsRow, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "model_id",
      header: ({ column }) => <ColumnHeader column={column} title="模型" />,
      enableHiding: false,
      cell: ({ row }) => (
        <TruncateCell
          text={row.original.model_id}
          className="font-medium"
          subtext={`${row.original.display_name} · ${row.original.owned_by}`}
        />
      ),
    },
    {
      id: "bindings",
      accessorFn: (r) => r.bindings_available,
      header: ({ column }) => <ColumnHeader column={column} title="渠道" />,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.bindings_available}/{row.original.bindings_total}
        </span>
      ),
    },
    {
      id: "requests",
      accessorKey: "request_total",
      header: ({ column }) => <ColumnHeader column={column} title="请求" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCompact(row.original.request_total)}</span>
      ),
    },
    {
      id: "success_rate",
      accessorKey: "success_rate",
      header: ({ column }) => <ColumnHeader column={column} title="成功率" />,
      cell: ({ row }) => (
        <AttemptSuccessRateCell
          attemptTotal={row.original.request_total}
          attemptSucceeded={row.original.request_succeeded}
          successRate={row.original.success_rate}
        />
      ),
    },
    {
      id: "failed",
      accessorFn: (r) => modelFailed(r),
      header: ({ column }) => <ColumnHeader column={column} title="失败" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCompact(modelFailed(row.original))}</span>
      ),
    },
    {
      id: "latency",
      accessorFn: (r) => r.latency.avg,
      header: ({ column }) => <ColumnHeader column={column} title="平均延迟" />,
      cell: ({ row }) => <AttemptLatencyCell latency={row.original.latency} />,
    },
    {
      id: "margin",
      accessorFn: (r) => Number(r.margin_usd),
      header: ({ column }) => <ColumnHeader column={column} title="利润" />,
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
                cost_usd: modelCostUsd(row.original),
                margin_usd: row.original.margin_usd,
              }}
              title={row.original.display_name}
            />
          </TipHoverCardContent>
        </HoverCard>
      ),
    },
    {
      id: "price",
      accessorFn: (r) => (r.has_price ? "true" : "false"),
      header: ({ column }) => <ColumnHeader column={column} title="价格" />,
      cell: ({ row }) =>
        row.original.has_price ? (
          <Badge variant="secondary">已配置</Badge>
        ) : (
          <Badge variant="destructive">缺价</Badge>
        ),
    },
    {
      id: "margin_rate",
      accessorKey: "margin_rate",
      header: ({ column }) => <ColumnHeader column={column} title="毛利率" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatPercent(row.original.margin_rate)}</span>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: ({ column }) => <ColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <ColumnHeader column={column} title="状态" />,
      filterFn: facetedFilter,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "enabled" ? "default" : "outline"}>
          {row.original.status === "enabled" ? "启用" : "停用"}
        </Badge>
      ),
    },
    {
      id: "sellable",
      accessorFn: (r) => (r.sellable ? "true" : "false"),
      header: ({ column }) => <ColumnHeader column={column} title="可售" />,
      filterFn: facetedFilter,
      cell: ({ row }) =>
        row.original.sellable ? (
          <Badge variant="default">可售</Badge>
        ) : (
          <Badge variant="destructive">不可售</Badge>
        ),
    },
    {
      id: "action",
      header: () => <span className="text-muted-foreground">操作</span>,
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => <ModelRowActions modelId={row.original.id} />,
    },
  ];
}
