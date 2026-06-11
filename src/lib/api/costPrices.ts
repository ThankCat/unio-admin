import { api } from "@/lib/api/client";

// 与后端 costPriceDTO 对齐。金额一律用十进制字符串承载，避免 JSON number 精度丢失。
// 可空成本项后端返回 null；时间为 RFC3339 字符串，effective_to 为 null 表示长期有效。
// model_external_id / model_display_name 仅列表场景由后端 JOIN 带出。
export interface CostPrice {
  id: number;
  channel_id: number;
  model_id: number;
  model_external_id: string;
  model_display_name: string;
  currency: string;
  pricing_unit: string;
  uncached_input_cost: string;
  cache_read_input_cost: string | null;
  cache_write_5m_input_cost: string | null;
  cache_write_1h_input_cost: string | null;
  output_cost: string;
  reasoning_output_cost: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

// 成本价数量天然有限（一条渠道挂的模型 × 价格版本），列表不分页。
export async function listCostPrices(channelId: number): Promise<CostPrice[]> {
  const res = await api.get<{ data: CostPrice[] }>(
    `/admin/v1/channels/${channelId}/cost-prices`,
  );
  return res.data.data;
}

// 金额为十进制字符串；可空项传 null 表示不设置。时间为 RFC3339（UTC）。
export interface CreateCostPriceInput {
  channelId: number;
  model_id: number;
  currency: string;
  pricing_unit: string;
  uncached_input_cost: string;
  cache_read_input_cost: string | null;
  cache_write_5m_input_cost: string | null;
  cache_write_1h_input_cost: string | null;
  output_cost: string;
  reasoning_output_cost: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export async function createCostPrice({
  channelId,
  ...body
}: CreateCostPriceInput): Promise<CostPrice> {
  const res = await api.post<{ data: CostPrice }>(
    `/admin/v1/channels/${channelId}/cost-prices`,
    body,
  );
  return res.data.data;
}

// 价格不可删：只能 PATCH 关闭窗口（改 effective_to）或启停（改 status）；金额不可改。
export interface UpdateCostPriceInput {
  id: number;
  status: string;
  effective_to: string | null;
}

export async function updateCostPrice({
  id,
  ...body
}: UpdateCostPriceInput): Promise<CostPrice> {
  const res = await api.patch<{ data: CostPrice }>(
    `/admin/v1/cost-prices/${id}`,
    body,
  );
  return res.data.data;
}
