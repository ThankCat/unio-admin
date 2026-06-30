import { api } from "@/lib/api/client";
import { buildListQuery } from "@/lib/api/list-params";
import type { ListMeta, Page } from "@/lib/api/types";

// 与后端 usageSummaryDTO 对齐：用量事实 + 请求归属维度。
export interface UsageSummary {
  id: number;
  request_record_id: number;
  request_id: string;
  user_id: number;
  api_key_id: number;
  requested_model_id: string;
  response_model_id: string | null;
  status: string;
  uncached_input_tokens: number;
  cache_read_input_tokens: number;
  cache_write_5m_input_tokens: number;
  cache_write_1h_input_tokens: number;
  output_tokens_total: number;
  reasoning_output_tokens: number;
  usage_source: string;
  usage_mapping_version: string;
  created_at: string;
}

export interface UsageListParams {
  page: number;
  pageSize: number;
  sort?: string;
  userId?: number;
  model?: string;
  from?: string;
  to?: string;
}

export async function listUsage(
  params: UsageListParams,
): Promise<Page<UsageSummary>> {
  const res = await api.get<{ data: UsageSummary[]; meta: ListMeta }>(
    "/admin/v1/usage",
    {
      params: buildListQuery({
        page: params.page,
        page_size: params.pageSize,
        sort: params.sort,
        user_id: params.userId,
        model: params.model,
        from: params.from,
        to: params.to,
      }),
    },
  );
  return { items: res.data.data, total: res.data.meta.total };
}
