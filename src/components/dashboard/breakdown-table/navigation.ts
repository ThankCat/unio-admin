import type { BreakdownDimension, BreakdownRow } from "@/lib/api/dashboard";

const BASE: Record<BreakdownDimension, string> = {
  provider: "/providers",
  channel: "/channels",
  model: "/models",
  route: "/routes",
};

/** 概览「表现」行 → 对应运维页路径（保留当前区间 query）。 */
export function breakdownRowHref(
  dimension: BreakdownDimension,
  row: BreakdownRow,
  currentParams?: URLSearchParams,
): string {
  const sp = new URLSearchParams();
  if (currentParams) {
    for (const key of ["range", "from", "to"] as const) {
      const v = currentParams.get(key);
      if (v) sp.set(key, v);
    }
  }

  switch (dimension) {
    case "provider":
      if (row.ref_id != null) {
        const qs = sp.toString();
        return qs ? `/providers/${row.ref_id}?${qs}` : `/providers/${row.ref_id}`;
      }
      break;
    case "channel":
      if (row.ref_id != null) {
        const qs = sp.toString();
        return qs ? `/channels/${row.ref_id}?${qs}` : `/channels/${row.ref_id}`;
      }
      break;
    case "model":
      if (row.ref_id != null) {
        const qs = sp.toString();
        return qs ? `/models/${row.ref_id}?${qs}` : `/models/${row.ref_id}`;
      }
      break;
    case "route":
      if (row.ref_id != null) {
        const qs = sp.toString();
        return qs ? `/routes/${row.ref_id}?${qs}` : `/routes/${row.ref_id}`;
      }
      break;
  }

  const qs = sp.toString();
  return qs ? `${BASE[dimension]}?${qs}` : BASE[dimension];
}
