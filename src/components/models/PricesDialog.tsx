import { useState, type FormEvent, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckIcon, PlusIcon } from "lucide-react";
import {
  createPrice,
  listPrices,
  updatePrice,
  type Price,
} from "@/lib/api/prices";
import { type Model } from "@/lib/api/models";
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
  DialogTrigger,
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

// children-trigger 弹窗：与 ModelFormDialog 一致，自管 open 状态，便于嵌进操作列。
export function PricesDialog({
  model,
  children,
}: {
  model: Model;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        {open && <PriceManager model={model} />}
      </DialogContent>
    </Dialog>
  );
}

function PriceManager({ model }: { model: Model }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"list" | "create">("list");
  const pricesKey = ["prices", model.id];

  const pricesQuery = useQuery({
    queryKey: pricesKey,
    queryFn: () => listPrices(model.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: pricesKey });

  const prices = pricesQuery.data ?? [];

  if (mode === "create") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>新建售价</DialogTitle>
          <DialogDescription>
            为「{model.display_name}」配置客户侧售价；金额按每百万 token 计,
            同一币种的启用窗口不可重叠。
          </DialogDescription>
        </DialogHeader>
        <PriceForm
          modelId={model.id}
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
        <DialogTitle>售价</DialogTitle>
        <DialogDescription>
          「{model.display_name}」的客户侧售价（含历史与停用）。价格不可删,改价请新建一条并关闭旧窗口。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div>
          <Button size="sm" onClick={() => setMode("create")}>
            <PlusIcon data-icon="inline-start" />
            新建售价
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
            还没有配置售价
          </p>
        ) : (
          <ul className="divide-border max-h-[60vh] divide-y overflow-y-auto rounded-md border">
            {prices.map((p) => (
              <PriceRow key={p.id} price={p} onChanged={invalidate} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface FieldErrors {
  currency?: string;
  uncached_input_price?: string;
  output_price?: string;
  cache_read_input_price?: string;
  cache_write_5m_input_price?: string;
  cache_write_1h_input_price?: string;
  reasoning_output_price?: string;
  effective_from?: string;
  effective_to?: string;
}

function PriceForm({
  modelId,
  onCancel,
  onCreated,
}: {
  modelId: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
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
      createPrice({
        modelId,
        currency: currency.trim(),
        pricing_unit: "per_1m_tokens",
        uncached_input_price: uncached.trim(),
        output_price: output.trim(),
        cache_read_input_price: optionalMoney(cacheRead),
        cache_write_5m_input_price: optionalMoney(cacheWrite5m),
        cache_write_1h_input_price: optionalMoney(cacheWrite1h),
        reasoning_output_price: optionalMoney(reasoning),
        status,
        effective_from: localToRFC3339(effectiveFrom),
        effective_to: effectiveTo.trim() ? localToRFC3339(effectiveTo) : null,
      }),
    onSuccess: () => {
      toast.success("已新增售价");
      onCreated();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function validate(): boolean {
    const next: FieldErrors = {};
    if (currency.trim() === "") next.currency = "币种不能为空";
    if (!MONEY_PATTERN.test(uncached.trim()))
      next.uncached_input_price = "需为非负小数";
    if (!MONEY_PATTERN.test(output.trim())) next.output_price = "需为非负小数";
    for (const [val, key] of [
      [cacheRead, "cache_read_input_price"],
      [cacheWrite5m, "cache_write_5m_input_price"],
      [cacheWrite1h, "cache_write_1h_input_price"],
      [reasoning, "reasoning_output_price"],
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
        <Field data-invalid={!!errors.currency} className="max-w-xs">
          <FieldLabel htmlFor="pr_currency">币种</FieldLabel>
          <Input
            id="pr_currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            aria-invalid={!!errors.currency}
          />
          <FieldDescription>计价单位:每百万 token</FieldDescription>
          <FieldError>{errors.currency}</FieldError>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <MoneyField
            id="pr_uncached"
            label="未缓存输入"
            value={uncached}
            onChange={setUncached}
            error={errors.uncached_input_price}
          />
          <MoneyField
            id="pr_output"
            label="输出"
            value={output}
            onChange={setOutput}
            error={errors.output_price}
          />
          <MoneyField
            id="pr_cache_read"
            label="缓存读取输入（可选）"
            value={cacheRead}
            onChange={setCacheRead}
            error={errors.cache_read_input_price}
          />
          <MoneyField
            id="pr_reasoning"
            label="reasoning 输出（可选）"
            value={reasoning}
            onChange={setReasoning}
            error={errors.reasoning_output_price}
          />
          <MoneyField
            id="pr_cache_5m"
            label="5 分钟缓存写入（可选）"
            value={cacheWrite5m}
            onChange={setCacheWrite5m}
            error={errors.cache_write_5m_input_price}
          />
          <MoneyField
            id="pr_cache_1h"
            label="1 小时缓存写入（可选）"
            value={cacheWrite1h}
            onChange={setCacheWrite1h}
            error={errors.cache_write_1h_input_price}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.effective_from}>
            <FieldLabel htmlFor="pr_from">生效开始</FieldLabel>
            <Input
              id="pr_from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              aria-invalid={!!errors.effective_from}
            />
            <FieldError>{errors.effective_from}</FieldError>
          </Field>

          <Field data-invalid={!!errors.effective_to}>
            <FieldLabel htmlFor="pr_to">生效结束（可选）</FieldLabel>
            <Input
              id="pr_to"
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
          <FieldLabel htmlFor="pr_status">状态</FieldLabel>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="pr_status" className="w-full">
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

function PriceRow({
  price,
  onChanged,
}: {
  price: Price;
  onChanged: () => void;
}) {
  const [draftTo, setDraftTo] = useState(rfc3339ToLocal(price.effective_to));

  const mutation = useMutation({
    mutationFn: (vars: { status: string; effective_to: string | null }) =>
      updatePrice({
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
        <div className="font-medium">
          {price.currency} · 输入 {trimDecimal(price.uncached_input_price)} · 输出{" "}
          {trimDecimal(price.output_price)}
        </div>
        <div className="text-muted-foreground text-xs">
          {price.cache_read_input_price != null &&
            `缓存读 ${trimDecimal(price.cache_read_input_price)} · `}
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
          aria-label={`切换售价 ${price.id} 状态`}
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
