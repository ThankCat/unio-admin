import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { getProjectsOpsTable } from "@/lib/api/customerOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { ProjectDetailContent } from "@/components/customer/ProjectDetailContent";
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

export function ProjectDetailPage() {
  const { projectId: projectIdParam } = useParams();
  const projectId = Number(projectIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const rangeQuery = { ...params, range: value.preset };

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return <Navigate to="/projects" replace />;
  }

  const table = useQuery({
    queryKey: ["projects", "ops-table", "all", rangeQuery],
    queryFn: () => getProjectsOpsTable({ ...rangeQuery, page: 1, page_size: 500 }),
    placeholderData: keepPreviousData,
  });

  const row = useMemo(
    () => table.data?.items.find((p) => p.id === projectId) ?? null,
    [table.data, projectId],
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
                <Link to="/projects">项目</Link>
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
          <AlertTitle>项目不存在</AlertTitle>
          <AlertDescription>
            <Link to="/projects" className="underline underline-offset-4">
              返回项目列表
            </Link>
          </AlertDescription>
        </Alert>
      ) : row ? (
        <ProjectDetailContent project={row} range={rangeQuery} />
      ) : null}
    </div>
  );
}
