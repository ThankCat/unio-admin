import { useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckIcon, PlusIcon } from "lucide-react";
import {
  createCostPrice,
  listCostPrices,
  updateCostPrice,
  type CostPrice,
} from "@/lib/api/costPrices";
import { listChannelModels } from "@/lib/api/channelModels";
import { type Channel } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import {
  formatDateTime,
  localToRFC3339,
  rfc3339ToLocal,
  trimDecimal,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const MONEY_PATTERN = /^\d+(\.\d+)?$/;

export function CostPricesDialog({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {open && <CostPriceManager channel={channel} />}
      </DialogContent>
    </Dialog>
  );
}

function CostPriceManager({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"list" | "create">("list");
  const pricesKey = ["cost-prices", channel.id];

  const pricesQuery = useQuery({
    queryKey: pricesKey,
    queryFn: () => listCostPrices(channel.id),
  });

  const bindingsQuery = useQuery({
    queryKey: ["channel-models", channel.id],
    queryFn: () => listChannelModels(channel.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: pricesKey });

  const prices = pricesQuery.data ?? [];

  if (mode === "create") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>新建成本价</DialogTitle>
          <DialogDescription>
            为「{channel.name}」的某个已绑定模型配置上游成本价；金额按每百万 token 计，
            同一模型的启用窗口不可重叠。
          </DialogDescription>
        </DialogHeader>
        <CostPriceForm
          channelId={channel.id}
          bindings={bindingsQuery.data ?? []}
          bindingsLoading={bindingsQuery.isPending}
          onCancel={() => setMode("list")}
          onCreated={() => {
            invalidate();
            setMode("list");
          }}
        />
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>成本价</DialogTitle>
        <DialogDescription>
          「{channel.name}」各模型的上游成本价（含历史与停用）。价格不可删,改价请新建一条并关闭旧窗口。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div>
          <Button size="sm" onClick={() => setMode("create")}>
            <PlusIcon data-icon="inline-start" />
            新建成本价
          </Button>
        </div>

        {pricesQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{pricesQuery.error.message}</AlertDescription>
          </Alert>
        ) : pricesQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : prices.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            还没有配置成本价
          </p>
        ) : (
          <ul className="divide-border max-h-[60vh] divide-y overflow-y-auto rounded-md border">
            {prices.map((p) => (
              <CostPriceRow key={p.id} price={p} onChanged={invalidate} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface FieldErrors {
  model_id?: string;
  currency?: string;
  uncached_input_cost?: string;
  output_cost?: string;
  cache_read_input_cost?: string;
  cache_write_5m_input_cost?: string;
  cache_write_1h_input_cost?: string;
  reasoning_output_cost?: string;
  effective_from?: string;
  effective_to?: string;
}

function CostPriceForm({
  channelId,
  bindings,
  bindingsLoading,
  onCancel,
  onCreated,
}: {
  channelId: number;
  bindings: { model_id: number; model_external_id: string }[];
  bindingsLoading: boolean;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [modelId, setModelId] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [uncached, setUncached] = useState("");
  const [output, setOutput] = useState("");
  const [cacheRead, setCacheRead] = useState("");
  const [cacheWrite5m, setCacheWrite5m] = useState("");
  const [cacheWrite1h, setCacheWrite1h] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [status, setStatus] = useState("enabled");
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: () =>
      createCostPrice({
        channelId,
        model_id: Number(modelId),
        currency: currency.trim(),
        pricing_unit: "per_1m_tokens",
        uncached_input_cost: uncached.trim(),
        output_cost: output.trim(),
        cache_read_input_cost: optionalMoney(cacheRead),
        cache_write_5m_input_cost: optionalMoney(cacheWrite5m),
        cache_write_1h_input_cost: optionalMoney(cacheWrite1h),
        reasoning_output_cost: optionalMoney(reasoning),
        status,
        effective_from: localToRFC3339(effectiveFrom),
        effective_to: effectiveTo.trim()
          ? localToRFC3339(effectiveTo)
          : null,
      }),
    onSuccess: (created) => {
      toast.success(`已为「${created.model_external_id}」新增成本价`);
      onCreated();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!(Number(modelId) > 0)) next.model_id = "请选择模型";
    if (currency.trim() === "") next.currency = "币种不能为空";
    if (!MONEY_PATTERN.test(uncached.trim()))
      next.uncached_input_cost = "需为非负小数";
    if (!MONEY_PATTERN.test(output.trim()))
      next.output_cost = "需为非负小数";
    for (const [val, key] of [
      [cacheRead, "cache_read_input_cost"],
      [cacheWrite5m, "cache_write_5m_input_cost"],
      [cacheWrite1h, "cache_write_1h_input_cost"],
      [reasoning, "reasoning_output_cost"],
    ] as const) {
      if (val.trim() !== "" && !MONEY_PATTERN.test(val.trim())) {
        next[key] = "需为非负小数";
      }
    }
    if (effectiveFrom.trim() === "") next.effective_from = "请选择生效开始时间";
    if (
      effectiveTo.trim() !== "" &&
      effectiveFrom.trim() !== "" &&
      new Date(effectiveTo) <= new Date(effectiveFrom)
    ) {
      next.effective_to = "结束时间须晚于开始时间";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.model_id}>
            <FieldLabel htmlFor="cp_model">模型</FieldLabel>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger
                id="cp_model"
                className="w-full"
                aria-invalid={!!errors.model_id}
              >
                <SelectValue
                  placeholder={
                    bindingsLoading
                      ? "加载中…"
                      : bindings.length === 0
                        ? "请先绑定模型"
                        : "选择模型"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {bindings.map((b) => (
                  <SelectItem key={b.model_id} value={String(b.model_id)}>
                    {b.model_external_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.model_id}</FieldError>
          </Field>

          <Field data-invalid={!!errors.currency}>
            <FieldLabel htmlFor="cp_currency">币种</FieldLabel>
            <Input
              id="cp_currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
              aria-invalid={!!errors.currency}
            />
            <FieldDescription>计价单位:每百万 token</FieldDescription>
            <FieldError>{errors.currency}</FieldError>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MoneyField
            id="cp_uncached"
            label="未缓存输入"
            value={uncached}
            onChange={setUncached}
            error={errors.uncached_input_cost}
          />
          <MoneyField
            id="cp_output"
            label="输出"
            value={output}
            onChange={setOutput}
            error={errors.output_cost}
          />
          <MoneyField
            id="cp_cache_read"
            label="缓存读取输入（可选）"
            value={cacheRead}
            onChange={setCacheRead}
            error={errors.cache_read_input_cost}
          />
          <MoneyField
            id="cp_reasoning"
            label="reasoning 输出（可选）"
            value={reasoning}
            onChange={setReasoning}
            error={errors.reasoning_output_cost}
          />
          <MoneyField
            id="cp_cache_5m"
            label="5 分钟缓存写入（可选）"
            value={cacheWrite5m}
            onChange={setCacheWrite5m}
            error={errors.cache_write_5m_input_cost}
          />
          <MoneyField
            id="cp_cache_1h"
            label="1 小时缓存写入（可选）"
            value={cacheWrite1h}
            onChange={setCacheWrite1h}
            error={errors.cache_write_1h_input_cost}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.effective_from}>
            <FieldLabel htmlFor="cp_from">生效开始</FieldLabel>
            <Input
              id="cp_from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              aria-invalid={!!errors.effective_from}
            />
            <FieldError>{errors.effective_from}</FieldError>
          </Field>

          <Field data-invalid={!!errors.effective_to}>
            <FieldLabel htmlFor="cp_to">生效结束（可选）</FieldLabel>
            <Input
              id="cp_to"
              type="datetime-local"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              aria-invalid={!!errors.effective_to}
            />
            <FieldDescription>留空表示长期有效</FieldDescription>
            <FieldError>{errors.effective_to}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="cp_status">状态</FieldLabel>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="cp_status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">停用</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {mutation.isPending ? "保存中..." : "创建"}
        </Button>
      </div>
    </form>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        inputMode="decimal"
        aria-invalid={!!error}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function CostPriceRow({
  price,
  onChanged,
}: {
  price: CostPrice;
  onChanged: () => void;
}) {
  const [draftTo, setDraftTo] = useState(rfc3339ToLocal(price.effective_to));

  const mutation = useMutation({
    mutationFn: (vars: { status: string; effective_to: string | null }) =>
      updateCostPrice({
        id: price.id,
        status: vars.status,
        effective_to: vars.effective_to,
      }),
    onSuccess: () => onChanged(),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const enabled = price.status === "enabled";
  const currentTo = rfc3339ToLocal(price.effective_to);
  const dirty = draftTo !== currentTo;
  const busy = mutation.isPending;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="min-w-40 flex-1">
        <div className="font-medium">{price.model_external_id}</div>
        <div className="text-muted-foreground text-xs">
          {price.currency} · 输入 {trimDecimal(price.uncached_input_cost)} · 输出{" "}
          {trimDecimal(price.output_cost)}
          {price.cache_read_input_cost != null &&
            ` · 缓存读 ${trimDecimal(price.cache_read_input_cost)}`}
        </div>
        <div className="text-muted-foreground text-xs">
          {formatDateTime(price.effective_from)} ~{" "}
          {price.effective_to ? formatDateTime(price.effective_to) : "长期"}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Input
          type="datetime-local"
          value={draftTo}
          onChange={(e) => setDraftTo(e.target.value)}
          aria-label="生效结束时间"
          className="h-8 w-52"
        />
        {dirty && (
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="保存结束时间"
            disabled={busy}
            onClick={() =>
              mutation.mutate({
                status: price.status,
                effective_to: draftTo.trim() ? localToRFC3339(draftTo) : null,
              })
            }
          >
            <CheckIcon />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          disabled={busy}
          onCheckedChange={(next) =>
            mutation.mutate({
              status: next ? "enabled" : "disabled",
              effective_to: price.effective_to,
            })
          }
          aria-label={`切换成本价 ${price.id} 状态`}
        />
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "启用" : "停用"}
        </Badge>
      </div>
    </li>
  );
}

function optionalMoney(raw: string): string | null {
  const s = raw.trim();
  return s === "" ? null : s;
}
