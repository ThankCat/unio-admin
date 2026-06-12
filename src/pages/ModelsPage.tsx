import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BoxIcon,
  CircleDollarSignIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { listModels } from "@/lib/api/models";
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
import { Badge } from "@/components/ui/badge";
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
import { ModelFormDialog } from "@/components/models/ModelFormDialog";
import { ModelStatusToggle } from "@/components/models/ModelStatusToggle";
import { PricesDialog } from "@/components/models/PricesDialog";
import { ModelCapabilitiesDialog } from "@/components/models/ModelCapabilitiesDialog";

const COLS = 6;
const PAGE_SIZE = 20;

export function ModelsPage() {
  const [tab, setTab] = useState<StatusFilter>("enabled");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const query = useQuery({
    queryKey: ["models", { status: tab, q: search, page }],
    queryFn: () =>
      listModels({ page, pageSize: PAGE_SIZE, status: tab, q: search }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 渲染期夹紧：过滤后总数变小导致当前页越界时，回退到末页。
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
        <CardTitle>模型</CardTitle>
        <CardDescription>对外暴露与计费的模型目录</CardDescription>
        <CardAction>
          <ModelFormDialog>
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              新建
            </Button>
          </ModelFormDialog>
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
              placeholder="搜索 ID / 名称 / 归属方"
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
                  <TableHead>对外模型 ID</TableHead>
                  <TableHead>展示名</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-16 text-right">操作</TableHead>
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
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
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
                      <ModelsEmpty search={search} tab={tab} />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {m.id}
                      </TableCell>
                      <TableCell className="font-medium">{m.model_id}</TableCell>
                      <TableCell>{m.display_name}</TableCell>
                      <TableCell>
                        <SourceBadge source={m.source} />
                      </TableCell>
                      <TableCell>
                        <ModelStatusToggle model={m} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PricesDialog model={m}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="售价"
                            >
                              <CircleDollarSignIcon />
                            </Button>
                          </PricesDialog>
                          <ModelCapabilitiesDialog model={m}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="能力"
                            >
                              <SlidersHorizontalIcon />
                            </Button>
                          </ModelCapabilitiesDialog>
                          <ModelFormDialog model={m}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="编辑"
                            >
                              <PencilIcon />
                            </Button>
                          </ModelFormDialog>
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

// 来源徽标：manual=手建，seed_models_dev=同步种子（元数据会被同步覆盖），import=导入。
function SourceBadge({ source }: { source: string }) {
  if (source === "manual") {
    return <Badge variant="secondary">手建</Badge>;
  }
  if (source === "seed_models_dev") {
    return <Badge variant="outline">同步</Badge>;
  }
  return <Badge variant="outline">{source}</Badge>;
}

function ModelsEmpty({ search, tab }: { search: string; tab: StatusFilter }) {
  if (search) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        没有匹配「{search}」的模型
      </p>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BoxIcon />
        </EmptyMedia>
        <EmptyTitle>暂无模型</EmptyTitle>
        <EmptyDescription>
          {tab === "enabled" ? "没有启用中的模型。" : "没有已停用的模型。"}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
