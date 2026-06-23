import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BoxIcon,
  CableIcon,
  CircleDollarSignIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { listChannels, type Channel } from "@/lib/api/channels";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelFormDialog } from "@/components/channels/ChannelFormDialog";
import { DeleteChannelDialog } from "@/components/channels/DeleteChannelDialog";
import { ChannelModelsDialog } from "@/components/channels/ChannelModelsDialog";
import { ChannelPricesDialog } from "@/components/channels/ChannelPricesDialog";
import { RotateCredentialDialog } from "@/components/channels/RotateCredentialDialog";
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

const COLS = 6;
const PAGE_SIZE = 20;

export function ChannelsPage() {
  const [tab, setTab] = useState<StatusFilter>("enabled");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const search = useDebouncedValue(searchInput.trim(), 300);

  const query = useQuery({
    queryKey: ["channels", { status: tab, q: search, page }],
    queryFn: () =>
      listChannels({ page, pageSize: PAGE_SIZE, status: tab, q: search }),
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
        <CardTitle>渠道</CardTitle>
        <CardDescription>provider 下的具体上游线路</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            新建
          </Button>
          <ChannelFormDialog open={createOpen} onOpenChange={setCreateOpen} />
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
              placeholder="搜索名称 / 地址"
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
                  <TableHead>名称</TableHead>
                  <TableHead>服务商</TableHead>
                  <TableHead>协议</TableHead>
                  <TableHead className="w-20 text-right">优先级</TableHead>
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
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto size-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS} className="h-48">
                      <ChannelsEmpty search={search} tab={tab} />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((c) => <ChannelRow key={c.id} channel={c} />)
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

function ChannelRow({ channel: c }: { channel: Channel }) {
  const [editOpen, setEditOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground tabular-nums">
        {c.id}
      </TableCell>
      <TableCell>
        <div className="font-medium">{c.name}</div>
        <div className="text-muted-foreground text-xs">{c.base_url}</div>
      </TableCell>
      <TableCell>{c.provider_name || `#${c.provider_id}`}</TableCell>
      <TableCell>
        <Badge variant="outline">{c.protocol}</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{c.priority}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="操作">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setModelsOpen(true)}>
              <BoxIcon />
              管理模型
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPricesOpen(true)}>
              <CircleDollarSignIcon />
              定价（售价/成本）
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <PencilIcon />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRotateOpen(true)}>
              <KeyRoundIcon />
              轮换凭据
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ChannelFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          channel={c}
        />
        <RotateCredentialDialog
          open={rotateOpen}
          onOpenChange={setRotateOpen}
          channel={c}
        />
        <ChannelModelsDialog
          open={modelsOpen}
          onOpenChange={setModelsOpen}
          channel={c}
        />
        <ChannelPricesDialog
          open={pricesOpen}
          onOpenChange={setPricesOpen}
          channel={c}
        />
        <DeleteChannelDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          channel={c}
        />
      </TableCell>
    </TableRow>
  );
}

function ChannelsEmpty({
  search,
  tab,
}: {
  search: string;
  tab: StatusFilter;
}) {
  if (search) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        没有匹配「{search}」的渠道
      </p>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CableIcon />
        </EmptyMedia>
        <EmptyTitle>暂无渠道</EmptyTitle>
        <EmptyDescription>
          {tab === "enabled" ? "没有启用中的渠道。" : "没有已停用的渠道。"}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
