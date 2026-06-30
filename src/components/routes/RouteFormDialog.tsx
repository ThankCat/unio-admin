import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRoute, updateRoute, type Route } from "@/lib/api/routes";
import { listChannels } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import { StatusChangeConfirmDialog } from "@/components/common/StatusChangeConfirmDialog";
import { HintLabel } from "@/components/common/field-hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
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
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RouteFormDialog({
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
  const [priceRatio, setPriceRatio] = useState(route?.price_ratio ?? "1");
  const [description, setDescription] = useState(route?.description ?? "");
  const [channelIds, setChannelIds] = useState<number[]>(
    route?.channels.map((c) => c.channel_id) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

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
        price_ratio: priceRatio.trim() || "1",
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
    const ratio = priceRatio.trim();
    if (ratio !== "" && (!/^\d+(\.\d+)?$/.test(ratio) || Number(ratio) < 0)) {
      next.price_ratio = "需为 ≥ 0 的倍率（如 1、1.5、0.8）";
    }
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
    if (route && status !== route.status) {
      setStatusConfirmOpen(true);
      return;
    }
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
    <>
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
            <HintLabel
              htmlFor="rt_name"
              hint="线路名称，仅用于后台识别；线路即分组，供 API Key 选用。"
            >
              线路名
            </HintLabel>
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
            <HintLabel htmlFor="rt_status" hint="停用后该线路不可被 API Key 选用。">
              状态
            </HintLabel>
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
            <HintLabel
              htmlFor="rt_mode"
              hint="在候选渠道中如何选路：经济=售价最低，稳定=健康优先，固定=锁定单条渠道。"
            >
              选路策略
            </HintLabel>
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
            <HintLabel
              htmlFor="rt_pool"
              hint="候选渠道范围：全量=该模型所有可用渠道；手挑=仅指定渠道。固定策略固定为手挑池。"
            >
              候选池
            </HintLabel>
            <Select value={effectivePool} onValueChange={setPoolKind} disabled={mode === "fixed"}>
              <SelectTrigger id="rt_pool" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全量动态</SelectItem>
                <SelectItem value="explicit">手挑渠道</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field data-invalid={!!errors.price_ratio}>
          <HintLabel
            htmlFor="rt_ratio"
            hint="客户售价 = 模型基准价 × 倍率（1=原价，1.5=加价 50%，0.8=8 折）。"
          >
            售价倍率
          </HintLabel>
          <Input
            id="rt_ratio"
            value={priceRatio}
            onChange={(e) => setPriceRatio(e.target.value)}
            placeholder="1.0"
            inputMode="decimal"
            aria-invalid={!!errors.price_ratio}
          />
          <FieldError>{errors.price_ratio}</FieldError>
        </Field>

        {effectivePool === "explicit" && (
          <Field data-invalid={!!errors.channels}>
            <HintLabel hint="手动指定本线路的候选渠道；手挑线路至少选一条，固定线路恰好选一条。">
              渠道池
            </HintLabel>
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
          <HintLabel htmlFor="rt_desc" hint="展示给客户的商品说明；可选。">
            简介（可选）
          </HintLabel>
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
    {route ? (
      <StatusChangeConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        entityLabel="线路"
        entityName={name.trim() || route.name}
        enabling={status === "enabled"}
        pending={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    ) : null}
    </>
  );
}
