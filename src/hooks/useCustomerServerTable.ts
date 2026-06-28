import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useServerList } from "@/hooks/useServerList";
import type { FilterChip } from "@/components/openstatus-table";
import type { Page } from "@/lib/api/types";

const PAGE_SIZE = 20;

interface UseCustomerServerTableOptions<T> {
  queryKey: string;
  fetch: (params: {
    range: "all";
    page: number;
    page_size: number;
    sort?: string;
    search?: string;
  }) => Promise<Page<T>>;
  defaultSort: { id: string; desc: boolean };
}

/** 用户 / 项目运维表：分页 / 排序 / search。 */
export function useCustomerServerTable<T>({
  queryKey,
  fetch,
  defaultSort,
}: UseCustomerServerTableOptions<T>) {
  const { page, setPage, sorting, setSorting, sort } = useServerList({
    pageSize: PAGE_SIZE,
    defaultSort,
  });

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);

  const query = useQuery({
    queryKey: [queryKey, page, sort, search],
    queryFn: () =>
      fetch({
        range: "all",
        page,
        page_size: PAGE_SIZE,
        sort,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount, setPage]);

  const chips = useMemo((): FilterChip[] => {
    if (!search) return [];
    return [
      {
        id: "search",
        label: `搜索 · ${search}`,
        onRemove: () => {
          setSearchInput("");
          setPage(1);
        },
      },
    ];
  }, [search, setPage]);

  return {
    items: query.data?.items ?? [],
    total,
    page,
    pageCount,
    setPage,
    sorting,
    setSorting,
    searchInput,
    onSearchChange: (v: string) => {
      setSearchInput(v);
      setPage(1);
    },
    chips,
    resetFilters: () => {
      setSearchInput("");
      setPage(1);
    },
    query,
  };
}
