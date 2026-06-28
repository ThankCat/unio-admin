import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";
import type { CapabilityKeyDef } from "@/lib/api/capability";
import { resizableColumn } from "@/components/data-table";
import {
  normalizeProtocolScope,
  protocolScopeLabel,
} from "@/lib/capability/protocolScope";
import { Button } from "@/components/ui/button";

export const CAPABILITY_DICTIONARY_COLUMN_LABELS: Record<string, string> = {
  key: "key",
  protocol_scope: "协议归属",
  domain: "domain",
  display_name: "展示名",
  description: "描述",
  sort_order: "排序",
  action: "操作",
};

export function capabilityDictionaryColumns(handlers: {
  onEdit: (row: CapabilityKeyDef) => void;
  onDelete: (row: CapabilityKeyDef) => void;
}): ColumnDef<CapabilityKeyDef, unknown>[] {
  return [
    resizableColumn<CapabilityKeyDef>("key", {
      header: "key",
      size: 220,
      minSize: 140,
      enableHiding: false,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.key}</span>,
    }),
    resizableColumn<CapabilityKeyDef>("protocol_scope", {
      header: "协议归属",
      size: 120,
      minSize: 88,
      cell: ({ row }) => (
        <span className="text-sm">
          {protocolScopeLabel(normalizeProtocolScope(row.original.protocol_scope))}
        </span>
      ),
    }),
    resizableColumn<CapabilityKeyDef>("domain", {
      header: "domain",
      size: 120,
      minSize: 88,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.domain}</span>
      ),
    }),
    resizableColumn<CapabilityKeyDef>("display_name", {
      header: "展示名",
      size: 160,
      minSize: 120,
      cell: ({ row }) => row.original.display_name,
    }),
    resizableColumn<CapabilityKeyDef>("description", {
      header: "描述",
      size: 240,
      minSize: 120,
      cell: ({ row }) => (
        <span className="text-muted-foreground block max-w-md truncate text-xs">
          {row.original.description}
        </span>
      ),
    }),
    resizableColumn<CapabilityKeyDef>("sort_order", {
      header: "排序",
      size: 72,
      minSize: 56,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.sort_order}</span>
      ),
    }),
    resizableColumn<CapabilityKeyDef>("action", {
      header: "操作",
      size: 96,
      minSize: 72,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="编辑"
            onClick={() => handlers.onEdit(row.original)}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="删除"
            onClick={() => handlers.onDelete(row.original)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ),
    }),
  ];
}
