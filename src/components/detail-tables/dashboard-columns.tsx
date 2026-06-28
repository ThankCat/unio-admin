import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import type { RadarBadChannel } from "@/lib/api/dashboard";
import { resizableColumn } from "@/components/data-table";
import { HEALTH_LABEL, HEALTH_VARIANT } from "@/components/channels/health";
import { TruncateCell } from "@/components/openstatus-table/truncate-cell";
import { formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const BAD_CHANNELS_COLUMN_LABELS: Record<string, string> = {
  name: "渠道",
  bucket: "健康",
  success_rate: "成功率",
  recent_error_code: "最近错误",
  action: "操作",
};

export function badChannelsColumns(): ColumnDef<RadarBadChannel, unknown>[] {
  return [
    resizableColumn<RadarBadChannel>("name", {
      header: "渠道",
      size: 180,
      minSize: 120,
      enableHiding: false,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    }),
    resizableColumn<RadarBadChannel>("bucket", {
      header: "健康",
      size: 88,
      minSize: 72,
      cell: ({ row }) => (
        <Badge variant={HEALTH_VARIANT[row.original.bucket]}>{HEALTH_LABEL[row.original.bucket]}</Badge>
      ),
    }),
    resizableColumn<RadarBadChannel>("success_rate", {
      header: "成功率",
      size: 96,
      minSize: 80,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatPercent(row.original.success_rate)}</span>
      ),
    }),
    resizableColumn<RadarBadChannel>("recent_error_code", {
      header: "最近错误",
      size: 140,
      minSize: 100,
      cell: ({ row }) => (
        <TruncateCell
          className="text-muted-foreground text-xs"
          text={row.original.recent_error_code || "—"}
        />
      ),
    }),
    resizableColumn<RadarBadChannel>("action", {
      header: "操作",
      size: 80,
      minSize: 64,
      enableHiding: false,
      cell: ({ row }) => (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/channels?channel_id=${row.original.channel_id}`}>查看</Link>
        </Button>
      ),
    }),
  ];
}
