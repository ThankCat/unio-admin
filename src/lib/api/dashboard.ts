import { api } from "@/lib/api/client";

// 与后端 dashboard DTO 对齐。金额一律十进制字符串（不经 float）；率为 [0,1] 比例。

export interface MoneyByCurrency {
  currency: string;
  amount: string;
}

export interface BalanceByCurrency {
  currency: string;
  balance: string;
  reserved: string;
  available: string;
}

export interface RequestStats {
  total: number;
  succeeded: number;
  failed: number;
  canceled: number;
  pending: number;
  running: number;
  success_rate: number;
  error_rate: number;
}

export interface TokenStats {
  input: number;
  output: number;
  total: number;
}

export interface ExceptionGroup {
  event_type: string;
  total: number;
  platform_amount: string;
}

export type HealthBucket = "healthy" | "degraded" | "unhealthy" | "no_data";

export interface ChannelHealth {
  channel_id: number;
  name: string;
  status: string;
  attempt_total: number;
  attempt_succeeded: number;
  success_rate: number;
  bucket: HealthBucket;
}

export interface ChannelStats {
  enabled_count: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  no_data: number;
  channels: ChannelHealth[];
}

export interface DashboardOverview {
  from: string;
  to: string;
  requests: RequestStats;
  tokens: TokenStats;
  revenue: MoneyByCurrency[];
  cost: MoneyByCurrency[];
  margin: MoneyByCurrency[];
  balance: BalanceByCurrency[];
  billing_exceptions: ExceptionGroup[];
  channels: ChannelStats;
}

export type TimeseriesMetric = "requests" | "tokens" | "spend";
export type TimeseriesInterval = "hour" | "day";

export interface RequestPoint {
  bucket: string;
  total: number;
  succeeded: number;
}

export interface TokenPoint {
  bucket: string;
  input: number;
  output: number;
}

export interface SpendPoint {
  bucket: string;
  currency: string;
  amount: string;
}

// points 形状随 metric 而定；调用方按 metric 收窄类型。
export interface DashboardSeries<
  P = RequestPoint | TokenPoint | SpendPoint,
> {
  metric: TimeseriesMetric;
  interval: TimeseriesInterval;
  from: string;
  to: string;
  points: P[];
}

export async function getOverview(params: {
  from: string;
  to: string;
}): Promise<DashboardOverview> {
  const res = await api.get<{ data: DashboardOverview }>(
    "/admin/v1/dashboard/overview",
    { params: { from: params.from, to: params.to } },
  );
  return res.data.data;
}

export async function getTimeseries<P = RequestPoint | TokenPoint | SpendPoint>(
  params: {
    metric: TimeseriesMetric;
    interval: TimeseriesInterval;
    from: string;
    to: string;
  },
): Promise<DashboardSeries<P>> {
  const res = await api.get<{ data: DashboardSeries<P> }>(
    "/admin/v1/dashboard/timeseries",
    {
      params: {
        metric: params.metric,
        interval: params.interval,
        from: params.from,
        to: params.to,
      },
    },
  );
  return res.data.data;
}
