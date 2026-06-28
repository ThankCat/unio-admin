import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon } from "lucide-react";
import type { SyncJob } from "@/lib/api/capability";
import type { RecoveryJobSummary } from "@/lib/api/system";
import { formatDateTime, trimDecimal } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecoveryStatusBadge } from "@/components/system/RecoveryStatusBadge";
import { RecoveryJobDetailDialog } from "@/components/system/RecoveryJobDetailDialog";
import { ColumnHeader } from "./column-header";
import { TruncateCell } from "./truncate-cell";

export const RECOVERY_OS_COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  status: "状态",
  user_channel: "用户 / 渠道",
  attempts: "重试",
  authorized_amount: "冻结金额",
  created_at: "创建时间",
  action: "操作",
};

export const SYNC_OS_COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  source: "来源",
  status: "状态",
  created_at: "创建时间",
  finished_at: "结束时间",
};

export const RECOVERY_STATUS_OPTIONS = [
  { value: "pending", label: "待执行" },
  { value: "running", label: "运行中" },
  { value: "succeeded", label: "已完成" },
  { value: "dead", label: "已死信" },
] as const;

function syncStatusBadge(status: string) {
  if (status === "succeeded") return <Badge variant="default">成功</Badge>;
  if (status === "running") return <Badge variant="secondary">运行中</Badge>;
  if (status === "failed") return <Badge variant="destructive">失败</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function recoveryJobOsColumns(): ColumnDef<RecoveryJobSummary, unknown>[] {
  return [
    {
      id: "id",
      accessorKey: "id",
      header: ({ column }) => <ColumnHeader column={column} title="ID" />,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.id}</span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <ColumnHeader column={column} title="状态" />,
      cell: ({ row }) => <RecoveryStatusBadge status={row.original.status} />,
    },
    {
      id: "user_channel",
      accessorFn: (r) => `${r.user_id}/${r.channel_id}`,
      header: ({ column }) => <ColumnHeader column={column} title="用户 / 渠道" />,
      cell: ({ row }) => (
        <TruncateCell
          className="text-muted-foreground tabular-nums"
          text={`${row.original.user_id} / ${row.original.channel_id}`}
        />
      ),
    },
    {
      id: "attempts",
      accessorFn: (r) => r.attempt_count,
      header: ({ column }) => <ColumnHeader column={column} title="重试" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.attempt_count} / {row.original.max_attempts}
        </span>
      ),
    },
    {
      id: "authorized_amount",
      accessorFn: (r) => Number(r.authorized_amount),
      header: ({ column }) => <ColumnHeader column={column} title="冻结金额" />,
      cell: ({ row }) => (
        <TruncateCell
          className="tabular-nums"
          text={`${trimDecimal(row.original.authorized_amount)} ${row.original.currency}`}
        />
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: ({ column }) => <ColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "action",
      header: () => <span className="text-muted-foreground">操作</span>,
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RecoveryJobDetailDialog jobId={row.original.id}>
            <Button variant="ghost" size="icon-sm" aria-label="详情">
              <EyeIcon />
            </Button>
          </RecoveryJobDetailDialog>
        </div>
      ),
    },
  ];
}

export function syncJobOsColumns(): ColumnDef<SyncJob, unknown>[] {
  return [
    {
      id: "id",
      accessorKey: "id",
      header: ({ column }) => <ColumnHeader column={column} title="ID" />,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.id}</span>
      ),
    },
    {
      id: "source",
      accessorKey: "source",
      header: ({ column }) => <ColumnHeader column={column} title="来源" />,
      cell: ({ row }) => <TruncateCell text={row.original.source} />,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <ColumnHeader column={column} title="状态" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          {syncStatusBadge(row.original.status)}
          {row.original.error_text ? (
            <div className="text-destructive truncate text-xs" title={row.original.error_text}>
              {row.original.error_text}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: ({ column }) => <ColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "finished_at",
      accessorFn: (r) => r.finished_at ?? "",
      header: ({ column }) => <ColumnHeader column={column} title="结束时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.finished_at ? formatDateTime(row.original.finished_at) : "—"}
        </span>
      ),
    },
  ];
}
