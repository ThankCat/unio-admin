import { Navigate, useSearchParams } from "react-router-dom";

/** 旧路由：合并进「能力」页字典 Tab。 */
export function CapabilityKeysPage() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("tab", "dictionary");
  return <Navigate to={`/capability?${next.toString()}`} replace />;
}
