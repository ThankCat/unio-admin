import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getApiKeysOpsTable, type ProjectOpsRow } from "@/lib/api/customerOps";
import { formatCompact, formatUSD } from "@/lib/format";
import { ConfigurableDataTable } from "@/components/data-table";
import {
  PROJECT_OPS_KEY_COLUMN_LABELS,
  projectOpsKeyColumns,
} from "@/components/detail-tables/customer-detail-columns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-heading mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/** 项目运维详情正文（子页面用）。 */
export function ProjectDetailContent({
  project,
  range,
}: {
  project: ProjectOpsRow;
  range: { from?: string; to?: string; range?: string };
}) {
  const keys = useQuery({
    queryKey: ["project", project.id, "ops-keys", range],
    queryFn: () => getApiKeysOpsTable(project.id, range),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading truncate text-lg font-semibold tracking-tight">
            {project.name}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {project.user_email} · 默认线路 {project.default_route_name || "由 Key 决定"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to={`/projects/${project.id}/api-keys`}>管理 API Key</Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Key" value={`${project.key_enabled}/${project.key_total}`} />
        <Stat label="区间请求" value={formatCompact(project.request_total)} />
        <Stat label="区间消费" value={formatUSD(project.consumption_usd)} />
      </div>

      <div className="text-muted-foreground text-xs">本项目 API Key</div>
      {keys.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : keys.data && keys.data.length > 0 ? (
        <ConfigurableDataTable
          storageKey={`project:${project.id}:keys`}
          data={keys.data}
          columns={projectOpsKeyColumns()}
          columnLabels={PROJECT_OPS_KEY_COLUMN_LABELS}
          layoutMode="content"
          bordered={false}
          getRowId={(row) => String(row.id)}
        />
      ) : (
        <p className="text-muted-foreground py-6 text-center text-sm">无 API Key</p>
      )}
    </div>
  );
}
