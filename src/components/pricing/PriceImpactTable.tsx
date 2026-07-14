import { useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { roundPrice3, trimDecimal } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

// PriceImpactTable：成本改动差异可视化基座。渠道成本倍率预览、基准价下游影响等共用。
// 每行一个受影响对象（模型 或 渠道）：基准价(入/出) + 旧成本→新成本 + 差额 + 毛利 + 来源徽标；
// 顶部影响面摘要条（涨/降/未定价/亏本计数）。是 advisory 展示（权威计费在后端）。

type ImpactSource = "derived" | "override" | "unpriced";

export interface PriceImpactRow {
  key: string;
  name: string;
  // 成本基数（模型基准价）入/出展示，可空。
  referenceInput?: string | null;
  referenceOutput?: string | null;
  // 旧/新真实成本的关键分项（未缓存输入 + 输出）；未定价行传 null。
  oldInput?: string | null;
  oldOutput?: string | null;
  newInput?: string | null;
  newOutput?: string | null;
  // 毛利（结算币种数值）与毛利率（0~1）；可空（不展示毛利列）。
  margin?: number | null;
  marginRate?: number | null;
  source: ImpactSource;
  // 未定价行的引导（如「去补参考价」）。
  action?: React.ReactNode;
}

const GRID =
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1.1fr)] items-center gap-2";

function num(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// 方向：以输出成本为主键比较旧→新（缺则退未缓存输入）。
function direction(row: PriceImpactRow): "up" | "down" | "flat" | "na" {
  if (row.source === "unpriced") return "na";
  const oldV = num(row.oldOutput) ?? num(row.oldInput);
  const newV = num(row.newOutput) ?? num(row.newInput);
  if (oldV == null || newV == null) return "na";
  if (newV > oldV) return "up";
  if (newV < oldV) return "down";
  return "flat";
}

function CostPair({ input, output }: { input?: string | null; output?: string | null }) {
  const i = input == null || input === "" ? "—" : trimDecimal(input);
  const o = output == null || output === "" ? "—" : trimDecimal(output);
  return (
    <span className="tabular-nums">
      {i} <span className="text-muted-foreground">/</span> {o}
    </span>
  );
}

function DeltaBadge({ dir, oldV, newV }: { dir: string; oldV: number | null; newV: number | null }) {
  if (dir === "na" || oldV == null || newV == null) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  if (dir === "flat") {
    return <span className="text-muted-foreground tabular-nums text-sm">0</span>;
  }
  const abs = roundPrice3(Math.abs(newV - oldV));
  if (dir === "up") {
    return (
      <span className="text-destructive inline-flex items-center gap-0.5 tabular-nums text-sm">
        +{abs}
        <ArrowUpIcon className="size-3.5 shrink-0" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
      -{abs}
      <ArrowDownIcon className="size-3.5 shrink-0" />
    </span>
  );
}

function SourceBadge({ source }: { source: ImpactSource }) {
  if (source === "override") return <Badge variant="secondary">覆盖</Badge>;
  if (source === "unpriced")
    return (
      <Badge variant="destructive" className="gap-1">
        <TriangleAlertIcon className="size-3" />
        未定价
      </Badge>
    );
  return <Badge variant="outline">派生</Badge>;
}

export function PriceImpactTable({
  rows,
  emptyHint = "没有受影响的模型",
}: {
  rows: PriceImpactRow[];
  emptyHint?: string;
}) {
  const summary = useMemo(() => {
    let up = 0;
    let down = 0;
    let unpriced = 0;
    let loss = 0;
    for (const r of rows) {
      const d = direction(r);
      if (r.source === "unpriced") unpriced++;
      else if (d === "up") up++;
      else if (d === "down") down++;
      if (r.margin != null && r.margin < 0) loss++;
    }
    return { total: rows.length, up, down, unpriced, loss };
  }, [rows]);

  if (rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyHint}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 影响面摘要条 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-medium">{summary.total} 模型</span>
        {summary.up > 0 && (
          <span className="text-destructive inline-flex items-center gap-0.5">
            <ArrowUpIcon className="size-3" />
            {summary.up} 涨
          </span>
        )}
        {summary.down > 0 && (
          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
            <ArrowDownIcon className="size-3" />
            {summary.down} 降
          </span>
        )}
        {summary.unpriced > 0 && (
          <span className="text-muted-foreground inline-flex items-center gap-0.5">
            <TriangleAlertIcon className="size-3" />
            {summary.unpriced} 未定价
          </span>
        )}
        {summary.loss > 0 && (
          <span className="text-destructive inline-flex items-center gap-0.5 font-medium">
            <TriangleAlertIcon className="size-3" />
            {summary.loss} 亏本
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <div
          className={cn(
            "bg-muted/40 text-muted-foreground px-3 py-2 text-xs font-medium",
            GRID,
          )}
        >
          <div>模型</div>
          <div>基准价 入/出</div>
          <div>旧 → 新（入/出）</div>
          <div>差额 · 毛利</div>
        </div>
        <ul className="divide-border max-h-[46vh] divide-y overflow-y-auto">
          {rows.map((r) => {
            const dir = direction(r);
            const oldPrimary = num(r.oldOutput) ?? num(r.oldInput);
            const newPrimary = num(r.newOutput) ?? num(r.newInput);
            return (
              <li key={r.key} className={cn("px-3 py-2 text-sm", GRID)}>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate">{r.name}</span>
                  <SourceBadge source={r.source} />
                </div>
                <div className="text-muted-foreground text-xs">
                  <CostPair input={r.referenceInput} output={r.referenceOutput} />
                </div>
                <div className="text-xs">
                  {r.source === "unpriced" ? (
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      无法计价 {r.action}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        <CostPair input={r.oldInput} output={r.oldOutput} />
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span>
                        <CostPair input={r.newInput} output={r.newOutput} />
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DeltaBadge dir={dir} oldV={oldPrimary} newV={newPrimary} />
                  {r.margin != null && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 tabular-nums text-xs",
                        r.margin < 0
                          ? "text-destructive font-medium"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                      title="毛利 = 售价 − 真实成本（按当前生效值预估，advisory）"
                    >
                      <span
                        className={cn(
                          "inline-block size-1.5 rounded-full",
                          r.margin < 0 ? "bg-destructive" : "bg-emerald-500",
                        )}
                      />
                      {roundPrice3(r.margin)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
