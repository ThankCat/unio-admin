import { useMemo } from "react";
import type { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FilterField } from "./types";

export type FilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

export function buildFilterChips<TData>(
  table: Table<TData>,
  filterFields: FilterField[],
  globalFilter: string,
  onClearGlobalFilter: () => void,
): FilterChip[] {
  const chips: FilterChip[] = [];

  const search = globalFilter.trim();
  if (search) {
    chips.push({
      id: "global-search",
      label: `搜索 · ${search}`,
      onRemove: onClearGlobalFilter,
    });
  }

  for (const field of filterFields) {
    const column = table.getColumn(field.value);
    const raw = column?.getFilterValue();
    const selected = raw == null ? [] : Array.isArray(raw) ? (raw as string[]) : [String(raw)];

    for (const value of selected) {
      const option = field.options.find((o) => o.value === value);
      chips.push({
        id: `${field.value}:${value}`,
        label: `${field.label} · ${option?.label ?? value}`,
        onRemove: () => {
          const next = selected.filter((v) => v !== value);
          column?.setFilterValue(next.length ? next : undefined);
        },
      });
    }
  }

  return chips;
}

/** 当前生效的筛选条件 Chip 条；无筛选时不渲染。 */
export function FilterChips({
  chips,
  onClearAll,
  className,
}: {
  chips: FilterChip[];
  onClearAll: () => void;
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="bg-muted/60 inline-flex h-7 max-w-full items-center gap-1 rounded-full border px-2.5 text-xs"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-full p-0.5 transition-colors"
            aria-label={`移除 ${chip.label}`}
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground h-7 px-2 text-xs font-normal"
        onClick={onClearAll}
      >
        清除全部
      </Button>
    </div>
  );
}

export function useFilterChips<TData>(
  table: Table<TData>,
  filterFields: FilterField[],
  globalFilter: string,
  onClearGlobalFilter: () => void,
  columnFilters: unknown,
) {
  return useMemo(
    () => buildFilterChips(table, filterFields, globalFilter, onClearGlobalFilter),
    [table, filterFields, globalFilter, onClearGlobalFilter, columnFilters],
  );
}
