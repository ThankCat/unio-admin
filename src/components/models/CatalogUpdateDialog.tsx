import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Model } from "@/lib/api/models";
import {
  getCatalogEntry,
  refreshFromCatalog,
  setCatalogReminder,
  type ReminderAction,
} from "@/lib/api/modelCatalog";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

// 展示「当前快照 vs 目录最新」的差异并提供四个动作（阶段 14 追更）。
export function CatalogUpdateDialog({
  model,
  children,
}: {
  model: Model;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const canonicalID = model.catalog?.canonical_id ?? "";

  const entryQuery = useQuery({
    queryKey: ["model-catalog-entry", canonicalID],
    queryFn: () => getCatalogEntry(canonicalID),
    enabled: open && canonicalID !== "",
  });

  function done(message: string) {
    queryClient.invalidateQueries({ queryKey: ["models"] });
    toast.success(message);
    setOpen(false);
  }

  const refresh = useMutation({
    mutationFn: () => refreshFromCatalog(model.id),
    onSuccess: () => done("已从目录刷新本模型"),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const reminder = useMutation({
    mutationFn: ({ action, snooze }: { action: ReminderAction; snooze?: string }) =>
      setCatalogReminder(model.id, action, snooze),
    onSuccess: (_data, vars) =>
      done(
        vars.action === "dismiss"
          ? "已忽略本次更新"
          : vars.action === "mute"
            ? "已永久忽略该模型的更新"
            : "已设置稍后提醒",
      ),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const entry = entryQuery.data;
  const rows: { label: string; current: string; latest: string }[] = entry
    ? [
        { label: "展示名", current: fmt(model.display_name), latest: fmt(entry.display_name) },
        { label: "归属方", current: fmt(model.owned_by), latest: fmt(entry.lab) },
        {
          label: "上下文长度",
          current: fmt(model.context_window_tokens),
          latest: fmt(entry.context_window_tokens),
        },
        {
          label: "最大输出",
          current: fmt(model.max_output_tokens),
          latest: fmt(entry.max_output_tokens),
        },
        {
          label: "输入价格基线",
          current: fmt(model.input_price_usd_per_million_tokens),
          latest: fmt(entry.input_price_usd_per_million_tokens),
        },
        {
          label: "输出价格基线",
          current: fmt(model.output_price_usd_per_million_tokens),
          latest: fmt(entry.output_price_usd_per_million_tokens),
        },
        { label: "发布日期", current: fmt(model.release_date), latest: fmt(entry.release_date) },
        {
          label: "能力提示数",
          current: "—",
          latest: fmt(entry.capability_count),
        },
      ]
    : [];

  const busy = refresh.isPending || reminder.isPending;

  function snoozeOneWeek() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    reminder.mutate({ action: "snooze", snooze: d.toISOString() });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>目录更新</DialogTitle>
          <DialogDescription>
            {model.catalog?.removed_upstream
              ? "该模型对应的 models.dev 目录条目已下架。"
              : "models.dev 目录中该条目已变化，可从目录刷新本模型（覆盖元数据与能力，model_id 不变）。"}
          </DialogDescription>
        </DialogHeader>

        {entryQuery.isPending ? (
          <div className="text-muted-foreground py-6 text-center text-sm">
            <Spinner data-icon="inline-start" />
            加载目录差异...
          </div>
        ) : entryQuery.isError ? (
          <p className="text-destructive py-6 text-center text-sm">
            {apiErrorMessage(entryQuery.error)}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>字段</TableHead>
                <TableHead>当前快照</TableHead>
                <TableHead>目录最新</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const changed = r.current !== r.latest && r.label !== "能力提示数";
                return (
                  <TableRow key={r.label} data-changed={changed}>
                    <TableCell className="text-muted-foreground">{r.label}</TableCell>
                    <TableCell className={changed ? "line-through opacity-60" : undefined}>
                      {r.current}
                    </TableCell>
                    <TableCell className={changed ? "font-medium" : undefined}>
                      {r.latest}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => reminder.mutate({ action: "dismiss" })}
            >
              忽略本次更新
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => reminder.mutate({ action: "mute" })}
            >
              永久忽略
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={snoozeOneWeek}>
              7 天后提醒
            </Button>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                关闭
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={busy || model.catalog?.removed_upstream}
              onClick={() => refresh.mutate()}
            >
              {refresh.isPending && <Spinner data-icon="inline-start" />}
              从目录刷新
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
