import type { Column } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// openstatus 风格可排序表头：标题 + 上下箭头，点击循环切换排序。
export function OstColumnHeader<TData, TValue>({
  column,
  title,
  align = "start",
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  align?: "start" | "end";
  className?: string;
}) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          "text-muted-foreground font-medium",
          align === "end" && "text-right",
          className,
        )}
      >
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(undefined)}
      className={cn(
        "text-muted-foreground hover:text-foreground -mx-1.5 flex h-7 items-center gap-1 rounded px-1.5 font-medium transition-colors select-none",
        align === "end" ? "ml-auto flex-row-reverse" : "",
        className,
      )}
    >
      <span>{title}</span>
      <span className="flex flex-col">
        <ChevronUpIcon
          className={cn(
            "-mb-0.5 size-3",
            sorted === "asc" ? "text-foreground" : "text-muted-foreground/40",
          )}
        />
        <ChevronDownIcon
          className={cn(
            "-mt-0.5 size-3",
            sorted === "desc" ? "text-foreground" : "text-muted-foreground/40",
          )}
        />
      </span>
    </button>
  );
}
