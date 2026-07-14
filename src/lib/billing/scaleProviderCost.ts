// 前端本地派生算价（DEC-031）：渠道真实成本 = 模型基准价 × 价格倍率 × 充值倍率。
//
// 仅用于「改倍率/改基准价」时的即时预览，是 advisory 展示；权威计费由后端 ScaleProviderCost 精确计算并快照。
// 前端用 JS number 计算并四舍五入到 6 位（够展示），不承担落库精度。

// 成本基数输入（DEC-031：以模型基准价为唯一成本基数）。上游 *_cost 分项由调用方从基准价 *_price 映射得到。
export interface ProviderCostBase {
  uncached_input_cost: string;
  output_cost: string;
  cache_read_input_cost: string | null;
  reasoning_output_cost: string | null;
  cache_write_5m_input_cost: string | null;
  cache_write_1h_input_cost: string | null;
  cache_write_30m_input_cost: string | null;
}

// 成本分项键（与后端 7 分项对齐；顺序即展示顺序）。
const COST_FIELD_KEYS = [
  "uncached_input",
  "output",
  "cache_read_input",
  "reasoning_output",
  "cache_write_5m_input",
  "cache_write_1h_input",
  "cache_write_30m_input",
] as const;

type CostFieldKey = (typeof COST_FIELD_KEYS)[number];

// 成本向量：各分项十进制字符串或 null（未配置）。
export type CostVector = Record<CostFieldKey, string | null>;

// 把成本基数读成成本向量（映射 *_cost 列到短键）。
function referenceCostVector(ref: ProviderCostBase): CostVector {
  return {
    uncached_input: ref.uncached_input_cost,
    output: ref.output_cost,
    cache_read_input: ref.cache_read_input_cost,
    reasoning_output: ref.reasoning_output_cost,
    cache_write_5m_input: ref.cache_write_5m_input_cost,
    cache_write_1h_input: ref.cache_write_1h_input_cost,
    cache_write_30m_input: ref.cache_write_30m_input_cost,
  };
}

// combinedFactor 计算合并倍率 = 价格倍率 × 充值倍率；非法输入返回 NaN。rechargeFactor 缺省按 1。
function combinedFactor(
  priceMultiplier: string | null | undefined,
  rechargeFactor: string | null | undefined,
): number {
  const p = Number((priceMultiplier ?? "").toString().trim());
  const r =
    rechargeFactor == null || rechargeFactor.toString().trim() === ""
      ? 1
      : Number(rechargeFactor.toString().trim());
  if (!Number.isFinite(p) || !Number.isFinite(r) || p < 0 || r < 0) return NaN;
  return p * r;
}

// scaleValue 把单个成本分项乘以合并倍率；null/空/非法保持 null，四舍五入到 6 位并去尾零。
function scaleValue(value: string | null, factor: number): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isFinite(factor)) return null;
  return trimZeros((n * factor).toFixed(6));
}

// deriveCostVector 成本基数向量 × 合并倍率 → 派生真实成本向量（逐分项，NULL 保持 NULL）。
function deriveCostVector(ref: CostVector, factor: number): CostVector {
  const out = {} as CostVector;
  for (const key of COST_FIELD_KEYS) {
    out[key] = scaleValue(ref[key], factor);
  }
  return out;
}

// deriveChannelCost 便捷组合：成本基数（模型基准价）× 价格倍率 × 充值倍率 → 派生真实成本向量。
export function deriveChannelCost(
  ref: ProviderCostBase,
  priceMultiplier: string | null | undefined,
  rechargeFactor: string | null | undefined,
): CostVector | null {
  const factor = combinedFactor(priceMultiplier, rechargeFactor);
  if (!Number.isFinite(factor)) return null;
  return deriveCostVector(referenceCostVector(ref), factor);
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}
