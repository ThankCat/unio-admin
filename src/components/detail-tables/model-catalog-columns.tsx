import type { ColumnDef } from "@tanstack/react-table";
import type { CatalogEntry } from "@/lib/api/modelCatalog";
import { resizableColumn } from "@/components/data-table";
import { AdoptFromCatalogDialog } from "@/components/models/AdoptFromCatalogDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const MODEL_CATALOG_COLUMN_LABELS: Record<string, string> = {
  model: "模型",
  lab: "厂商",
  capability_count: "能力",
  adopted_count: "已采纳",
  status: "状态",
  action: "操作",
};

function CatalogStatusBadge({
  removed,
  adopted,
}: {
  removed: boolean;
  adopted: boolean;
}) {
  if (removed) {
    return <Badge variant="destructive">已下架</Badge>;
  }
  if (adopted) {
    return <Badge variant="secondary">已采纳</Badge>;
  }
  return <Badge variant="outline">未采纳</Badge>;
}

export function modelCatalogColumns(): ColumnDef<CatalogEntry, unknown>[] {
  return [
    resizableColumn<CatalogEntry>("model", {
      header: "模型",
      size: 280,
      minSize: 180,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{row.original.display_name}</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            {row.original.canonical_id}
          </span>
        </div>
      ),
    }),
    resizableColumn<CatalogEntry>("lab", {
      header: "厂商",
      size: 120,
      minSize: 88,
      meta: { label: "厂商" },
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.lab}
        </Badge>
      ),
    }),
    resizableColumn<CatalogEntry>("capability_count", {
      header: "能力",
      size: 88,
      minSize: 64,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.capability_count}</span>
      ),
    }),
    resizableColumn<CatalogEntry>("adopted_count", {
      header: "已采纳",
      size: 88,
      minSize: 64,
      cell: ({ row }) =>
        row.original.adopted_count > 0 ? (
          <span className="font-medium tabular-nums">{row.original.adopted_count}</span>
        ) : (
          <span className="text-muted-foreground tabular-nums">0</span>
        ),
    }),
    resizableColumn<CatalogEntry>("status", {
      header: "状态",
      size: 96,
      minSize: 72,
      cell: ({ row }) => (
        <CatalogStatusBadge
          removed={row.original.removed_upstream}
          adopted={row.original.adopted_count > 0}
        />
      ),
    }),
    resizableColumn<CatalogEntry>("action", {
      header: "操作",
      size: 88,
      minSize: 72,
      enableHiding: false,
      cell: ({ row }) => (
        <AdoptFromCatalogDialog entry={row.original}>
          <Button variant="outline" size="sm">
            采纳
          </Button>
        </AdoptFromCatalogDialog>
      ),
    }),
  ];
}
