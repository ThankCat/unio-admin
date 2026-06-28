import type { Table } from "@tanstack/react-table";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// openstatus 风格列可见性下拉。
export function OstViewOptions<TData>({
  table,
  labels,
}: {
  table: Table<TData>;
  labels: Record<string, string>;
}) {
  const hideable = table.getAllColumns().filter((c) => c.getCanHide());
  if (hideable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontalIcon data-icon="inline-start" />
          列设置
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        {hideable.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(v) => column.toggleVisibility(!!v)}
          >
            {labels[column.id] ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
