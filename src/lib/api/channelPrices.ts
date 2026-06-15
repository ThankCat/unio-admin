import { api } from "@/lib/api/client";

// 与后端 channelPriceDTO 对齐（阶段 15：售价 + 成本同表）。金额一律用十进制字符串承载。
// 售价 uncached_input_price/output_price 必填恒有值；其余售价分项与全部成本分项可空（null）。
// model_external_id / model_display_name 仅列表场景由后端 JOIN 带出。
export interface ChannelPrice {
  id: number;
  channel_id: number;
  model_id: number;
  model_external_id: string;
  model_display_name: string;
  currency: string;
  pricing_unit: string;
  uncached_input_price: string;
  cache_read_input_price: string | null;
  cache_write_5m_input_price: string | null;
  cache_write_1h_input_price: string | null;
  output_price: string;
  reasoning_output_price: string | null;
  uncached_input_cost: string | null;
  cache_read_input_cost: string | null;
  cache_write_5m_input_cost: string | null;
  cache_write_1h_input_cost: string | null;
  output_cost: string | null;
  reasoning_output_cost: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

// 价格数量天然有限（渠道挂的模型 × 价格版本），列表不分页。
export async function listChannelPrices(
  channelId: number,
): Promise<ChannelPrice[]> {
  const res = await api.get<{ data: ChannelPrice[] }>(
    `/admin/v1/channels/${channelId}/prices`,
  );
  return res.data.data;
}

// 售价必填（uncached_input_price/output_price），成本可空（null）。时间为 RFC3339（UTC）。
export interface CreateChannelPriceInput {
  channelId: number;
  modelId: number;
  currency: string;
  pricing_unit: string;
  uncached_input_price: string;
  cache_read_input_price: string | null;
  cache_write_5m_input_price: string | null;
  cache_write_1h_input_price: string | null;
  output_price: string;
  reasoning_output_price: string | null;
  uncached_input_cost: string | null;
  cache_read_input_cost: string | null;
  cache_write_5m_input_cost: string | null;
  cache_write_1h_input_cost: string | null;
  output_cost: string | null;
  reasoning_output_cost: string | null;
  status: string;
  effective_from: string;
  effective_to: string | null;
}

export async function createChannelPrice({
  channelId,
  modelId,
  ...body
}: CreateChannelPriceInput): Promise<ChannelPrice> {
  const res = await api.post<{ data: ChannelPrice }>(
    `/admin/v1/channels/${channelId}/models/${modelId}/prices`,
    body,
  );
  return res.data.data;
}

// 价格不可删：只能 PATCH 关闭窗口（改 effective_to）或启停（改 status）；金额不可改。
export interface UpdateChannelPriceInput {
  id: number;
  status: string;
  effective_to: string | null;
}

export async function updateChannelPrice({
  id,
  ...body
}: UpdateChannelPriceInput): Promise<ChannelPrice> {
  const res = await api.patch<{ data: ChannelPrice }>(
    `/admin/v1/channel-prices/${id}`,
    body,
  );
  return res.data.data;
}
