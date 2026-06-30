import type { ColumnDef } from "@tanstack/react-table";
import type { CustomerKey } from "@/lib/api/customerOps";
import { resizableColumn } from "@/components/data-table";
import { formatUSD } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const USER_OPS_KEY_COLUMN_LABELS: Record<string, string> = {
  name: "Key",
  status: "状态",
  spent_total: "已用",
};

export function userOpsKeyColumns(): ColumnDef<CustomerKey, unknown>[] {
  return [
    resizableColumn<CustomerKey>("name", {
      header: "Key",
      size: 200,
      minSize: 140,
      enableHiding: false,
      cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
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
