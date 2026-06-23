import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BoxIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ModelCapabilitiesDialog } from "@/components/models/ModelCapabilitiesDialog";
import { DeleteModelDialog } from "@/components/models/DeleteModelDialog";
import { CatalogUpdateDialog } from "@/components/models/CatalogUpdateDialog";
import { ModelCatalogTab } from "@/components/models/ModelCatalogTab";

const COLS = 6;
const PAGE_SIZE = 20;
type ModelsPageTab = "ops" | "catalog";

export function ModelsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageTab: ModelsPageTab =
    searchParams.get("tab") === "catalog" ? "catalog" : "ops";
  const [tab, setTab] = useState<StatusFilter>("enabled");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [customCreateOpen, setCustomCreateOpen] = useState(false);

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

  function setPageTab(next: ModelsPageTab) {
    const params = new URLSearchParams(searchParams);
    if (next === "ops") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>模型</CardTitle>
        <CardDescription>
          运营模型是对外暴露与计费的实体；参考目录来自 models.dev，用于采纳创建模型。
        </CardDescription>
        {pageTab === "ops" ? (
          <CardAction>
            <Button size="sm" onClick={() => setCustomCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              新建
            </Button>
            <ModelFormDialog
              key={customCreateOpen ? "create-open" : "create-closed"}
              open={customCreateOpen}
              onOpenChange={setCustomCreateOpen}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as ModelsPageTab)}>
          <TabsList>
            <TabsTrigger value="ops">运营模型</TabsTrigger>
            <TabsTrigger value="catalog">参考目录</TabsTrigger>
          </TabsList>

          <TabsContent value="ops" className="flex flex-col gap-4 pt-4">
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
                  <TableHead className="w-32 text-right">操作</TableHead>
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
                        <div className="flex items-center gap-1.5">
                          <SourceBadge source={m.source} />
                          {m.catalog?.update_available ? (
                            <CatalogUpdateDialog model={m}>
                              <button
                                type="button"
                                aria-label="目录有更新"
                                className="cursor-pointer"
                              >
                                <Badge
                                  variant={
                                    m.catalog.removed_upstream
                                      ? "destructive"
                                      : "default"
                                  }
                                >
                                  {m.catalog.removed_upstream ? "已下架" : "有更新"}
                                </Badge>
                              </button>
                            </CatalogUpdateDialog>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ModelStatusToggle model={m} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                          <DeleteModelDialog model={m}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="删除"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon />
                            </Button>
                          </DeleteModelDialog>
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
          </TabsContent>

          <TabsContent value="catalog" className="pt-4">
            <ModelCatalogTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// 来源徽标：manual=空白手建，catalog=从 models.dev 目录采纳。
function SourceBadge({ source }: { source: string }) {
  if (source === "manual") {
    return <Badge variant="secondary">手建</Badge>;
  }
  if (source === "catalog") {
    return <Badge variant="outline">目录采纳</Badge>;
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
