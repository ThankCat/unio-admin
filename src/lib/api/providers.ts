import { api } from "@/lib/api/client";
import type { ListMeta, ListParams, Page } from "@/lib/api/types";

export interface Provider {
  id: number;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// 服务端分页：把 page/page_size/status/q 作为 query 传给后端，拆出 items + total。
// 空的 status/q 由 axios 自动从 query 省略（值为 undefined 不发送）。
export async function listProviders(
  params: ListParams,
): Promise<Page<Provider>> {
  const res = await api.get<{ data: Provider[]; meta: ListMeta }>(
    "/admin/v1/providers",
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

// 给「创建渠道」的服务商下拉用：服务商数量天然很少，一次拉满（上限 100）即可，
// 不需要在选择框里做分页。
export async function listAllProviders(): Promise<Provider[]> {
  const { items } = await listProviders({ page: 1, pageSize: 100 });
  return items;
}

export interface CreateProviderInput {
  slug: string;
  name: string;
  status: string;
}

// 创建成功返回 201 + { data: Provider }；同样在这层拆信封。
export async function createProvider(
  input: CreateProviderInput,
): Promise<Provider> {
  const res = await api.post<{ data: Provider }>("/admin/v1/providers", input);
  return res.data.data;
}

// slug 不可变，所以 update 只收 name + status（后端要求 name 非空）。
export interface UpdateProviderInput {
  id: number;
  name: string;
  status: string;
}

export async function updateProvider({
  id,
  ...body
}: UpdateProviderInput): Promise<Provider> {
  const res = await api.patch<{ data: Provider }>(
    `/admin/v1/providers/${id}`,
    body,
  );
  return res.data.data;
}
