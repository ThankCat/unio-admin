import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCompact } from "@/lib/format";

// 单值列的 faceted 过滤：filterValue 为选中值数组，命中其一即保留。
export function facetedFilterFn<TData>(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown,
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
  return filterValue.includes(row.getValue(columnId) as string);
}
// TanStack 需要 filterFn 标记自动重算
facetedFilterFn.autoRemove = (v: unknown) =>
  !Array.isArray(v) || (v as unknown[]).length === 0;

export type OstFilterField = {
  columnId: string;
  label: string;
  /** 把列原始值映射为展示标签；缺省直接显示原值 */
  renderOption?: (value: string) => ReactNode;
  /** 选项排序（缺省按计数降序） */
  order?: string[];
};

function FilterGroup<TData>({
  table,
  field,
}: {
  table: Table<TData>;
  field: OstFilterField;
}) {
  const column = table.getColumn(field.columnId);
  if (!column) return null;

  const facets = column.getFacetedUniqueValues();
  const selected = new Set((column.getFilterValue() as string[]) ?? []);

  let entries = Array.from(facets.entries()).filter(([k]) => k != null);
  if (field.order) {
    const rank = new Map(field.order.map((v, i) => [v, i]));
    entries = entries.sort(
      ([a], [b]) =>
        (rank.get(String(a)) ?? 999) - (rank.get(String(b)) ?? 999),
    );
  } else {
    entries = entries.sort((a, b) => b[1] - a[1]);
  }

  if (entries.length === 0) return null;

  const toggle = (value: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(value);
    else next.delete(value);
    const arr = Array.from(next);
    column.setFilterValue(arr.length ? arr : undefined);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">
        {field.label}
      </span>
      <div className="border-border divide-border divide-y rounded-lg border">
        {entries.map(([rawValue, count]) => {
          const value = String(rawValue);
          const isChecked = selected.has(value);
          return (
            <label
              key={value}
              className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm first:rounded-t-lg last:rounded-b-lg"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={(c) => toggle(value, !!c)}
              />
              <span className="min-w-0 flex-1 truncate">
                {field.renderOption ? field.renderOption(value) : value}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums text-xs">
                {formatCompact(count)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function OstFilterControls<TData>({
  table,
  fields,
  className,
}: {
  table: Table<TData>;
  fields: OstFilterField[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {fields.map((field) => (
        <FilterGroup key={field.columnId} table={table} field={field} />
      ))}
    </div>
  );
}
