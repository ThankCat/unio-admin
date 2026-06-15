import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, RouteIcon, Trash2Icon } from "lucide-react";
import {
  createRoute,
  deleteRoute,
  listRoutes,
  updateRoute,
  type Route,
} from "@/lib/api/routes";
import { listChannels } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MODE_LABEL: Record<string, string> = {
  cheapest: "经济（售价最低）",
  stable: "稳定（健康优先）",
  fixed: "固定（锁定单渠道）",
};

const POOL_LABEL: Record<string, string> = {
  all: "全量动态",
  explicit: "手挑渠道",
};

export function RoutesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);

  const routesQuery = useQuery({ queryKey: ["routes"], queryFn: listRoutes });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRoute(id),
    onSuccess: () => {
      toast.success("已删除线路");
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const routes = routesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">线路</h1>
          <p className="text-muted-foreground text-sm">
            线路是面向客户的渠道商品：决定候选池 + 选路策略。内置「经济/稳定」零配置只读；
            自定义线路可手挑渠道（fixed 锁定单条）。API Key / 项目可绑定线路。
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          新建线路
        </Button>
      </div>

      {routesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{routesQuery.error.message}</AlertDescription>
        </Alert>
      ) : routesQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {routes.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RouteIcon className="size-4" />
                  {r.name}
                  {r.is_builtin && <Badge variant="secondary">内置</Badge>}
                  <Badge variant={r.status === "enabled" ? "default" : "outline"}>
                    {r.status === "enabled" ? "启用" : "停用"}
                  </Badge>
                </CardTitle>
                <CardDescription>{r.description || "—"}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  <div>策略：{MODE_LABEL[r.mode] ?? r.mode}</div>
                  <div>
                    候选池：{POOL_LABEL[r.pool_kind] ?? r.pool_kind}
                    {r.pool_kind === "explicit" &&
                      ` · ${r.channels.length} 个渠道`}
                  </div>
                </div>
                {!r.is_builtin && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="编辑"
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm(`确认删除线路「${r.name}」？`)) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RouteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        route={editing}
        onSaved={() => {
          setFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["routes"] });
        }}
      />
    </div>
  );
}

function RouteFormDialog({
  open,
  onOpenChange,
  route,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <RouteForm route={route} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RouteForm({
  route,
  onCancel,
  onSaved,
}: {
  route: Route | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(route?.name ?? "");
  const [mode, setMode] = useState(route?.mode ?? "cheapest");
  const [poolKind, setPoolKind] = useState(route?.pool_kind ?? "all");
  const [status, setStatus] = useState(route?.status ?? "enabled");
  const [description, setDescription] = useState(route?.description ?? "");
  const [channelIds, setChannelIds] = useState<number[]>(
    route?.channels.map((c) => c.channel_id) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // fixed 模式强制 explicit 池；切到 fixed 时联动。
  const effectivePool = mode === "fixed" ? "explicit" : poolKind;

  const channelsQuery = useQuery({
    queryKey: ["channels", "all-for-route"],
    queryFn: () => listChannels({ page: 1, pageSize: 100 }),
    enabled: effectivePool === "explicit",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        mode,
        pool_kind: effectivePool,
        status,
        description: description.trim() || null,
        channel_ids: effectivePool === "all" ? [] : channelIds,
      };
      return route ? updateRoute({ id: route.id, ...body }) : createRoute(body);
    },
    onSuccess: () => {
      toast.success(route ? "已更新线路" : "已创建线路");
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (name.trim() === "") next.name = "线路名不能为空";
    if (effectivePool === "explicit") {
      if (mode === "fixed" && channelIds.length !== 1) {
        next.channels = "固定线路必须恰好选择一条渠道";
      } else if (channelIds.length === 0) {
        next.channels = "手挑渠道线路至少选择一条渠道";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  function toggleChannel(id: number) {
    setChannelIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const orderedChannels = useMemo(() => {
    const list = channelsQuery.data?.items ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [channelsQuery.data]);

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{route ? "编辑线路" : "新建线路"}</DialogTitle>
        <DialogDescription>
          选择选路策略与候选池。fixed 策略锁定单条渠道（自动使用手挑池）。
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="rt_name">线路名</FieldLabel>
            <Input
              id="rt_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：C-专线"
              aria-invalid={!!errors.name}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="rt_status">状态</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="rt_status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">启用</SelectItem>
                <SelectItem value="disabled">停用</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="rt_mode">选路策略</FieldLabel>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="rt_mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheapest">经济（售价最低）</SelectItem>
                <SelectItem value="stable">稳定（健康优先）</SelectItem>
                <SelectItem value="fixed">固定（锁定单渠道）</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="rt_pool">候选池</FieldLabel>
            <Select
              value={effectivePool}
              onValueChange={setPoolKind}
              disabled={mode === "fixed"}
            >
              <SelectTrigger id="rt_pool" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全量动态</SelectItem>
                <SelectItem value="explicit">手挑渠道</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              {mode === "fixed" ? "固定策略固定为手挑池" : "全量=该模型所有可用渠道"}
            </FieldDescription>
          </Field>
        </div>

        {effectivePool === "explicit" && (
          <Field data-invalid={!!errors.channels}>
            <FieldLabel>渠道池</FieldLabel>
            <FieldDescription>
              {mode === "fixed"
                ? "固定线路：恰好选择一条渠道"
                : "手挑线路：至少选择一条渠道"}
            </FieldDescription>
            {channelsQuery.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {orderedChannels.length === 0 ? (
                  <p className="text-muted-foreground p-2 text-sm">暂无渠道</p>
                ) : (
                  orderedChannels.map((c) => (
                    <label
                      key={c.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={channelIds.includes(c.id)}
                        onChange={() => toggleChannel(c.id)}
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {c.provider_name} · {c.protocol}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            <FieldError>{errors.channels}</FieldError>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="rt_desc">简介（可选）</FieldLabel>
          <Input
            id="rt_desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="展示给客户的商品说明"
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {route ? "保存" : "创建"}
        </Button>
      </DialogFooter>
    </form>
  );
}
