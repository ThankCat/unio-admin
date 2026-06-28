import type { Table } from "@tanstack/react-table";
import { XIcon } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FilterCheckbox } from "./filter-checkbox";
import type { FilterField } from "./types";

function activeCount(table: Table<unknown>, columnId: string): number {
  const v = table.getColumn(columnId)?.getFilterValue();
  if (v == null) return 0;
  return Array.isArray(v) ? v.length : 1;
}

/** 左侧筛选栏：每个 facet 一个折叠项，标题右侧显示已选数量与清除。 */
export function FilterControls<TData>({
  table,
  filterFields,
}: {
  table: Table<TData>;
  filterFields: FilterField[];
}) {
  const t = table as unknown as Table<unknown>;
  return (
    <Accordion
      type="multiple"
      defaultValue={filterFields
        .filter((f) => f.defaultOpen)
        .map((f) => f.value)}
    >
      {filterFields.map((field) => {
        const count = activeCount(t, field.value);
        return (
          <AccordionItem key={field.value} value={field.value}>
            <AccordionTrigger className="px-1">
              <span className="flex items-center gap-2">
                {field.label}
                {count > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-5 gap-1 rounded-full px-1.5 font-mono text-[10px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      table.getColumn(field.value)?.setFilterValue(undefined);
                    }}
                  >
                    {count}
                    <XIcon className="size-3" />
                  </Badge>
                ) : null}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-1">
              <FilterCheckbox table={table} field={field} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
