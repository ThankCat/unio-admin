// 后端分页列表响应里的 meta 信封。
export interface ListMeta {
  page: number;
  page_size: number;
  total: number;
}

// 拆信封后给调用方的分页结果。
export interface Page<T> {
  items: T[];
  total: number;
}

type StatusFilter = "enabled" | "disabled";

// 列表请求的通用查询参数。
export interface ListParams {
  page: number;
  pageSize: number;
  status?: StatusFilter;
  q?: string;
}
