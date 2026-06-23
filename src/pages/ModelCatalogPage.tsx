import { Navigate, useSearchParams } from "react-router-dom";

/** 旧路由：合并进「模型」页参考目录 Tab。 */
export function ModelCatalogPage() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("tab", "catalog");
  return <Navigate to={`/models?${next.toString()}`} replace />;
}
