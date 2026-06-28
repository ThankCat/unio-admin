import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { getModel } from "@/lib/api/models";
import { getModelOpsDetail, getModelsOpsTable } from "@/lib/api/modelsOps";
import { useRangeQuery } from "@/hooks/useRangeQuery";
import { RangeFilter } from "@/components/common/RangeFilter";
import { DetailPageHeader } from "@/components/common/DetailPageHeader";
import { ModelDetailContent } from "@/components/models/ModelDetailContent";
import {
  ModelOverviewStats,
  ModelOverviewStatsSkeleton,
} from "@/components/models/ModelOverviewStats";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ModelDetailPage() {
  const { modelId: modelIdParam } = useParams();
  const modelId = Number(modelIdParam);
  const { value, setRange, params, refresh, refreshedAt } = useRangeQuery("24h");
  const rangeQuery = { ...params, range: value.preset };

  if (!Number.isFinite(modelId) || modelId <= 0) {
    return <Navigate to="/models" replace />;
  }

  const modelQ = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel(modelId),
  });

  const opsDetail = useQuery({
    queryKey: ["model", modelId, "ops-detail", rangeQuery],
    queryFn: () => getModelOpsDetail(modelId, rangeQuery),
    placeholderData: keepPreviousData,
    enabled: modelQ.isSuccess,
  });

  const opsRow = useQuery({
    queryKey: ["models", "ops-table", "row", modelId, rangeQuery],
    queryFn: async () => {
      const page = await getModelsOpsTable({ ...rangeQuery, page: 1, page_size: 500 });
      return page.items.find((m) => m.id === modelId) ?? null;
    },
    placeholderData: keepPreviousData,
    enabled: modelQ.isSuccess,
  });

  const model = modelQ.data ?? null;
  const entityLoading = modelQ.isPending;
  const notFound = modelQ.isSuccess && model == null;

  const overviewSummary = useMemo(() => {
    if (opsDetail.isPending && !opsDetail.data) {
      return <ModelOverviewStatsSkeleton />;
    }
    if (!opsDetail.data) return null;
    return (
      <ModelOverviewStats
        detail={opsDetail.data}
        revenueUsd={opsRow.data?.revenue_usd}
        marginUsd={opsRow.data?.margin_usd}
        marginRate={opsRow.data?.margin_rate}
      />
    );
  }, [opsDetail.data, opsDetail.isPending, opsRow.data]);

  return (
    <div className="flex flex-col gap-5">
      <DetailPageHeader
        back={{ href: "/models", label: "返回模型列表" }}
        title={model?.model_id ?? "详情"}
        titleLoading={entityLoading}
        badge={
          model ? (
            <>
              <Badge variant={model.status === "enabled" ? "default" : "outline"}>
                {model.status === "enabled" ? "启用" : "停用"}
              </Badge>
              {opsRow.data?.sellable ? (
                <Badge variant="default">可售</Badge>
              ) : opsRow.data ? (
                <Badge variant="destructive">不可售</Badge>
              ) : null}
            </>
          ) : null
        }
        actions={
          <RangeFilter
            value={value}
            onChange={setRange}
            refreshedAt={refreshedAt}
            onRefresh={refresh}
          />
        }
        summary={model ? overviewSummary : null}
      />

      {modelQ.isError || opsDetail.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            {((modelQ.error ?? opsDetail.error) as Error).message}
          </AlertDescription>
        </Alert>
      ) : notFound ? (
        <Alert variant="destructive">
          <AlertTitle>模型不存在</AlertTitle>
          <AlertDescription>
            <Link to="/models" className="underline underline-offset-4">
              返回模型列表
            </Link>
          </AlertDescription>
        </Alert>
      ) : model ? (
        <ModelDetailContent modelId={model.id} range={rangeQuery} />
      ) : null}
    </div>
  );
}
