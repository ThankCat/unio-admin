import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlayIcon, RefreshCwIcon, FlaskConicalIcon } from "lucide-react";
import {
  getEnforcement,
  getObserveSummary,
  listAdapterProfiles,
  listSyncJobs,
  materializeAdapterSeed,
  triggerSync,
  type SyncResult,
  type SyncJob,
} from "@/lib/api/capability";
import { listAllModels, type Model } from "@/lib/api/models";
import { apiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupportLevelBadge } from "@/components/capability/shared";
import { formatLimits } from "@/lib/capability/limits";

export function CapabilityPage() {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>能力中心</CardTitle>
        <CardDescription>
          models.dev 同步、adapter 画像物化与 capability 闸门 enforce 状态
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sync">
          <TabsList>
            <TabsTrigger value="sync">同步</TabsTrigger>
            <TabsTrigger value="adapter">Adapter 画像</TabsTrigger>
            <TabsTrigger value="enforce">Enforce 状态</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="pt-4">
            <SyncTab />
          </TabsContent>
          <TabsContent value="adapter" className="pt-4">
            <AdapterTab />
          </TabsContent>
          <TabsContent value="enforce" className="pt-4">
            <EnforceTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SyncTab() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SyncResult | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["capability-sync-jobs"],
    queryFn: () => listSyncJobs(20),
  });

  const mutation = useMutation({
    mutationFn: (dryRun: boolean) => triggerSync(dryRun),
    onSuccess: (res) => {
      setResult(res);
      toast.success(res.dry_run ? "预演完成" : "同步完成");
      if (!res.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["capability-sync-jobs"] });
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => mutation.mutate(true)}
        >
          {busy ? <Spinner data-icon="inline-start" /> : <FlaskConicalIcon data-icon="inline-start" />}
          预演（dry-run）
        </Button>
        <Button size="sm" disabled={busy} onClick={() => mutation.mutate(false)}>
          {busy ? <Spinner data-icon="inline-start" /> : <PlayIcon data-icon="inline-start" />}
          执行同步
        </Button>
        <p className="text-muted-foreground text-xs">
          同步只在新模型首次落库时写粗能力；既有模型能力靠手工覆盖维护。
        </p>
      </div>

      {result && <SyncResultCard result={result} />}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">最近同步任务</h3>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="刷新"
            onClick={() => jobsQuery.refetch()}
          >
            <RefreshCwIcon />
          </Button>
        </div>
        {jobsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{jobsQuery.error.message}</AlertDescription>
          </Alert>
        ) : jobsQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (jobsQuery.data ?? []).length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            还没有同步任务
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>结束时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobsQuery.data ?? []).map((job) => (
                <SyncJobRow key={job.id} job={job} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SyncResultCard({ result }: { result: SyncResult }) {
  return (
    <Alert>
      <AlertTitle className="flex items-center gap-2">
        {result.dry_run ? (
          <Badge variant="secondary">预演</Badge>
        ) : (
          <Badge variant="default">已应用</Badge>
        )}
        同步结果
      </AlertTitle>
      <AlertDescription>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <Stat label="feed 模型" value={result.feed_models} />
          <Stat label="写入目录" value={result.upserted} />
          <Stat label="下架" value={result.removed} />
          <Stat label="能力提示" value={result.capability_hints} />
        </div>
        {result.removed_canonical_ids.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            上游下架：{result.removed_canonical_ids.join(", ")}
          </p>
        )}
        {result.fingerprint && (
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            指纹 {result.fingerprint.slice(0, 16)}…
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function SyncJobRow({ job }: { job: SyncJob }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground tabular-nums">
        {job.id}
      </TableCell>
      <TableCell>{job.source}</TableCell>
      <TableCell>
        <JobStatusBadge status={job.status} />
        {job.error_text && (
          <div className="text-destructive mt-1 max-w-xs truncate text-xs">
            {job.error_text}
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatDateTime(job.created_at)}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {job.finished_at ? formatDateTime(job.finished_at) : "—"}
      </TableCell>
    </TableRow>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  if (status === "succeeded") return <Badge variant="default">成功</Badge>;
  if (status === "running") return <Badge variant="secondary">运行中</Badge>;
  if (status === "failed") return <Badge variant="destructive">失败</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function AdapterTab() {
  const [modelId, setModelId] = useState<string>("");

  const profilesQuery = useQuery({
    queryKey: ["adapter-profiles"],
    queryFn: listAdapterProfiles,
  });

  const modelsQuery = useQuery({
    queryKey: ["all-models-enabled"],
    queryFn: () => listAllModels("enabled"),
  });

  const mutation = useMutation({
    mutationFn: (profileKey: string) =>
      materializeAdapterSeed(Number(modelId), profileKey),
    onSuccess: (res) =>
      toast.success(`已物化 ${res.materialized} 条能力到模型 #${res.model_id}`),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const models: Model[] = modelsQuery.data ?? [];
  const canMaterialize = modelId !== "" && !mutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <label className="text-muted-foreground mb-1 block text-xs">
            物化目标模型
          </label>
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.display_name}（{m.model_id}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground text-xs">
          物化会以 adapter_seed 幂等覆盖目标模型同 key 的既有声明。
        </p>
      </div>

      {profilesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{profilesQuery.error.message}</AlertDescription>
        </Alert>
      ) : profilesQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (profilesQuery.data ?? []).length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          没有可用的 adapter 画像
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {(profilesQuery.data ?? []).map((profile) => (
            <div key={profile.key} className="rounded-md border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-sm font-medium">
                    {profile.key}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {profile.declarations.length} 条能力声明
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!canMaterialize}
                  onClick={() => mutation.mutate(profile.key)}
                >
                  {mutation.isPending && <Spinner data-icon="inline-start" />}
                  物化到所选模型
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.declarations.map((d) => (
                  <span
                    key={d.capability_key}
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
                  >
                    <span className="font-mono">{d.capability_key}</span>
                    <SupportLevelBadge level={d.support_level} />
                    {d.limits != null && (
                      <span className="text-muted-foreground font-mono">
                        {formatLimits(d.limits)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnforceTab() {
  const enforcementQuery = useQuery({
    queryKey: ["capability-enforcement"],
    queryFn: getEnforcement,
  });

  const summaryQuery = useQuery({
    queryKey: ["capability-observe-summary"],
    queryFn: () => getObserveSummary(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">各表面 enforce 现状</h3>
        {enforcementQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{enforcementQuery.error.message}</AlertDescription>
          </Alert>
        ) : enforcementQuery.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>表面</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>env 开关</TableHead>
                  <TableHead>模式</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enforcementQuery.data?.surfaces.map((s) => (
                  <TableRow key={s.surface}>
                    <TableCell className="font-medium">{s.surface}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.operation}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.env_var}
                    </TableCell>
                    <TableCell>
                      {s.mode === "enforce" ? (
                        <Badge variant="destructive">enforce</Badge>
                      ) : (
                        <Badge variant="secondary">observe</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-muted-foreground mt-2 text-xs">
              {enforcementQuery.data?.note}
            </p>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">observe 期判定分布</h3>
        {summaryQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{summaryQuery.error.message}</AlertDescription>
          </Alert>
        ) : summaryQuery.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (summaryQuery.data?.results ?? []).length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            暂无请求判定数据
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>判定结论</TableHead>
                <TableHead className="text-right">请求数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summaryQuery.data?.results ?? []).map((r, i) => (
                <TableRow key={r.result ?? `null-${i}`}>
                  <TableCell className="font-mono text-sm">
                    {r.result ?? "bypassed（未判定）"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
