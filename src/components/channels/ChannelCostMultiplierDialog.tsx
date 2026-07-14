import { useMemo, useState, type FormEvent } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, CheckIcon, PlusIcon } from "lucide-react";
import {
  createChannelCostMultiplier,
  findOverlappingChannelCostMultipliers,
  listChannelCostMultipliers,
  pickCurrentChannelCostMultiplier,
  updateChannelCostMultiplier,
  type ChannelCostMultiplier,
} from "@/lib/api/channelCostMultipliers";
import {
  createChannelRechargeFactor,
  findOverlappingChannelRechargeFactors,
  listChannelRechargeFactors,
  pickCurrentChannelRechargeFactor,
  updateChannelRechargeFactor,
  type ChannelRechargeFactor,
} from "@/lib/api/channelRechargeFactors";
import {
  costBaseFromModelPrice,
  listModelPrices,
  pickCurrentModelPrice,
} from "@/lib/api/modelPrices";
import {
  listChannelPrices,
  pickCurrentChannelPrice,
} from "@/lib/api/channelPrices";
import { listChannelModels, type ChannelModel } from "@/lib/api/channelModels";
import { type Channel } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import {
  deriveChannelCost,
  type ProviderCostBase,
} from "@/lib/billing/scaleProviderCost";
import { formatDateTime, localToRFC3339, rfc3339ToLocal, trimDecimal } from "@/lib/format";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { HintLabel } from "@/components/common/field-hint";
import { PriceImpactTable, type PriceImpactRow } from "@/components/pricing/PriceImpactTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-picker";
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
import { Field, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MULT_PATTERN = /^\d+(\.\d+)?$/;

export function ChannelCostMultiplierDialog({
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
      <DialogContent className="sm:max-w-4xl">
        {open && <Manager channel={channel} />}
      </DialogContent>
    </Dialog>
  );
}

// channelCostContext 汇总一个渠道算派生成本所需的全部当前事实。
interface ChannelCostContext {
  channelId: number;
  boundModels: ChannelModel[];
  currentDefault: ChannelCostMultiplier | null;
  currentRecharge: ChannelRechargeFactor | null;
  overrideByModel: Map<number, ChannelCostMultiplier>; // 逐模型价格倍率覆盖（当前生效）
  referenceByModel: Map<number, ProviderCostBase | null>; // 模型当前基准价（成本基数）
  hasAbsoluteOverride: Set<number>; // 有 channel_prices 绝对成本覆盖的模型（走覆盖不走倍率）
  loading: boolean;
}

function Manager({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "multiplier" | "recharge">("list");

  const multipliersKey = ["channel-cost-multipliers", channel.id];
  const factorsKey = ["channel-recharge-factors", channel.id];

  const multipliersQ = useQuery({
    queryKey: multipliersKey,
    queryFn: () => listChannelCostMultipliers(channel.id),
  });
  const factorsQ = useQuery({
    queryKey: factorsKey,
    queryFn: () => listChannelRechargeFactors(channel.id),
  });
  const modelsQ = useQuery({
    queryKey: ["channel-models", channel.id],
    queryFn: () => listChannelModels(channel.id),
  });
  const pricesQ = useQuery({
    queryKey: ["channel-prices", channel.id],
    queryFn: () => listChannelPrices(channel.id),
  });

  const boundModels = useMemo(
    () => (modelsQ.data ?? []).filter((m) => m.status === "enabled"),
    [modelsQ.data],
  );

  // 每个绑定模型的基准价（成本基数，DEC-031；并行拉取，缓存复用）。
  const referenceQueries = useQueries({
    queries: boundModels.map((m) => ({
      queryKey: ["model-prices", m.model_id],
      queryFn: () => listModelPrices(m.model_id),
    })),
  });

  // 直接派生（不手动 useMemo）：React Compiler 会按输入自动记忆；避免 useQueries 数组导致的手动依赖不一致。
  const multipliers = multipliersQ.data ?? [];
  const overrideByModel = new Map<number, ChannelCostMultiplier>();
  for (const m of boundModels) {
    const o = pickCurrentChannelCostMultiplier(
      multipliers.filter((x) => x.model_id === m.model_id),
      m.model_id,
    );
    if (o && o.model_id === m.model_id) overrideByModel.set(m.model_id, o);
  }
  const referenceByModel = new Map<number, ProviderCostBase | null>();
  boundModels.forEach((m, i) => {
    const prices = referenceQueries[i]?.data;
    const current = prices ? pickCurrentModelPrice(prices) : null;
    referenceByModel.set(m.model_id, current ? costBaseFromModelPrice(current) : null);
  });
  const hasAbsoluteOverride = new Set<number>();
  for (const m of boundModels) {
    if (pickCurrentChannelPrice(pricesQ.data ?? [], m.model_id)) {
      hasAbsoluteOverride.add(m.model_id);
    }
  }
  const ctx: ChannelCostContext = {
    channelId: channel.id,
    boundModels,
    currentDefault: pickCurrentChannelCostMultiplier(multipliers, null),
    currentRecharge: pickCurrentChannelRechargeFactor(factorsQ.data ?? []),
    overrideByModel,
    referenceByModel,
    hasAbsoluteOverride,
    loading:
      modelsQ.isPending ||
      pricesQ.isPending ||
      referenceQueries.some((q) => q.isPending),
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: multipliersKey });
    queryClient.invalidateQueries({ queryKey: factorsKey });
  };

  if (view === "multiplier" || view === "recharge") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>
            {view === "multiplier" ? "新建价格倍率" : "新建充值倍率"}
          </DialogTitle>
          <DialogDescription>
            {view === "multiplier"
              ? "上游成本 = 模型基准价 × 价格倍率。渠道默认对所有模型生效；也可对个别模型覆盖。改动即时预览。"
              : "充值倍率把「上游名义额度」换算成你真金白银（含汇率 + 充值优惠）。账户级、对该渠道所有模型生效。"}
          </DialogDescription>
        </DialogHeader>
        {view === "multiplier" ? (
          <MultiplierForm
            ctx={ctx}
            existing={multipliersQ.data ?? []}
            onCancel={() => setView("list")}
            onSaved={() => {
              invalidate();
              setView("list");
            }}
          />
        ) : (
          <RechargeForm
            ctx={ctx}
            existing={factorsQ.data ?? []}
            onCancel={() => setView("list")}
            onSaved={() => {
              invalidate();
              setView("list");
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>渠道-成本倍率</DialogTitle>
        <DialogDescription>
          「{channel.name}」的上游成本倍率（DEC-027）。上游改一次倍率，你只改一个数，全渠道模型同步生效。
          倍率不可改，改价请新建一条并关闭旧窗口。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {/* 当前生效摘要 + 操作 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">当前默认价格倍率</div>
            <div className="text-lg font-medium tabular-nums">
              {ctx.currentDefault ? `× ${trimDecimal(ctx.currentDefault.multiplier)}` : "未配置"}
            </div>
            {ctx.currentDefault && (
              <div className="text-muted-foreground text-xs">
                {formatDateTime(ctx.currentDefault.effective_from)} ~{" "}
                {ctx.currentDefault.effective_to
                  ? formatDateTime(ctx.currentDefault.effective_to)
                  : "长期"}
              </div>
            )}
          </div>
          <div className="rounded-md border p-3">
            <div className="text-muted-foreground text-xs">当前充值倍率</div>
            <div className="text-lg font-medium tabular-nums">
              {ctx.currentRecharge ? `× ${trimDecimal(ctx.currentRecharge.factor)}` : "1.0（未配置）"}
            </div>
            {ctx.currentRecharge && (
              <div className="text-muted-foreground text-xs">
                {formatDateTime(ctx.currentRecharge.effective_from)} ~{" "}
                {ctx.currentRecharge.effective_to
                  ? formatDateTime(ctx.currentRecharge.effective_to)
                  : "长期"}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={() => setView("multiplier")}>
            <PlusIcon data-icon="inline-start" />
            新建价格倍率
          </Button>
          <Button size="sm" variant="outline" onClick={() => setView("recharge")}>
            <PlusIcon data-icon="inline-start" />
            新建充值倍率
          </Button>
        </div>

        {/* 当前各模型真实成本一览（派生 / 覆盖 / 未定价） */}
        <section className="flex flex-col gap-1.5">
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            当前各模型上游成本
          </div>
          {ctx.loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <PriceImpactTable rows={currentRows(ctx)} emptyHint="该渠道还没有绑定模型" />
          )}
        </section>

        {/* 历史/版本：价格倍率 + 充值倍率 */}
        <VersionSection
          title="价格倍率（默认 + 逐模型覆盖）"
          query={multipliersQ}
          renderRow={(m) => (
            <MultiplierRow key={m.id} row={m} onChanged={invalidate} />
          )}
        />
        <VersionSection
          title="充值倍率"
          query={factorsQ}
          renderRow={(f) => (
            <RechargeRow key={f.id} row={f} onChanged={invalidate} />
          )}
        />
      </div>
    </>
  );
}

// currentRows 构造「当前各模型成本」预览行（old == new，仅展示现状 + 来源）。
function currentRows(ctx: ChannelCostContext): PriceImpactRow[] {
  return ctx.boundModels.map((m) => {
    const ref = ctx.referenceByModel.get(m.model_id) ?? null;
    if (ctx.hasAbsoluteOverride.has(m.model_id)) {
      return {
        key: String(m.model_id),
        name: m.model_display_name || m.model_external_id,
        source: "override",
      };
    }
    const mult =
      ctx.overrideByModel.get(m.model_id)?.multiplier ??
      ctx.currentDefault?.multiplier ??
      null;
    if (!ref || mult == null) {
      return {
        key: String(m.model_id),
        name: m.model_display_name || m.model_external_id,
        source: "unpriced",
      };
    }
    const derived = deriveChannelCost(ref, mult, ctx.currentRecharge?.factor ?? null);
    return {
      key: String(m.model_id),
      name: m.model_display_name || m.model_external_id,
      referenceInput: ref.uncached_input_cost,
      referenceOutput: ref.output_cost,
      oldInput: derived?.uncached_input ?? null,
      oldOutput: derived?.output ?? null,
      newInput: derived?.uncached_input ?? null,
      newOutput: derived?.output ?? null,
      source: "derived",
    };
  });
}

// ---- 价格倍率创建表单（默认 或 逐模型覆盖）+ 实时影响预览 + 收口确认 ----
function MultiplierForm({
  ctx,
  existing,
  onCancel,
  onSaved,
}: {
  ctx: ChannelCostContext;
  existing: ChannelCostMultiplier[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [scope, setScope] = useState<string>("default"); // "default" | modelId
  const [multiplier, setMultiplier] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ from: string; to: string | null; overlapping: ChannelCostMultiplier[] } | null>(null);

  const modelIdArg = scope === "default" ? null : Number(scope);

  const mutation = useMutation({
    mutationFn: async (vars: { from: string; to: string | null; overlapping: ChannelCostMultiplier[] }) => {
      for (const old of vars.overlapping) {
        if (new Date(old.effective_from).getTime() < new Date(vars.from).getTime()) {
          await updateChannelCostMultiplier({ id: old.id, status: old.status, effective_to: vars.from });
        } else {
          await updateChannelCostMultiplier({ id: old.id, status: "disabled", effective_to: old.effective_to });
        }
      }
      return createChannelCostMultiplier({
        channelId: ctx.channelId,
        model_id: modelIdArg,
        multiplier: multiplier.trim(),
        status: "enabled",
        effective_from: vars.from,
        effective_to: vars.to,
      });
    },
    onSuccess: () => {
      setPending(null);
      toast.success("已新建价格倍率");
      onSaved();
    },
    onError: (err) => {
      setPending(null);
      toast.error(apiErrorMessage(err));
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (multiplier.trim() === "" || !MULT_PATTERN.test(multiplier.trim())) {
      next.multiplier = "倍率需为非负小数";
    }
    if (
      effectiveTo.trim() !== "" &&
      new Date(effectiveTo) <= (effectiveFrom.trim() ? new Date(effectiveFrom) : new Date())
    ) {
      next.effective_to = effectiveFrom.trim() ? "结束须晚于开始" : "结束须晚于当前时间";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const from = effectiveFrom.trim() ? localToRFC3339(effectiveFrom) : new Date().toISOString();
    const to = effectiveTo.trim() ? localToRFC3339(effectiveTo) : null;
    const overlapping = findOverlappingChannelCostMultipliers(existing, modelIdArg, from, to);
    if (overlapping.length > 0) {
      setPending({ from, to, overlapping });
      return;
    }
    mutation.mutate({ from, to, overlapping: [] });
  }

  const previewRows = useMemo(
    () => multiplierPreviewRows(ctx, modelIdArg, multiplier),
    [ctx, modelIdArg, multiplier],
  );

  const availableOverrideModels = ctx.boundModels;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <HintLabel htmlFor="ccm_scope" hint="渠道默认对所有走倍率的模型生效；逐模型覆盖只作用于选定模型，优先于默认。">
            作用范围
          </HintLabel>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id="ccm_scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">渠道默认（全模型）</SelectItem>
              {availableOverrideModels.map((m) => (
                <SelectItem key={m.model_id} value={String(m.model_id)}>
                  覆盖：{m.model_display_name || m.model_external_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!errors.multiplier}>
          <HintLabel htmlFor="ccm_mult" hint="相对模型基准价的倍数，如 1.15 = 基准价的 115%。">
            价格倍率
          </HintLabel>
          <Input
            id="ccm_mult"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            placeholder="1.15"
            inputMode="decimal"
            aria-invalid={!!errors.multiplier}
          />
          <FieldError>{errors.multiplier}</FieldError>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <HintLabel htmlFor="ccm_from" hint="留空默认取创建时间（立即生效）。">
            生效开始（可选）
          </HintLabel>
          <DateTimePicker id="ccm_from" value={effectiveFrom} onChange={setEffectiveFrom} placeholder="留空默认创建时间" />
        </Field>
        <Field data-invalid={!!errors.effective_to}>
          <HintLabel htmlFor="ccm_to" hint="留空表示长期有效。">
            生效结束（可选）
          </HintLabel>
          <DateTimePicker id="ccm_to" value={effectiveTo} onChange={setEffectiveTo} placeholder="留空表示长期有效" aria-invalid={!!errors.effective_to} />
          <FieldError>{errors.effective_to}</FieldError>
        </Field>
      </div>

      <section className="flex flex-col gap-1.5">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">改动影响预览</div>
        <PriceImpactTable rows={previewRows} emptyHint="输入倍率后预览受影响模型" />
      </section>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {mutation.isPending ? "保存中..." : "创建"}
        </Button>
      </div>

      <ConfirmActionDialog
        open={pending != null}
        onOpenChange={(o) => {
          if (!o && !mutation.isPending) setPending(null);
        }}
        title="覆盖现有倍率？"
        description={
          pending
            ? `该${scope === "default" ? "渠道默认" : "模型覆盖"}已有生效中的价格倍率。确认后旧倍率将在新倍率生效时间收口（或停用），随后新倍率生效，两者不再重叠。`
            : ""
        }
        confirmLabel="确认继续"
        pending={mutation.isPending}
        onConfirm={() => pending && mutation.mutate(pending)}
      />
    </form>
  );
}

// multiplierPreviewRows 计算「把 scope 的倍率改成 newMultiplier」对受影响模型的成本影响。
function multiplierPreviewRows(
  ctx: ChannelCostContext,
  modelIdArg: number | null,
  newMultiplier: string,
): PriceImpactRow[] {
  const newValid = MULT_PATTERN.test(newMultiplier.trim());
  // 默认倍率影响所有「无覆盖」模型；逐模型覆盖只影响该模型。
  const targets =
    modelIdArg == null
      ? ctx.boundModels.filter((m) => !ctx.overrideByModel.has(m.model_id))
      : ctx.boundModels.filter((m) => m.model_id === modelIdArg);

  return targets.map((m) => {
    const ref = ctx.referenceByModel.get(m.model_id) ?? null;
    const name = m.model_display_name || m.model_external_id;
    if (ctx.hasAbsoluteOverride.has(m.model_id)) {
      return { key: String(m.model_id), name, source: "override" };
    }
    const oldMult =
      ctx.overrideByModel.get(m.model_id)?.multiplier ?? ctx.currentDefault?.multiplier ?? null;
    if (!ref) {
      return { key: String(m.model_id), name, source: "unpriced" };
    }
    const recharge = ctx.currentRecharge?.factor ?? null;
    const oldDerived = oldMult != null ? deriveChannelCost(ref, oldMult, recharge) : null;
    const newDerived = newValid ? deriveChannelCost(ref, newMultiplier.trim(), recharge) : null;
    return {
      key: String(m.model_id),
      name,
      referenceInput: ref.uncached_input_cost,
      referenceOutput: ref.output_cost,
      oldInput: oldDerived?.uncached_input ?? null,
      oldOutput: oldDerived?.output ?? null,
      newInput: newDerived?.uncached_input ?? null,
      newOutput: newDerived?.output ?? null,
      source: "derived",
    };
  });
}

// ---- 充值倍率创建表单（含「充值金额→倍率」直觉换算助手）+ 实时影响预览 + 收口确认 ----
function RechargeForm({
  ctx,
  existing,
  onCancel,
  onSaved,
}: {
  ctx: ChannelCostContext;
  existing: ChannelRechargeFactor[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [factor, setFactor] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<{ from: string; to: string | null; overlapping: ChannelRechargeFactor[] } | null>(null);
  // 换算助手：充值金额 / 到账名义额度 / 汇率（真实币种每 1 外币）→ factor。
  const [payAmount, setPayAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [fx, setFx] = useState("");

  function deriveFactor() {
    const pay = Number(payAmount);
    const credit = Number(creditAmount);
    const rate = fx.trim() === "" ? 1 : Number(fx);
    if (!Number.isFinite(pay) || !Number.isFinite(credit) || !Number.isFinite(rate) || credit <= 0 || rate <= 0) {
      toast.error("请填写有效的充值金额 / 到账额度 / 汇率");
      return;
    }
    // 真实结算币种成本 = 支付金额 ÷ 汇率（换成结算币种）÷ 到账名义额度。
    const f = pay / rate / credit;
    setFactor(trimZeros(f.toFixed(10)));
  }

  const mutation = useMutation({
    mutationFn: async (vars: { from: string; to: string | null; overlapping: ChannelRechargeFactor[] }) => {
      for (const old of vars.overlapping) {
        if (new Date(old.effective_from).getTime() < new Date(vars.from).getTime()) {
          await updateChannelRechargeFactor({ id: old.id, status: old.status, effective_to: vars.from });
        } else {
          await updateChannelRechargeFactor({ id: old.id, status: "disabled", effective_to: old.effective_to });
        }
      }
      return createChannelRechargeFactor({
        channelId: ctx.channelId,
        factor: factor.trim(),
        status: "enabled",
        effective_from: vars.from,
        effective_to: vars.to,
      });
    },
    onSuccess: () => {
      setPending(null);
      toast.success("已新建充值倍率");
      onSaved();
    },
    onError: (err) => {
      setPending(null);
      toast.error(apiErrorMessage(err));
    },
  });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (factor.trim() === "" || !MULT_PATTERN.test(factor.trim())) {
      next.factor = "充值倍率需为非负小数";
    }
    if (
      effectiveTo.trim() !== "" &&
      new Date(effectiveTo) <= (effectiveFrom.trim() ? new Date(effectiveFrom) : new Date())
    ) {
      next.effective_to = effectiveFrom.trim() ? "结束须晚于开始" : "结束须晚于当前时间";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const from = effectiveFrom.trim() ? localToRFC3339(effectiveFrom) : new Date().toISOString();
    const to = effectiveTo.trim() ? localToRFC3339(effectiveTo) : null;
    const overlapping = findOverlappingChannelRechargeFactors(existing, from, to);
    if (overlapping.length > 0) {
      setPending({ from, to, overlapping });
      return;
    }
    mutation.mutate({ from, to, overlapping: [] });
  }

  const previewRows = useMemo(
    () => rechargePreviewRows(ctx, factor),
    [ctx, factor],
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-md border border-dashed p-3">
        <div className="text-muted-foreground mb-2 text-xs">
          换算助手：按「充值多少钱 / 到账多少名义额度 / 汇率」自动算出充值倍率。
        </div>
        <div className="grid grid-cols-4 items-end gap-2">
          <Field>
            <HintLabel htmlFor="rf_pay" hint="你实际支付的金额（原始币种，如 RMB）。">
              充值金额
            </HintLabel>
            <Input id="rf_pay" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="33" inputMode="decimal" className="h-8" />
          </Field>
          <Field>
            <HintLabel htmlFor="rf_credit" hint="到账的上游名义额度（如 500 名义 USD）。">
              到账额度
            </HintLabel>
            <Input id="rf_credit" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="500" inputMode="decimal" className="h-8" />
          </Field>
          <Field>
            <HintLabel htmlFor="rf_fx" hint="支付币种→结算币种汇率（结算币种每 1 单位=多少支付币种）；同币种填 1。">
              汇率
            </HintLabel>
            <Input id="rf_fx" value={fx} onChange={(e) => setFx(e.target.value)} placeholder="7.2" inputMode="decimal" className="h-8" />
          </Field>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={deriveFactor}>
            算出倍率
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!errors.factor}>
          <HintLabel htmlFor="rf_factor" hint="每 1 单位上游名义额度折合多少结算币种真实钱。">
            充值倍率
          </HintLabel>
          <Input id="rf_factor" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="0.0092" inputMode="decimal" aria-invalid={!!errors.factor} />
          <FieldError>{errors.factor}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <HintLabel htmlFor="rf_from" hint="留空默认取创建时间（立即生效）。">
              生效开始
            </HintLabel>
            <DateTimePicker id="rf_from" value={effectiveFrom} onChange={setEffectiveFrom} placeholder="留空默认现在" />
          </Field>
          <Field data-invalid={!!errors.effective_to}>
            <HintLabel htmlFor="rf_to" hint="留空表示长期有效。">
              生效结束
            </HintLabel>
            <DateTimePicker id="rf_to" value={effectiveTo} onChange={setEffectiveTo} placeholder="长期" aria-invalid={!!errors.effective_to} />
            <FieldError>{errors.effective_to}</FieldError>
          </Field>
        </div>
      </div>

      <section className="flex flex-col gap-1.5">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">改动影响预览（全渠道模型）</div>
        <PriceImpactTable rows={previewRows} emptyHint="输入充值倍率后预览受影响模型" />
      </section>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {mutation.isPending ? "保存中..." : "创建"}
        </Button>
      </div>

      <ConfirmActionDialog
        open={pending != null}
        onOpenChange={(o) => {
          if (!o && !mutation.isPending) setPending(null);
        }}
        title="覆盖现有充值倍率？"
        description="该渠道已有生效中的充值倍率。确认后旧倍率将在新倍率生效时间收口（或停用），随后新倍率生效。"
        confirmLabel="确认继续"
        pending={mutation.isPending}
        onConfirm={() => pending && mutation.mutate(pending)}
      />
    </form>
  );
}

// rechargePreviewRows 计算「把充值倍率改成 newFactor」对全渠道走倍率模型的成本影响。
function rechargePreviewRows(ctx: ChannelCostContext, newFactor: string): PriceImpactRow[] {
  const newValid = MULT_PATTERN.test(newFactor.trim());
  return ctx.boundModels.map((m) => {
    const ref = ctx.referenceByModel.get(m.model_id) ?? null;
    const name = m.model_display_name || m.model_external_id;
    if (ctx.hasAbsoluteOverride.has(m.model_id)) {
      return { key: String(m.model_id), name, source: "override" };
    }
    const mult =
      ctx.overrideByModel.get(m.model_id)?.multiplier ?? ctx.currentDefault?.multiplier ?? null;
    if (!ref || mult == null) {
      return { key: String(m.model_id), name, source: "unpriced" };
    }
    const oldDerived = deriveChannelCost(ref, mult, ctx.currentRecharge?.factor ?? null);
    const newDerived = newValid ? deriveChannelCost(ref, mult, newFactor.trim()) : null;
    return {
      key: String(m.model_id),
      name,
      referenceInput: ref.uncached_input_cost,
      referenceOutput: ref.output_cost,
      oldInput: oldDerived?.uncached_input ?? null,
      oldOutput: oldDerived?.output ?? null,
      newInput: newDerived?.uncached_input ?? null,
      newOutput: newDerived?.output ?? null,
      source: "derived",
    };
  });
}

// ---- 版本区（价格倍率 / 充值倍率历史 + 收口/启停）----
function VersionSection<T extends { id: number }>({
  title,
  query,
  renderRow,
}: {
  title: string;
  query: { isPending: boolean; isError: boolean; error: Error | null; data?: T[] };
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</div>
      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{query.error?.message}</AlertDescription>
        </Alert>
      ) : query.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (query.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">还没有配置</p>
      ) : (
        <ul className="divide-border max-h-48 divide-y overflow-y-auto rounded-md border">
          {(query.data ?? []).map((row) => renderRow(row))}
        </ul>
      )}
    </section>
  );
}

function MultiplierRow({ row, onChanged }: { row: ChannelCostMultiplier; onChanged: () => void }) {
  return (
    <WindowRow
      label={
        <>
          <span className="font-medium tabular-nums">× {trimDecimal(row.multiplier)}</span>{" "}
          <Badge variant="outline" className="ml-1">
            {row.model_id == null ? "默认" : row.model_display_name || row.model_external_id || `模型 ${row.model_id}`}
          </Badge>
        </>
      }
      status={row.status}
      effectiveFrom={row.effective_from}
      effectiveTo={row.effective_to}
      onSave={(vars) => updateChannelCostMultiplier({ id: row.id, ...vars })}
      onChanged={onChanged}
      confirmTitle={(disabling) => (disabling ? "停用价格倍率" : "启用价格倍率")}
    />
  );
}

function RechargeRow({ row, onChanged }: { row: ChannelRechargeFactor; onChanged: () => void }) {
  return (
    <WindowRow
      label={<span className="font-medium tabular-nums">× {trimDecimal(row.factor)}</span>}
      status={row.status}
      effectiveFrom={row.effective_from}
      effectiveTo={row.effective_to}
      onSave={(vars) => updateChannelRechargeFactor({ id: row.id, ...vars })}
      onChanged={onChanged}
      confirmTitle={(disabling) => (disabling ? "停用充值倍率" : "启用充值倍率")}
    />
  );
}

// WindowRow 通用「生效窗口收口 + 启停」行，价格倍率/充值倍率共用（对齐 ModelPriceRow 交互）。
function WindowRow({
  label,
  status,
  effectiveFrom,
  effectiveTo,
  onSave,
  onChanged,
  confirmTitle,
}: {
  label: React.ReactNode;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  onSave: (vars: { status: string; effective_to: string | null }) => Promise<unknown>;
  onChanged: () => void;
  confirmTitle: (disabling: boolean) => string;
}) {
  const [draftTo, setDraftTo] = useState(rfc3339ToLocal(effectiveTo));
  const [pendingStatus, setPendingStatus] = useState<"enabled" | "disabled" | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { status: string; effective_to: string | null }) => onSave(vars),
    onSuccess: () => {
      setPendingStatus(null);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const enabled = status === "enabled";
  const currentTo = rfc3339ToLocal(effectiveTo);
  const dirty = draftTo !== currentTo;
  const busy = mutation.isPending;
  const disabling = pendingStatus === "disabled";

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="min-w-48 flex-1">
        <div className="text-sm">{label}</div>
        <div className="text-muted-foreground text-xs">
          {formatDateTime(effectiveFrom)} ~ {effectiveTo ? formatDateTime(effectiveTo) : "长期"}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <DateTimePicker value={draftTo} onChange={setDraftTo} placeholder="生效结束时间" className="h-8 w-56" />
        {dirty && (
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="保存结束时间"
            disabled={busy}
            onClick={() => mutation.mutate({ status, effective_to: draftTo.trim() ? localToRFC3339(draftTo) : null })}
          >
            <CheckIcon />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          disabled={busy}
          onCheckedChange={(next) => setPendingStatus(next ? "enabled" : "disabled")}
          aria-label="切换状态"
        />
        <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "启用" : "停用"}</Badge>
      </div>
      <ConfirmActionDialog
        open={pendingStatus != null}
        onOpenChange={(o) => {
          if (!o && !busy) setPendingStatus(null);
        }}
        title={confirmTitle(disabling)}
        description={disabling ? "确认停用？停用后不再参与派生成本。" : "确认启用？启用后在其生效区间内参与派生成本。"}
        confirmLabel={disabling ? "确认停用" : "确认启用"}
        destructive={disabling}
        pending={busy}
        onConfirm={() => pendingStatus && mutation.mutate({ status: pendingStatus, effective_to: effectiveTo })}
      />
    </li>
  );
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}
