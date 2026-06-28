import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { getUsersOpsTable } from "@/lib/api/customerOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { UserDetailContent } from "@/components/customer/UserDetailContent";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function UserDetailPage() {
  const { userId: userIdParam } = useParams();
  const userId = Number(userIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const rangeQuery = { ...params, range: value.preset };

  if (!Number.isFinite(userId) || userId <= 0) {
    return <Navigate to="/users" replace />;
  }

  const table = useQuery({
    queryKey: ["users", "ops-table", "all", rangeQuery],
    queryFn: () => getUsersOpsTable({ ...rangeQuery, page: 1, page_size: 500 }),
    placeholderData: keepPreviousData,
  });

  const row = useMemo(
    () => table.data?.items.find((u) => u.id === userId) ?? null,
    [table.data, userId],
  );

  const loading = table.isPending;
  const notFound = table.isSuccess && row == null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/users">用户</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{row?.email ?? "详情"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <RangeFilter value={value} onChange={setRange} refreshedAt={refreshedAt} onRefresh={refresh} />
      </div>

      {table.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{(table.error as Error).message}</AlertDescription>
        </Alert>
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : notFound ? (
        <Alert variant="destructive">
          <AlertTitle>用户不存在</AlertTitle>
          <AlertDescription>
            <Link to="/users" className="underline underline-offset-4">
              返回用户列表
            </Link>
          </AlertDescription>
        </Alert>
      ) : row ? (
        <UserDetailContent row={row} range={rangeQuery} />
      ) : null}
    </div>
  );
}
