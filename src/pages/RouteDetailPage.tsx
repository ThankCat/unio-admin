import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { getRoutesOpsTable } from "@/lib/api/routesOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { RouteDetailContent } from "@/components/routes/RouteDetailContent";
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

export function RouteDetailPage() {
  const { routeId: routeIdParam } = useParams();
  const routeId = Number(routeIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const rangeQuery = { ...params, range: value.preset };

  if (!Number.isFinite(routeId) || routeId <= 0) {
    return <Navigate to="/routes" replace />;
  }

  const table = useQuery({
    queryKey: ["routes", "ops-table", "all", rangeQuery],
    queryFn: () => getRoutesOpsTable({ ...rangeQuery, page: 1, page_size: 500 }),
    placeholderData: keepPreviousData,
  });

  const row = useMemo(
    () => table.data?.items.find((r) => r.id === routeId) ?? null,
    [table.data, routeId],
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
                <Link to="/routes">线路</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{row?.name ?? "详情"}</BreadcrumbPage>
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
          <AlertTitle>线路不存在</AlertTitle>
          <AlertDescription>
            <Link to="/routes" className="underline underline-offset-4">
              返回线路列表
            </Link>
          </AlertDescription>
        </Alert>
      ) : row ? (
        <RouteDetailContent row={row} range={rangeQuery} />
      ) : null}
    </div>
  );
}
