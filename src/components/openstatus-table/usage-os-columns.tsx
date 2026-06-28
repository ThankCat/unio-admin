import type { ColumnDef } from "@tanstack/react-table";
import type { UsageSummary } from "@/lib/api/usage";
import { formatCompact, formatDateTime } from "@/lib/format";
import { ColumnHeader } from "./column-header";
import { TruncateCell } from "./truncate-cell";

function inputTokens(u: UsageSummary): number {
  return (
    u.uncached_input_tokens +
    u.cache_read_input_tokens +
    u.cache_write_5m_input_tokens +
    u.cache_write_1h_input_tokens
  );
}

export const USAGE_OS_COLUMN_LABELS: Record<string, string> = {
  request_id: "请求 ID",
  model: "模型",
  input: "输入",
  output: "输出",
  source: "来源",
  user: "用户",
  created_at: "创建时间",
};

export function usageOsColumns(): ColumnDef<UsageSummary, unknown>[] {
  return [
    {
      id: "request_id",
      accessorKey: "request_id",
      header: ({ column }) => <ColumnHeader column={column} title="请求 ID" />,
      enableHiding: false,
      cell: ({ row }) => (
        <TruncateCell className="font-mono text-xs" text={row.original.request_id} />
      ),
    },
    {
      id: "model",
      accessorKey: "requested_model_id",
      header: ({ column }) => <ColumnHeader column={column} title="模型" />,
      cell: ({ row }) => (
        <TruncateCell className="font-medium" text={row.original.requested_model_id} />
      ),
    },
    {
      id: "input",
      accessorFn: (r) => inputTokens(r),
      header: ({ column }) => <ColumnHeader column={column} title="输入" />,
      cell: ({ row }) => <span className="tabular-nums">{formatCompact(inputTokens(row.original))}</span>,
    },
    {
      id: "output",
      accessorKey: "output_tokens_total",
      header: ({ column }) => <ColumnHeader column={column} title="输出" />,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatCompact(row.original.output_tokens_total)}</span>
      ),
    },
    {
      id: "source",
      accessorKey: "usage_source",
      header: ({ column }) => <ColumnHeader column={column} title="来源" />,
      cell: ({ row }) => (
        <TruncateCell className="text-muted-foreground text-xs" text={row.original.usage_source} />
      ),
    },
    {
      id: "user",
      accessorKey: "user_id",
      header: ({ column }) => <ColumnHeader column={column} title="用户" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.user_id}</span>
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
  ];
}
