import type { Table } from "@tanstack/react-table";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterCheckbox } from "./filter-checkbox";
import type { CheckboxFilterField } from "./types";

function activeCount(table: Table<unknown>, columnId: string): number {
  const v = table.getColumn(columnId)?.getFilterValue();
  if (v == null) return 0;
  return Array.isArray(v) ? v.length : 1;
}

/** 顶栏 facet 按钮：Popover 内嵌 checkbox 筛选（Chip 模式的入口）。 */
export function FilterFacetPopover<TData>({
  table,
  field,
}: {
  table: Table<TData>;
  field: CheckboxFilterField;
}) {
  const t = table as unknown as Table<unknown>;
  const count = activeCount(t, field.value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 border-dashed", count > 0 && "border-solid")}
        >
          {field.label}
          {count > 0 ? (
            <Badge variant="secondary" className="h-5 rounded-full px-1.5 font-mono text-[10px]">
              {count}
            </Badge>
          ) : null}
          <ChevronDownIcon className="text-muted-foreground size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <FilterCheckbox table={table} field={field} />
      </PopoverContent>
    </Popover>
  );
}
