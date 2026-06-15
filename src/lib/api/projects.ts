import { api } from "@/lib/api/client";
import type { ListMeta, Page } from "@/lib/api/types";

// 与后端 projectDTO 对齐。项目即工作空间：仅作归类，不承载任何限额/策略。
// default_route_id（阶段 15）：项目级默认线路，null 表示回落内置经济。
export interface Project {
  id: number;
  user_id: number;
  name: string;
  default_route_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListParams {
  page: number;
  pageSize: number;
  // 按所属用户过滤；缺省列全部。
  userId?: number;
}

export async function listProjects(
  params: ProjectListParams,
): Promise<Page<Project>> {
  const res = await api.get<{ data: Project[]; meta: ListMeta }>(
    "/admin/v1/projects",
    {
      params: {
        page: params.page,
        page_size: params.pageSize,
        user_id: params.userId || undefined,
      },
    },
  );
  return { items: res.data.data, total: res.data.meta.total };
}

export async function getProject(id: number): Promise<Project> {
  const res = await api.get<{ data: Project }>(`/admin/v1/projects/${id}`);
  return res.data.data;
}

// 设置/清除项目默认线路（阶段 15）：routeId 为 null 表示清除（回落内置经济）。
export async function setProjectDefaultRoute(
  id: number,
  routeId: number | null,
): Promise<Project> {
  const res = await api.patch<{ data: Project }>(`/admin/v1/projects/${id}`, {
    default_route_id: routeId,
  });
  return res.data.data;
}
