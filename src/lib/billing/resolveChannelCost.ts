import {
  pickCurrentChannelCostMultiplier,
  type ChannelCostMultiplier,
} from "@/lib/api/channelCostMultipliers";
import {
  pickCurrentChannelPrice,
  type ChannelPrice,
} from "@/lib/api/channelPrices";
import {
  costBaseFromModelPrice,
  pickCurrentModelPrice,
  type ModelPrice,
} from "@/lib/api/modelPrices";
import {
  deriveChannelCost,
  type ProviderCostBase,
} from "@/lib/billing/scaleProviderCost";

export type ResolvedChannelIOCost = {
  input: string;
  output: string;
  source: "override" | "derived";
};

/**
 * 解析某渠道对某模型的生效入/出成本（DEC-031）。
 * 绝对覆盖优先；否则 基准价 × 价格倍率 × 充值倍率。
 */
export function resolveChannelIOCost(opts: {
  modelId: number;
  absolutePrices: ChannelPrice[];
  multipliers: ChannelCostMultiplier[];
  rechargeFactor: string | null;
  /** 完整基准价历史；与 costBase 二选一。 */
  modelPrices?: ModelPrice[];
  /** 已解析的成本基数（如从 ModelOpsRow base_* 构造）。 */
  costBase?: ProviderCostBase | null;
}): ResolvedChannelIOCost | null {
  const override = pickCurrentChannelPrice(opts.absolutePrices, opts.modelId);
  if (override) {
    return {
      input: override.uncached_input_cost,
      output: override.output_cost,
      source: "override",
    };
  }

  let base = opts.costBase ?? null;
  if (!base && opts.modelPrices) {
    const current = pickCurrentModelPrice(opts.modelPrices);
    base = current ? costBaseFromModelPrice(current) : null;
  }
  if (!base) return null;

  const mult = pickCurrentChannelCostMultiplier(opts.multipliers, opts.modelId);
  if (!mult) return null;

  const derived = deriveChannelCost(base, mult.multiplier, opts.rechargeFactor);
  if (!derived?.uncached_input || !derived.output) return null;
  return {
    input: derived.uncached_input,
    output: derived.output,
    source: "derived",
  };
}

/** 用 ModelOps 行上的基准价字段构造成本基数；缺主分项则返回 null。 */
export function costBaseFromOpsBase(opts: {
  uncached_input_price: string | null | undefined;
  output_price: string | null | undefined;
  cache_read_input_price?: string | null;
  reasoning_output_price?: string | null;
  cache_write_5m_input_price?: string | null;
  cache_write_1h_input_price?: string | null;
  cache_write_30m_input_price?: string | null;
}): ProviderCostBase | null {
  if (opts.uncached_input_price == null || opts.output_price == null) return null;
  return {
    uncached_input_cost: opts.uncached_input_price,
    output_cost: opts.output_price,
    cache_read_input_cost: opts.cache_read_input_price ?? null,
    reasoning_output_cost: opts.reasoning_output_price ?? null,
    cache_write_5m_input_cost: opts.cache_write_5m_input_price ?? null,
    cache_write_1h_input_cost: opts.cache_write_1h_input_price ?? null,
    cache_write_30m_input_cost: opts.cache_write_30m_input_price ?? null,
  };
}
