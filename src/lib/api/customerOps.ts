import { api } from "@/lib/api/client";
import { buildListQuery } from "@/lib/api/list-params";
import type { ListMeta, Page } from "@/lib/api/types";
import type { RangeQuery } from "@/lib/api/dashboard";

// §3.7 客户中心只读运维聚合（与后端 customer_ops DTO 对齐）。金额仅 USD。

export interface UsersOpsSummary {
  user_total: number;
  balance_usd: string;
  reserved_usd: string;
  available_usd: string;
  low_balance_total: number;
  request_total: number;
  succeeded: number;
  success_rate: number;
  consumption_usd: string;
}

export interface UserOpsRow {
  id: number;
  email: string;
  display_name: string;
  balance_usd: string;
  reserved_usd: string;
  available_usd: string;
  project_count: number;
  key_total: number;
  request_total: number;
  succeeded: number;
  success_rate: number;
  consumption_usd: string;
  last_used_at: string | null;
  low_balance: boolean;
}

export interface UserOpsDetail {
  balance_usd: string;
  reserved_usd: string;
  available_usd: string;
  request_total: number;
  succeeded: number;
  success_rate: number;
  consumption_usd: string;
}

export interface CustomerKey {
  id: number;
  name: string;
  project_id: number;
  project_name: string;
  status: string;
  spend_limit: string | null;
  spent_total: string;
  last_used_at: string | null;
}

export interface ProjectsOpsSummary {
  project_total: number;
  key_total: number;
  key_enabled: number;
  request_total: number;
  consumption_usd: string;
}

export interface ProjectOpsRow {
  id: number;
  name: string;
  user_id: number;
  user_email: string;
  default_route_name: string;
  key_total: number;
  key_enabled: number;
  request_total: number;
  consumption_usd: string;
  last_used_at: string | null;
}

export interface ApiKeysOpsSummary {
  key_total: number;
  key_enabled: number;
  spend_capped: number;
}

export interface ApiKeyOpsRow {
  id: number;
  name: string;
  key_prefix: string;
  project_id: number;
  status: string;
  route_name: string;
  spend_limit: string | null;
  spent_total: string;
  request_total: number;
  succeeded: number;
  success_rate: number;
  consumption_usd: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface PageParams extends RangeQuery {
  page: number;
  page_size: number;
  sort?: string;
  search?: string;
}

export async function getUsersOpsSummary(params: RangeQuery): Promise<UsersOpsSummary> {
  const res = await api.get<{ data: UsersOpsSummary }>("/admin/v1/users/ops/summary", { params });
  return res.data.data;
}

export async function getUsersOpsTable(params: PageParams): Promise<Page<UserOpsRow>> {
  const res = await api.get<{ data: UserOpsRow[]; meta: ListMeta }>("/admin/v1/users/ops", {
    params: buildListQuery(params),
  });
  return { items: res.data.data, total: res.data.meta.total };
}

export async function getUserOpsDetail(id: number, params: RangeQuery): Promise<UserOpsDetail> {
  const res = await api.get<{ data: UserOpsDetail }>(`/admin/v1/users/${id}/ops/detail`, { params });
  return res.data.data;
}

export async function getUserOpsKeys(id: number): Promise<CustomerKey[]> {
  const res = await api.get<{ data: CustomerKey[] }>(`/admin/v1/users/${id}/ops/keys`);
  return res.data.data;
}

export async function getProjectsOpsSummary(params: RangeQuery): Promise<ProjectsOpsSummary> {
  const res = await api.get<{ data: ProjectsOpsSummary }>("/admin/v1/projects/ops/summary", { params });
  return res.data.data;
}

export async function getProjectsOpsTable(params: PageParams): Promise<Page<ProjectOpsRow>> {
  const res = await api.get<{ data: ProjectOpsRow[]; meta: ListMeta }>("/admin/v1/projects/ops", {
    params: buildListQuery(params),
  });
  return { items: res.data.data, total: res.data.meta.total };
}

export async function getApiKeysOpsSummary(projectId: number): Promise<ApiKeysOpsSummary> {
  const res = await api.get<{ data: ApiKeysOpsSummary }>(`/admin/v1/projects/${projectId}/api-keys/ops/summary`);
  return res.data.data;
}

export async function getApiKeysOpsTable(projectId: number, params: RangeQuery): Promise<ApiKeyOpsRow[]> {
  const res = await api.get<{ data: ApiKeyOpsRow[] }>(`/admin/v1/projects/${projectId}/api-keys/ops`, { params });
  return res.data.data;
}
