import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, KeyRoundIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProjectOpsRow } from "@/lib/api/customerOps";
import { formatCompact, formatRelativeTime, formatUSD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "./column-header";
import { TruncateCell } from "./truncate-cell";

export const PROJECT_OS_COLUMN_LABELS: Record<string, string> = {
  name: "项目",
  user_email: "所属用户",
  default_route: "默认线路",
  keys: "Key",
  requests: "请求",
  consumption: "消费",
  last_used: "最近",
  action: "操作",
};

export function getProjectSearchText(row: ProjectOpsRow): string {
  return `${row.name} ${row.user_email}`;
}

export function projectOsColumns(): ColumnDef<ProjectOpsRow, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="项目" />,
      enableHiding: false,
      cell: ({ row }) => <TruncateCell text={row.original.name} className="font-medium" />,
    },
    {
      id: "user_email",
      accessorKey: "user_email",
      header: ({ column }) => <ColumnHeader column={column} title="所属用户" />,
      cell: ({ row }) => (
        <TruncateCell className="text-muted-foreground text-xs" text={row.original.user_email} />
      ),
    },
    {
      id: "default_route",
      accessorFn: (r) => r.default_route_name || "由 Key 决定",
      header: ({ column }) => <ColumnHeader column={column} title="默认线路" />,
      cell: ({ row }) => (
        <TruncateCell className="text-xs" text={row.original.default_route_name || "由 Key 决定"} />
      ),
    },
    {
      id: "keys",
      accessorFn: (r) => r.key_enabled,
      header: ({ column }) => <ColumnHeader column={column} title="Key" />,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.key_enabled}/{row.original.key_total}
        </span>
      ),
    },
    {
      id: "requests",
      accessorKey: "request_total",
      header: ({ column }) => <ColumnHeader column={column} title="请求" />,
      cell: ({ row }) => <span className="tabular-nums">{formatCompact(row.original.request_total)}</span>,
    },
    {
      id: "consumption",
      accessorFn: (r) => Number(r.consumption_usd),
      header: ({ column }) => <ColumnHeader column={column} title="消费" />,
      cell: ({ row }) => <span className="tabular-nums">{formatUSD(row.original.consumption_usd)}</span>,
    },
    {
      id: "last_used",
      accessorFn: (r) => r.last_used_at ?? "",
      header: ({ column }) => <ColumnHeader column={column} title="最近" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.original.last_used_at ? formatRelativeTime(row.original.last_used_at) : "—"}
        </span>
      ),
    },
    {
      id: "action",
      header: () => <span className="text-muted-foreground">操作</span>,
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="ghost" size="icon-sm" aria-label="查看">
            <Link to={`/projects/${row.original.id}`}>
              <EyeIcon />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="API Keys">
            <Link to={`/projects/${row.original.id}/api-keys`}>
              <KeyRoundIcon />
            </Link>
          </Button>
        </div>
      ),
    },
  ];
}
