import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ActivityIcon,
  CableIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  GaugeIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react";
import {
  getOverview,
  getTimeseries,
  type DashboardOverview,
  type MoneyByCurrency,
  type RequestPoint,
  type SpendPoint,
  type TimeseriesInterval,
  type TimeseriesMetric,
  type TokenPoint,
} from "@/lib/api/dashboard";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trimDecimal } from "@/lib/format";

const RANGES = {
  "24h": { label: "近 24 小时", hours: 24, interval: "hour" as TimeseriesInterval },
  "7d": { label: "近 7 天", hours: 24 * 7, interval: "day" as TimeseriesInterval },
  "30d": { label: "近 30 天", hours: 24 * 30, interval: "day" as TimeseriesInterval },
} as const;

type RangeKey = keyof typeof RANGES;

const METRICS: { key: TimeseriesMetric; label: string }[] = [
  { key: "requests", label: "请求" },
  { key: "tokens", label: "Token" },
  { key: "spend", label: "收入" },
  { key: "cost", label: "成本" },
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function fmtBucket(iso: string, interval: TimeseriesInterval): string {
  const d = new Date(iso);
  if (interval === "hour") {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function MoneyList({ items }: { items: MoneyByCurrency[] }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground text-sm">暂无</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((m) => (
        <div key={m.currency} className="tabular-nums">
          <span className="text-xl font-semibold tracking-tight">
            {trimDecimal(m.amount)}
          </span>{" "}
          <span className="text-muted-foreground text-xs">{m.currency}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");

  // 以 rangeKey 为依赖在选择时快照 now，避免每次渲染都生成新区间触发反复 refetch。
  const { from, to, interval } = useMemo(() => {
    const r = RANGES[rangeKey];
    const toD = new Date();
    const fromD = new Date(toD.getTime() - r.hours * 3600 * 1000);
    return { from: fromD.toISOString(), to: toD.toISOString(), interval: r.interval };
  }, [rangeKey]);

  const overview = useQuery({
    queryKey: ["dashboard", "overview", { from, to }],
    queryFn: () => getOverview({ from, to }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">工作台看板</h2>
          <p className="text-muted-foreground text-sm">
            运营首页只读聚合：{RANGES[rangeKey].label}
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(RANGES) as RangeKey[]).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={key === rangeKey ? "default" : "outline"}
              onClick={() => setRangeKey(key)}
            >
              {RANGES[key].label}
            </Button>
          ))}
        </div>
      </div>

      {overview.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{overview.error.message}</AlertDescription>
        </Alert>
      ) : (
        <>
          <OverviewCards data={overview.data} loading={overview.isPending} />
          <TimeseriesCard from={from} to={to} interval={interval} />
          <ChannelHealthCard data={overview.data} loading={overview.isPending} />
        </>
      )}
    </div>
  );
}

function OverviewCards({
  data,
  loading,
}: {
  data?: DashboardOverview;
  loading: boolean;
}) {
  const exceptionsTotal =
    data?.billing_exceptions.reduce((acc, e) => acc + e.total, 0) ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>请求数</CardTitle>
          <CardDescription>区间内全部请求</CardDescription>
          <CardAction>
            <ActivityIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {fmtInt(data.requests.total)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                成功 {fmtInt(data.requests.succeeded)} · 失败{" "}
                {fmtInt(data.requests.failed)} · 取消{" "}
                {fmtInt(data.requests.canceled)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成功率</CardTitle>
          <CardDescription>终态请求占比</CardDescription>
          <CardAction>
            <GaugeIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {pct(data.requests.success_rate)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                错误率 {pct(data.requests.error_rate)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Token 用量</CardTitle>
          <CardDescription>输入 + 输出</CardDescription>
          <CardAction>
            <CoinsIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {fmtInt(data.tokens.total)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs tabular-nums">
                输入 {fmtInt(data.tokens.input)} · 输出{" "}
                {fmtInt(data.tokens.output)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>计费异常</CardTitle>
          <CardDescription>区间内新增</CardDescription>
          <CardAction>
            <TriangleAlertIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {fmtInt(exceptionsTotal)}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {data.billing_exceptions.length === 0
                  ? "无异常"
                  : data.billing_exceptions
                      .map((e) => `${e.event_type} ${e.total}`)
                      .join(" · ")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>收入</CardTitle>
          <CardDescription>客户结算扣费</CardDescription>
          <CardAction>
            <CircleDollarSignIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <MoneyList items={data.revenue} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>成本</CardTitle>
          <CardDescription>平台上游成本</CardDescription>
          <CardAction>
            <WalletIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <MoneyList items={data.cost} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>毛利</CardTitle>
          <CardDescription>收入 − 成本</CardDescription>
          <CardAction>
            <TrendingUpIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <MoneyList items={data.margin} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>余额总额</CardTitle>
          <CardDescription>各币种可用余额</CardDescription>
          <CardAction>
            <WalletIcon className="size-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <Skeleton className="h-8 w-24" />
          ) : data.balance.length === 0 ? (
            <span className="text-muted-foreground text-sm">暂无</span>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.balance.map((b) => (
                <div key={b.currency} className="tabular-nums">
                  <span className="text-xl font-semibold tracking-tight">
                    {trimDecimal(b.available)}
                  </span>{" "}
                  <span className="text-muted-foreground text-xs">
                    {b.currency}（冻结 {trimDecimal(b.reserved)}）
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimeseriesCard({
  from,
  to,
  interval,
}: {
  from: string;
  to: string;
  interval: TimeseriesInterval;
}) {
  const [metric, setMetric] = useState<TimeseriesMetric>("requests");

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>趋势</CardTitle>
        <CardDescription>
          按{interval === "hour" ? "小时" : "天"}聚合的时间序列
        </CardDescription>
        <CardAction>
          <div className="flex gap-1">
            {METRICS.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={m.key === metric ? "default" : "outline"}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <TimeseriesChart metric={metric} from={from} to={to} interval={interval} />
      </CardContent>
    </Card>
  );
}

function TimeseriesChart({
  metric,
  from,
  to,
  interval,
}: {
  metric: TimeseriesMetric;
  from: string;
  to: string;
  interval: TimeseriesInterval;
}) {
  const query = useQuery({
    queryKey: ["dashboard", "timeseries", metric, interval, { from, to }],
    queryFn: () =>
      getTimeseries<RequestPoint | TokenPoint | SpendPoint>({
        metric,
        interval,
        from,
        to,
      }),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) {
    return <Skeleton className="h-[260px] w-full" />;
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>{query.error.message}</AlertDescription>
      </Alert>
    );
  }

  const points = query.data.points;
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        区间内暂无数据
      </p>
    );
  }

  if (metric === "requests") {
    const config: ChartConfig = {
      total: { label: "请求数", color: CHART_COLORS[0] },
      succeeded: { label: "成功", color: CHART_COLORS[1] },
    };
    return (
      <ChartContainer config={config} className="h-[260px] w-full">
        <AreaChart data={points as RequestPoint[]} margin={{ left: 4, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(v: string) => fmtBucket(v, interval)}
          />
          <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={(_, p) => fmtBucket(String(p?.[0]?.payload.bucket), interval)} />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area dataKey="total" type="monotone" stroke="var(--color-total)" fill="var(--color-total)" fillOpacity={0.15} />
          <Area dataKey="succeeded" type="monotone" stroke="var(--color-succeeded)" fill="var(--color-succeeded)" fillOpacity={0.15} />
        </AreaChart>
      </ChartContainer>
    );
  }

  if (metric === "tokens") {
    const config: ChartConfig = {
      input: { label: "输入", color: CHART_COLORS[0] },
      output: { label: "输出", color: CHART_COLORS[1] },
    };
    return (
      <ChartContainer config={config} className="h-[260px] w-full">
        <AreaChart data={points as TokenPoint[]} margin={{ left: 4, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(v: string) => fmtBucket(v, interval)}
          />
          <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={(_, p) => fmtBucket(String(p?.[0]?.payload.bucket), interval)} />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area dataKey="input" type="monotone" stroke="var(--color-input)" fill="var(--color-input)" fillOpacity={0.15} />
          <Area dataKey="output" type="monotone" stroke="var(--color-output)" fill="var(--color-output)" fillOpacity={0.15} />
        </AreaChart>
      </ChartContainer>
    );
  }

  // spend / cost：同形（bucket+currency+amount），按币种 pivot，多线渲染。
  const spendPoints = points as SpendPoint[];
  const buckets = new Map<string, Record<string, number | string>>();
  const currencies: string[] = [];
  for (const p of spendPoints) {
    if (!currencies.includes(p.currency)) currencies.push(p.currency);
    const row = buckets.get(p.bucket) ?? { bucket: p.bucket };
    row[p.currency] = Number(p.amount);
    buckets.set(p.bucket, row);
  }
  const rows = Array.from(buckets.values());
  const config: ChartConfig = {};
  currencies.forEach((cur, i) => {
    config[cur] = { label: cur, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <LineChart data={rows} margin={{ left: 4, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v: string) => fmtBucket(v, interval)}
        />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip
          content={
            <ChartTooltipContent labelFormatter={(_, p) => fmtBucket(String(p?.[0]?.payload.bucket), interval)} />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {currencies.map((cur) => (
          <Line
            key={cur}
            dataKey={cur}
            type="monotone"
            stroke={`var(--color-${cur})`}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: "健康",
  degraded: "降级",
  unhealthy: "不健康",
  no_data: "无数据",
};

function ChannelHealthCard({
  data,
  loading,
}: {
  data?: DashboardOverview;
  loading: boolean;
}) {
  // 只展示有问题（降级/不健康）的渠道，健康/无数据归入概览计数。
  const problem =
    data?.channels.channels.filter(
      (c) => c.bucket === "degraded" || c.bucket === "unhealthy",
    ) ?? [];

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>渠道健康</CardTitle>
        <CardDescription>
          按区间内 attempt 成功率推导（启用 {data?.channels.enabled_count ?? "—"}）
        </CardDescription>
        <CardAction>
          <CableIcon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        {loading || !data ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {HEALTH_LABELS.healthy} {data.channels.healthy}
              </Badge>
              <Badge variant="outline">
                {HEALTH_LABELS.degraded} {data.channels.degraded}
              </Badge>
              <Badge variant="destructive">
                {HEALTH_LABELS.unhealthy} {data.channels.unhealthy}
              </Badge>
              <Badge variant="outline">
                {HEALTH_LABELS.no_data} {data.channels.no_data}
              </Badge>
            </div>

            {problem.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                区间内无降级或不健康渠道。
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>渠道</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">尝试</TableHead>
                    <TableHead className="text-right">成功率</TableHead>
                    <TableHead>健康</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problem.map((c) => (
                    <TableRow key={c.channel_id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.status}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtInt(c.attempt_succeeded)}/{fmtInt(c.attempt_total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct(c.success_rate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.bucket === "unhealthy" ? "destructive" : "outline"
                          }
                        >
                          {HEALTH_LABELS[c.bucket]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
