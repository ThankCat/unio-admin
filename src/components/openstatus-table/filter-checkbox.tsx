import { useMemo, useState } from "react";
import type { Table } from "@tanstack/react-table";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CheckboxFilterField } from "./types";

/** 单个 facet 的多选筛选：选项 + faceted 计数 + 「仅」快捷 + 搜索（选项多时）。 */
export function FilterCheckbox<TData>({
  table,
  field,
}: {
  table: Table<TData>;
  field: CheckboxFilterField;
}) {
  const [input, setInput] = useState("");
  const column = table.getColumn(field.value);
  const facets = column?.getFacetedUniqueValues();

  const rawFilter = column?.getFilterValue();
  const selected = useMemo(() => {
    if (rawFilter == null) return [] as string[];
    return Array.isArray(rawFilter) ? (rawFilter as string[]) : [String(rawFilter)];
  }, [rawFilter]);

  const options = field.options.filter(
    (o) => input === "" || o.label.toLowerCase().includes(input.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-2">
      {field.options.length > 4 ? (
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索选项"
            className="h-8 pl-8"
          />
        </div>
      ) : null}

      <div className="rounded-lg border">
        {options.map((option, index) => {
          const checked = selected.includes(option.value);
          const count = facets?.get(option.value);
          return (
            <div
              key={option.value}
              className={cn(
                "group/opt hover:bg-accent/50 relative flex items-center gap-2 px-2.5 py-2",
                index !== options.length - 1 && "border-b",
              )}
            >
              <Checkbox
                id={`${field.value}-${option.value}`}
                checked={checked}
                onCheckedChange={(next) => {
                  const value = next
                    ? [...selected, option.value]
                    : selected.filter((v) => v !== option.value);
                  column?.setFilterValue(value.length ? value : undefined);
                }}
              />
              <Label
                htmlFor={`${field.value}-${option.value}`}
                className="flex w-full items-center gap-1.5 truncate text-foreground/80 group-hover/opt:text-foreground"
              >
                <span className="truncate">
                  {option.render ? option.render() : option.label}
                </span>
                <span className="text-muted-foreground ml-auto font-mono text-[11px] tabular-nums">
                  {count != null ? formatCompact(count) : "0"}
                </span>
              </Label>
              <button
                type="button"
                onClick={() => column?.setFilterValue([option.value])}
                className="text-muted-foreground hover:text-foreground bg-accent/70 absolute inset-y-0 right-1 my-auto hidden h-5 rounded-md px-1.5 text-[11px] backdrop-blur-xs group-hover/opt:flex group-hover/opt:items-center"
              >
                仅此
              </button>
            </div>
          );
        })}
        {options.length === 0 ? (
          <p className="text-muted-foreground px-2.5 py-3 text-xs">无匹配选项</p>
        ) : null}
      </div>
    </div>
  );
}
