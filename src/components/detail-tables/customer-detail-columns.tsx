import type { ColumnDef } from "@tanstack/react-table";
import type { ApiKeyOpsRow, CustomerKey } from "@/lib/api/customerOps";
import { resizableColumn } from "@/components/data-table";
import { formatCompact, formatUSD } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const PROJECT_OPS_KEY_COLUMN_LABELS: Record<string, string> = {
  name: "Key",
  status: "状态",
  request_total: "请求",
  consumption_usd: "消费",
};

export const USER_OPS_KEY_COLUMN_LABELS: Record<string, string> = {
  name: "Key",
  project_name: "项目",
  status: "状态",
  spent_total: "已用",
};

export function projectOpsKeyColumns(): ColumnDef<ApiKeyOpsRow, unknown>[] {
  return [
    resizableColumn<ApiKeyOpsRow>("name", {
      header: "Key",
      size: 200,
      minSize: 140,
      enableHiding: false,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    }),
    resizableColumn<ApiKeyOpsRow>("status", {
      header: "状态",
      size: 88,
      minSize: 72,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("request_total", {
      header: "请求",
      size: 96,
      minSize: 72,
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">{formatCompact(row.original.request_total)}</span>
      ),
    }),
    resizableColumn<ApiKeyOpsRow>("consumption_usd", {
      header: "消费",
      size: 112,
      minSize: 88,
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">{formatUSD(row.original.consumption_usd)}</span>
      ),
    }),
  ];
}

export function userOpsKeyColumns(): ColumnDef<CustomerKey, unknown>[] {
  return [
    resizableColumn<CustomerKey>("name", {
      header: "Key",
      size: 200,
      minSize: 140,
      enableHiding: false,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
    }),
    resizableColumn<CustomerKey>("project_name", {
      header: "项目",
      size: 160,
      minSize: 120,
      cell: ({ row }) => <span className="text-xs">{row.original.project_name}</span>,
    }),
    resizableColumn<CustomerKey>("status", {
      header: "状态",
      size: 88,
      minSize: 72,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "outline"}>
          {row.original.status}
        </Badge>
      ),
    }),
    resizableColumn<CustomerKey>("spent_total", {
      header: "已用",
      size: 112,
      minSize: 88,
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">{formatUSD(row.original.spent_total)}</span>
      ),
    }),
  ];
}
