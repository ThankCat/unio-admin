import { api } from "@/lib/api/client";
import type { ListMeta, ListParams, Page } from "@/lib/api/types";

// 与后端 modelDTO 对齐。source 标明来源：
// manual=后台手建（同步永不覆盖）；seed_models_dev=models.dev 同步种子；import=导入。
export interface Model {
  id: number;
  model_id: string;
  display_name: string;
  owned_by: string;
  status: string;
  lab: string;
  max_output_tokens: number | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// 服务端分页：过滤/翻页下沉到后端 SQL。
export async function listModels(params: ListParams): Promise<Page<Model>> {
  const res = await api.get<{ data: Model[]; meta: ListMeta }>(
    "/admin/v1/models",
    {
      params: {
        page: params.page,
        page_size: params.pageSize,
        status: params.status,
        q: params.q || undefined,
      },
    },
  );
  return { items: res.data.data, total: res.data.meta.total };
}

// 给「渠道绑定模型」的下拉用：一次拉满（上限 100），默认只取启用中的模型。
export async function listAllModels(
  status: "enabled" | "disabled" = "enabled",
): Promise<Model[]> {
  const { items } = await listModels({ page: 1, pageSize: 100, status });
  return items;
}

// model_id 创建后不可改（对外稳定标识）；lab/max_output_tokens 可空。
export interface CreateModelInput {
  model_id: string;
  display_name: string;
  owned_by: string;
  status: string;
  lab: string;
  max_output_tokens: number | null;
}

export async function createModel(input: CreateModelInput): Promise<Model> {
  const res = await api.post<{ data: Model }>("/admin/v1/models", input);
  return res.data.data;
}

export interface UpdateModelInput {
  id: number;
  display_name: string;
  owned_by: string;
  status: string;
  lab: string;
  max_output_tokens: number | null;
}

export async function updateModel({
  id,
  ...body
}: UpdateModelInput): Promise<Model> {
  const res = await api.patch<{ data: Model }>(`/admin/v1/models/${id}`, body);
  return res.data.data;
}
