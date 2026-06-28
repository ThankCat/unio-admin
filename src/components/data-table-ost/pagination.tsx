import type { Table } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// openstatus 风格分页栏：每页条数 + 第 X / Y 页 + 首/上/下/末。
export function OstPagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50],
}: {
  table: Table<TData>;
  pageSizeOptions?: number[];
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-muted-foreground text-sm tabular-nums">
        共 {total} 条
      </span>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">每页</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger size="sm" className="w-[4.5rem]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm font-medium tabular-nums">
          第 {pageIndex + 1} / {Math.max(pageCount, 1)} 页
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="首页"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="上一页"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="下一页"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="末页"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
