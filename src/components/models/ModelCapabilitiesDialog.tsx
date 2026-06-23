import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listCapabilityKeys,
  listModelCapabilities,
  replaceModelCapabilities,
  type ModelCapabilityItem,
  type SupportLevel,
} from "@/lib/api/capability";
import { type Model } from "@/lib/api/models";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatLimits } from "@/lib/capability/limits";
import {
  filterKeysByProtocolScope,
  groupKeysByDomain,
  groupKeysByProtocolScope,
  protocolScopeLabel,
  protocolScopeStyles,
  type ProtocolScopeFilter,
} from "@/lib/capability/protocolScope";
// 行级取值：未声明（不写该 key）/ full / limited / unsupported。
type RowLevel = "unset" | SupportLevel;

interface RowState {
  level: RowLevel;
  limits: string; // 仅 limited 有意义，原文 JSON 字符串
}

// children-trigger 弹窗：自管 open 状态，便于嵌进操作列。
export function ModelCapabilitiesDialog({
  model,
  children,
}: {
  model: Model;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        {open && <CapabilityManager model={model} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CapabilityManager({
  model,
  onClose,
}: {
  model: Model;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const capsKey = ["model-capabilities", model.id];

  const keysQuery = useQuery({
    queryKey: ["capability-keys", "v2"],
    queryFn: listCapabilityKeys,
  });
  const capsQuery = useQuery({
    queryKey: capsKey,
    queryFn: () => listModelCapabilities(model.id),
  });

  const [rows, setRows] = useState<Record<string, RowState> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scopeFilter, setScopeFilter] = useState<ProtocolScopeFilter>("all");
  const [batchLevel, setBatchLevel] = useState<RowLevel>("full");
  const [limitsError, setLimitsError] = useState<string | null>(null);

  // 字典与已声明就绪后初始化本地编辑态（一次）。
  const keys = keysQuery.data;
  const caps = capsQuery.data;
  if (rows === null && keys && caps) {
    const declared = new Map(caps.map((c) => [c.capability_key, c]));
    const init: Record<string, RowState> = {};
    for (const def of keys) {
      const cur = declared.get(def.key);
      init[def.key] = {
        level: (cur?.support_level as RowLevel) ?? "unset",
        limits: cur?.limits != null ? formatLimits(cur.limits) : "",
      };
    }
    setRows(init);
  }

  const grouped = useMemo(() => {
    const filtered = filterKeysByProtocolScope(keys ?? [], scopeFilter);
    return groupKeysByProtocolScope(filtered).map(([scope, scopeKeys]) => ({
      scope,
      label: protocolScopeLabel(scope),
      domains: groupKeysByDomain(scopeKeys),
    }));
  }, [keys, scopeFilter]);

  const mutation = useMutation({
    mutationFn: () => {
      const items: ModelCapabilityItem[] = [];
      for (const [key, state] of Object.entries(rows ?? {})) {
        if (state.level === "unset") continue;
        let limits: unknown;
        if (state.level === "limited" && state.limits.trim() !== "") {
          limits = JSON.parse(state.limits);
        }
        items.push({
          capability_key: key,
          support_level: state.level,
          limits,
        });
      }
      return replaceModelCapabilities(model.id, items);
    },
    onSuccess: () => {
      toast.success("已保存模型能力");
      queryClient.invalidateQueries({ queryKey: capsKey });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function setRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyBatch() {
    if (selected.size === 0) {
      toast.info("先勾选要批量设置的能力");
      return;
    }
    setRows((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      for (const key of selected) {
        next[key] = { ...next[key], level: batchLevel };
      }
      return next;
    });
    setSelected(new Set());
  }

  function validateAndSave() {
    // 校验 limited 行的 limits 为合法 JSON。
    for (const [key, state] of Object.entries(rows ?? {})) {
      if (state.level === "limited" && state.limits.trim() !== "") {
        try {
          JSON.parse(state.limits);
        } catch {
          setLimitsError(`${key} 的 limits 不是合法 JSON`);
          toast.error(`${key} 的 limits 不是合法 JSON`);
          return;
        }
      }
    }
    setLimitsError(null);
    mutation.mutate();
  }

  const isLoading = keysQuery.isPending || capsQuery.isPending || rows === null;
  const isError = keysQuery.isError || capsQuery.isError;
  const declaredCount = rows
    ? Object.values(rows).filter((r) => r.level !== "unset").length
    : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>模型能力</DialogTitle>
        <DialogDescription>
          为「{model.display_name}」声明能力（用于 /v1/models 向客户展示与 Admin 能力矩阵）。
          勾选多行可批量设档，底部「保存」一次性提交（整表覆盖）。
        </DialogDescription>
      </DialogHeader>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            {keysQuery.error?.message ?? capsQuery.error?.message}
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", "全部"],
                ["shared", "通用"],
                ["openai", "OpenAI"],
                ["anthropic", "Anthropic"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={scopeFilter === value ? "default" : "outline"}
                onClick={() => setScopeFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              已选 {selected.size} 项，批量设为
            </span>
            <Select value={batchLevel} onValueChange={(v) => setBatchLevel(v as RowLevel)}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">full</SelectItem>
                <SelectItem value="limited">limited</SelectItem>
                <SelectItem value="unsupported">unsupported</SelectItem>
                <SelectItem value="unset">未声明</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={applyBatch}>
              应用到所选
            </Button>
            <span className="text-muted-foreground ml-auto text-xs">
              共声明 {declaredCount} 项能力
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            {grouped.map(({ scope, label, domains }) => (
              <div key={scope} className={protocolScopeStyles(scope).sectionBar}>
                <div className="text-muted-foreground sticky top-0 border-b bg-muted/40 px-3 py-2 text-sm font-medium backdrop-blur-sm">
                  {label}
                </div>
                {domains.map(([domain, defs]) => (
                  <div key={`${scope}-${domain}`}>
                    <div className="text-muted-foreground bg-muted/30 px-3 py-1 text-xs font-medium">
                      {domain || "其他"}
                    </div>
                    <ul className="divide-border divide-y">
                      {defs.map((def) => {
                        const state = rows![def.key];
                        return (
                          <li
                            key={def.key}
                            className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3"
                          >
                            <input
                              type="checkbox"
                              aria-label={`选择 ${def.key}`}
                              checked={selected.has(def.key)}
                              onChange={() => toggleSelect(def.key)}
                              className="size-4"
                            />
                            <div className="min-w-48 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {def.key}
                            </span>
                                {def.display_name && (
                                  <span className="text-muted-foreground text-xs">
                                    {def.display_name}
                                  </span>
                                )}
                                {def.deprecated && (
                                  <span className="text-amber-600 text-xs">已弃用</span>
                                )}
                              </div>
                              {def.description && (
                                <div className="text-muted-foreground mt-0.5 text-xs">
                                  {def.description}
                                </div>
                              )}
                            </div>
                            <Select
                              value={state.level}
                              onValueChange={(v) => setRow(def.key, { level: v as RowLevel })}
                            >
                              <SelectTrigger size="sm" className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unset">未声明</SelectItem>
                                <SelectItem value="full">full</SelectItem>
                                <SelectItem value="limited">limited</SelectItem>
                                <SelectItem value="unsupported">unsupported</SelectItem>
                              </SelectContent>
                            </Select>
                            {state.level === "limited" && (
                              <Input
                                value={state.limits}
                                onChange={(e) => setRow(def.key, { limits: e.target.value })}
                                placeholder='{"max_effort":"high"}'
                                className="w-56 font-mono"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {limitsError && (
            <p className="text-destructive text-sm">{limitsError}</p>
          )}
          <p className="text-muted-foreground text-xs">
            limits 仅 limited 档位填写（如 reasoning.effort 上限），仅作展示记录，不参与运行时判定。
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={validateAndSave} disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {mutation.isPending ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
