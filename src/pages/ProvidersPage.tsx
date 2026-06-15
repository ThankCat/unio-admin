import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ServerIcon,
  Trash2Icon,
} from "lucide-react";
import { listProviders } from "@/lib/api/providers";
import type { StatusFilter } from "@/lib/api/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TablePagination } from "@/components/common/TablePagination";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import { ProviderStatusToggle } from "@/components/providers/ProviderStatusToggle";
import { DeleteProviderDialog } from "@/components/providers/DeleteProviderDialog";

const COLS = 5;
const PAGE_SIZE = 20;

export function ProvidersPage() {
  const [tab, setTab] = useState<StatusFilter>("enabled");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const query = useQuery({
    queryKey: ["providers", { status: tab, q: search, page }],
    queryFn: () =>
      listProviders({ page, pageSize: PAGE_SIZE, status: tab, q: search }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 渲染期夹紧：过滤后总数变小（如停用最后一条）导致当前页越界时，回退到末页。
  if (page > pageCount) {
    setPage(pageCount);
  }

  function changeTab(next: string) {
    setTab(next as StatusFilter);
    setPage(1);
  }

  function changeSearch(next: string) {
    setSearchInput(next);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>服务商</CardTitle>
        <CardDescription>上游服务商列表</CardDescription>
        <CardAction>
          <ProviderFormDialog>
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              新建
            </Button>
          </ProviderFormDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={changeTab}>
            <TabsList>
              <TabsTrigger value="enabled">启用</TabsTrigger>
              <TabsTrigger value="disabled">停用</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full max-w-xs">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="搜索标识 / 名称"
              value={searchInput}
              onChange={(e) => changeSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {query.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{query.error.message}</AlertDescription>
          </Alert>
        ) : (
          <>
            <Table className={query.isFetching ? "opacity-60" : undefined}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>标识</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto size-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className="h-48">
                      <ProvidersEmpty search={search} tab={tab} />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {p.id}
                      </TableCell>
                      <TableCell className="font-medium">{p.slug}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <ProviderStatusToggle provider={p} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ProviderFormDialog provider={p}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="编辑"
                            >
                              <PencilIcon />
                            </Button>
                          </ProviderFormDialog>
                          <DeleteProviderDialog provider={p}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="删除"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon />
                            </Button>
                          </DeleteProviderDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <TablePagination
              page={page}
              pageCount={pageCount}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProvidersEmpty({
  search,
  tab,
}: {
  search: string;
  tab: StatusFilter;
}) {
  if (search) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        没有匹配「{search}」的服务商
      </p>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ServerIcon />
        </EmptyMedia>
        <EmptyTitle>暂无服务商</EmptyTitle>
        <EmptyDescription>
          {tab === "enabled" ? "没有启用中的服务商。" : "没有已停用的服务商。"}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
