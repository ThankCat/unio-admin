import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LibraryIcon, SearchIcon } from "lucide-react";
import { listCatalog } from "@/lib/api/modelCatalog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { AdoptFromCatalogDialog } from "@/components/models/AdoptFromCatalogDialog";

const COLS = 6;
const PAGE_SIZE = 20;

export function ModelCatalogPage() {
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const query = useQuery({
    queryKey: ["model-catalog", { q: search, page }],
    queryFn: () => listCatalog({ page, pageSize: PAGE_SIZE, q: search }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > pageCount) {
    setPage(pageCount);
  }

  function changeSearch(next: string) {
    setSearchInput(next);
    setPage(1);
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>模型目录</CardTitle>
        <CardDescription>
          来自 models.dev 的参考目录（运行时不读）。从中采纳模板创建可独立编辑的运营模型。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-end">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="搜索 canonical_id / 名称"
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
                  <TableHead>canonical_id</TableHead>
                  <TableHead>厂商</TableHead>
                  <TableHead>展示名</TableHead>
                  <TableHead className="text-right">能力 / 已采纳</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: COLS }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className="h-48">
                      <CatalogEmpty search={search} />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((e) => (
                    <TableRow key={e.canonical_id}>
                      <TableCell className="font-mono text-sm">
                        {e.canonical_id}
                      </TableCell>
                      <TableCell>{e.lab}</TableCell>
                      <TableCell>{e.display_name}</TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {e.capability_count} / {e.adopted_count}
                      </TableCell>
                      <TableCell>
                        {e.removed_upstream ? (
                          <Badge variant="destructive">已下架</Badge>
                        ) : e.adopted_count > 0 ? (
                          <Badge variant="secondary">已采纳</Badge>
                        ) : (
                          <Badge variant="outline">未采纳</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AdoptFromCatalogDialog entry={e}>
                          <Button variant="outline" size="sm">
                            采纳
                          </Button>
                        </AdoptFromCatalogDialog>
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

function CatalogEmpty({ search }: { search: string }) {
  if (search) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        没有匹配「{search}」的目录条目
      </p>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryIcon />
        </EmptyMedia>
        <EmptyTitle>目录为空</EmptyTitle>
        <EmptyDescription>
          在「能力中心 → 同步」执行一次 models.dev 同步以填充目录。
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
