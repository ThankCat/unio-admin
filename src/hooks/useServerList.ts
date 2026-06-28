import { useCallback, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import {
  apiSortToSorting,
  sortingToApiSort,
  type ServerListParams,
} from "@/lib/api/list-params";

const DEFAULT_PAGE_SIZE = 20;

export interface UseServerListOptions<F extends Record<string, unknown>> {
  pageSize?: number;
  /** 默认排序 API 字段（不含 +/- 前缀） */
  defaultSort?: { id: string; desc: boolean };
  initialFilters?: F;
}

/**
 * 服务端列表状态：page / page_size / sort / 筛选字段。
 * 表格 onSortingChange / 筛选变更时重置到第 1 页。
 */
export function useServerList<F extends Record<string, unknown> = Record<string, never>>({
  pageSize = DEFAULT_PAGE_SIZE,
  defaultSort,
  initialFilters,
}: UseServerListOptions<F> = {}) {
  const [page, setPage] = useState(1);
  const [sorting, setSortingState] = useState<SortingState>(() =>
    defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc }] : [],
  );
  const [filters, setFilters] = useState<F>((initialFilters ?? {}) as F);

  const sort = useMemo(() => sortingToApiSort(sorting), [sorting]);

  const queryParams = useMemo((): ServerListParams & F => {
    return {
      page,
      page_size: pageSize,
      ...(sort ? { sort } : {}),
      ...filters,
    } as ServerListParams & F;
  }, [page, pageSize, sort, filters]);

  const onSortingChange = useCallback((next: SortingState) => {
    setSortingState(next);
    setPage(1);
  }, []);

  const patchFilters = useCallback((patch: Partial<F>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((initialFilters ?? {}) as F);
    setPage(1);
  }, [initialFilters]);

  const resetAll = useCallback(() => {
    setSortingState(defaultSort ? [{ id: defaultSort.id, desc: defaultSort.desc }] : []);
    setFilters((initialFilters ?? {}) as F);
    setPage(1);
  }, [defaultSort, initialFilters]);

  return {
    page,
    setPage,
    pageSize,
    sorting,
    setSorting: onSortingChange,
    sort,
    filters,
    setFilters: patchFilters,
    resetFilters,
    resetAll,
    queryParams,
    /** 从 URL 深链恢复 sort（可选） */
    setSortFromApi: (apiSort?: string) => setSortingState(apiSortToSorting(apiSort)),
  };
}
