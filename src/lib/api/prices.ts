import { api } from "@/lib/api/client";

// 与后端 priceDTO 对齐。客户售价挂在 Unio 模型上（与渠道无关）。
// 金额一律用十进制字符串承载，避免 JSON number 精度丢失；可空成本项后端返回 null。
// 时间为 RFC3339 字符串，effective_to 为 null 表示长期有效。
export interface Price {
  id: number;
  model_id: number;
  currency: string;
  pricing_unit: string;
  uncached_input_price: string;
  cache_read_input_price: string | null;
  cache_write_5m_input_price: string | null;
  cache_write_1h_input_price: string | null;
  output_price: string;
  reasoning_output_price: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

// 售价数量天然有限（一个模型 × 币种 × 价格版本），列表不分页。
export async function listPrices(modelId: number): Promise<Price[]> {
  const res = await api.get<{ data: Price[] }>(
    `/admin/v1/models/${modelId}/prices`,
  );
  return res.data.data;
}

// 金额为十进制字符串；可空项传 null 表示不设置。时间为 RFC3339（UTC）。
export interface CreatePriceInput {
  modelId: number;
  currency: string;
  pricing_unit: string;
  uncached_input_price: string;
  cache_read_input_price: string | null;
  cache_write_5m_input_price: string | null;
  cache_write_1h_input_price: string | null;
  output_price: string;
  reasoning_output_price: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export async function createPrice({
  modelId,
  ...body
}: CreatePriceInput): Promise<Price> {
  const res = await api.post<{ data: Price }>(
    `/admin/v1/models/${modelId}/prices`,
    body,
  );
  return res.data.data;
}

// 价格不可删：只能 PATCH 关闭窗口（改 effective_to）或启停（改 status）；金额不可改。
export interface UpdatePriceInput {
  id: number;
  status: string;
  effective_to: string | null;
}

export async function updatePrice({
  id,
  ...body
}: UpdatePriceInput): Promise<Price> {
  const res = await api.patch<{ data: Price }>(`/admin/v1/prices/${id}`, body);
  return res.data.data;
}
