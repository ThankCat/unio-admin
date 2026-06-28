import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import {
  createCapabilityKey,
  deleteCapabilityKey,
  listCapabilityKeys,
  updateCapabilityKey,
  type CapabilityKeyDef,
  type ProtocolScope,
} from "@/lib/api/capability";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/client";
import {
  PROTOCOL_SCOPE_ORDER,
  filterKeysByProtocolScope,
  normalizeProtocolScope,
  protocolScopeLabel,
  type ProtocolScopeFilter,
} from "@/lib/capability/protocolScope";
import { ConfigurableDataTable } from "@/components/data-table";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import {
  CAPABILITY_DICTIONARY_COLUMN_LABELS,
  capabilityDictionaryColumns,
} from "@/components/detail-tables/capability-dictionary-columns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CapabilityDictionaryTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CapabilityKeyDef | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CapabilityKeyDef | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ProtocolScopeFilter>("all");

  const keysQuery = useQuery({
    queryKey: ["capability-keys", "v2"],
    queryFn: listCapabilityKeys,
  });

  const rows = useMemo(() => {
    const filtered = filterKeysByProtocolScope(keysQuery.data ?? [], scopeFilter);
    return [...filtered].sort((a, b) => {
      if (scopeFilter === "all") {
        const scopeCmp =
          PROTOCOL_SCOPE_ORDER.indexOf(normalizeProtocolScope(a.protocol_scope)) -
          PROTOCOL_SCOPE_ORDER.indexOf(normalizeProtocolScope(b.protocol_scope));
        if (scopeCmp !== 0) return scopeCmp;
      }
      return a.sort_order - b.sort_order || a.key.localeCompare(b.key);
    });
  }, [keysQuery.data, scopeFilter]);

  const deleteMutation = useMutation({
    mutationFn: deleteCapabilityKey,
    onSuccess: () => {
      toast.success("已删除能力 key");
      queryClient.invalidateQueries({ queryKey: ["capability-keys"] });
      setPendingDelete(null);
    },
    onError: (err) => {
      if (apiErrorStatus(err) === 409) {
        toast.error("该 key 已被模型引用，请改为标记 deprecated");
        return;
      }
      toast.error(apiErrorMessage(err));
    },
  });

  const columns = useMemo(
    () =>
      capabilityDictionaryColumns({
        onEdit: (row) => {
          setEditing(row);
          setFormOpen(true);
        },
        onDelete: (row) => setPendingDelete(row),
      }),
    [],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleFormOpenChange(open: boolean) {
    setFormOpen(open);
    if (!open) setEditing(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          能力 key 字典是合法 key 的唯一真源；新增能力只需在此维护，无需改代码。
        </p>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon data-icon="inline-start" />
          新建 key
        </Button>
      </div>

      {keysQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{apiErrorMessage(keysQuery.error)}</AlertDescription>
        </Alert>
      ) : keysQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
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

          <ConfigurableDataTable
            storageKey="capability:dictionary"
            data={rows}
            columns={columns}
            columnLabels={CAPABILITY_DICTIONARY_COLUMN_LABELS}
            layoutMode="content"
            bordered
            getRowId={(row) => row.key}
            toolbarStart={
              <span className="text-muted-foreground text-xs">共 {rows.length} 项</span>
            }
          />
        </div>
      )}

      <CapabilityKeyFormDialog
        key={editing?.key ?? "new"}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        editing={editing}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["capability-keys"] });
          setFormOpen(false);
        }}
      />

      <ConfirmActionDialog
        open={pendingDelete != null}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setPendingDelete(null);
        }}
        title="删除能力 key"
        description={
          pendingDelete
            ? `确认删除「${pendingDelete.key}」？若已被模型引用将无法删除，请改为标记 deprecated。`
            : undefined
        }
        confirmLabel="确认删除"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.key);
        }}
      />
    </div>
  );
}

function CapabilityKeyFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CapabilityKeyDef | null;
  onSaved: () => void;
}) {
  const isEdit = editing != null;
  const [key, setKey] = useState(editing?.key ?? "");
  const [domain, setDomain] = useState(editing?.domain ?? "");
  const [displayName, setDisplayName] = useState(editing?.display_name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
  const [deprecated, setDeprecated] = useState(editing?.deprecated ? "true" : "false");
  const [protocolScope, setProtocolScope] = useState<ProtocolScope>(
    editing?.protocol_scope === "both" || !editing
      ? "shared"
      : editing.protocol_scope,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const sort = Number.parseInt(sortOrder, 10) || 0;
      const body = {
        domain: domain.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        sort_order: sort,
        deprecated: deprecated === "true",
        protocol_scope: protocolScope,
      };
      if (isEdit) {
        return updateCapabilityKey(editing!.key, body);
      }
      return createCapabilityKey({ key: key.trim(), ...body });
    },
    onSuccess: () => {
      toast.success(isEdit ? "已更新" : "已创建");
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑能力 key" : "新建能力 key"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">key</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEdit}
              placeholder="tools.function"
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">domain</label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">协议归属</label>
              <Select
                value={protocolScope}
                onValueChange={(v) => setProtocolScope(v as ProtocolScope)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOL_SCOPE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {protocolScopeLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">展示名</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">中文描述</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">排序</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">deprecated</label>
              <Select value={deprecated} onValueChange={setDeprecated}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">否</SelectItem>
                  <SelectItem value="true">是</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
