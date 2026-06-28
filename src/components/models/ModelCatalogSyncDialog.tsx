import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FlaskConicalIcon } from "lucide-react";
import { triggerSync, type SyncResult } from "@/lib/api/capability";
import { apiErrorMessage } from "@/lib/api/client";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** 从 models.dev 拉取/更新参考目录（任务记录在「系统 → 同步任务」）。 */
export function ModelCatalogSyncDialog({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [executeConfirmOpen, setExecuteConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (dryRun: boolean) => triggerSync(dryRun),
    onSuccess: (res) => {
      setResult(res);
      toast.success(res.dry_run ? "预演完成" : "同步完成");
      if (!res.dry_run) {
        setExecuteConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ["model-catalog"] });
        queryClient.invalidateQueries({ queryKey: ["system-sync-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["capability-sync-jobs"] });
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>同步 models.dev</DialogTitle>
          <DialogDescription>
            拉取上游参考数据写入本页目录。审计记录见「系统 → 同步任务」；不会覆盖已有运营模型的能力声明。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => mutation.mutate(true)}
            >
              {busy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FlaskConicalIcon data-icon="inline-start" />
              )}
              预演（dry-run）
            </Button>
            <Button disabled={busy} onClick={() => setExecuteConfirmOpen(true)}>
              {busy ? <Spinner data-icon="inline-start" /> : null}
              执行同步
            </Button>
          </div>

          {result ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-muted-foreground text-xs">结果</span>
                {result.dry_run ? (
                  <Badge variant="secondary">预演</Badge>
                ) : (
                  <Badge variant="default">已应用</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="feed 模型" value={result.feed_models} />
                <StatTile label="写入目录" value={result.upserted} />
                <StatTile label="下架" value={result.removed} />
                <StatTile label="能力提示" value={result.capability_hints} />
              </div>
              {result.removed_canonical_ids.length > 0 && (
                <p className="text-muted-foreground mt-3 text-xs">
                  上游下架：{result.removed_canonical_ids.join(", ")}
                </p>
              )}
              {result.fingerprint && (
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  指纹 {result.fingerprint.slice(0, 16)}…
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              建议先预演确认变更，再执行同步。
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">关闭</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmActionDialog
      open={executeConfirmOpen}
      onOpenChange={(o) => {
        if (!o && !busy) setExecuteConfirmOpen(false);
      }}
      title="执行 models.dev 同步"
      description="确认执行同步？将拉取上游参考数据并写入本页目录，建议先预演确认变更。"
      confirmLabel="确认同步"
      destructive
      pending={busy}
      onConfirm={() => mutation.mutate(false)}
    />
    </>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
