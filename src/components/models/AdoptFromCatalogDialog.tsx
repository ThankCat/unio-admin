import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  createModelFromCatalog,
  getCatalogEntry,
  type CatalogCapabilityHint,
  type CatalogEntry,
  type CatalogEntryDetail,
} from "@/lib/api/modelCatalog";
import { listCapabilityKeys, type SupportLevel } from "@/lib/api/capability";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

// 去掉 lab/ 前缀，作为 model_id 默认值（阶段 14 Q1）。
function strippedModelID(canonicalID: string): string {
  const idx = canonicalID.indexOf("/");
  return idx >= 0 ? canonicalID.slice(idx + 1) : canonicalID;
}

// 从目录采纳：预填 model_id（去前缀）/元数据/能力清单，全部可改后原子创建。
export function AdoptFromCatalogDialog({
  entry,
  children,
}: {
  entry: CatalogEntry;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["model-catalog-entry", entry.canonical_id],
    queryFn: () => getCatalogEntry(entry.canonical_id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>采纳为模型</DialogTitle>
          <DialogDescription>
            来自目录 <span className="font-mono">{entry.canonical_id}</span>
            ，预填值可改；提交后创建一个可独立编辑的运营模型并与目录关联（用于追更）。
          </DialogDescription>
        </DialogHeader>

        {detailQuery.isPending ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            <Spinner data-icon="inline-start" />
            加载目录条目...
          </div>
        ) : detailQuery.isError ? (
          <p className="text-destructive py-8 text-center text-sm">
            {apiErrorMessage(detailQuery.error)}
          </p>
        ) : (
          // 详情加载完才挂载表单：能力初值直接来自 props，无需 effect 同步。
          <AdoptForm
            entry={entry}
            detail={detailQuery.data}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AdoptForm({
  entry,
  detail,
  onDone,
}: {
  entry: CatalogEntry;
  detail: CatalogEntryDetail;
  onDone: () => void;
}) {
  const [modelId, setModelId] = useState(strippedModelID(entry.canonical_id));
  const [displayName, setDisplayName] = useState(entry.display_name);
  const [ownedBy, setOwnedBy] = useState(entry.lab);
  const [status, setStatus] = useState("disabled");
  const [caps, setCaps] = useState<CatalogCapabilityHint[]>(detail.capabilities);
  const [modelIdError, setModelIdError] = useState("");

  const queryClient = useQueryClient();
  const keysQuery = useQuery({
    queryKey: ["capability-keys"],
    queryFn: listCapabilityKeys,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createModelFromCatalog({
        canonical_id: entry.canonical_id,
        model_id: modelId.trim(),
        display_name: displayName.trim(),
        owned_by: ownedBy.trim(),
        status,
        context_window_tokens: entry.context_window_tokens,
        max_output_tokens: entry.max_output_tokens,
        input_price_usd_per_million_tokens: entry.input_price_usd_per_million_tokens,
        output_price_usd_per_million_tokens: entry.output_price_usd_per_million_tokens,
        release_date: entry.release_date,
        capabilities: caps,
      }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model-catalog"] });
      toast.success(`已采纳为模型「${saved.model_id}」`);
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!MODEL_ID_PATTERN.test(modelId.trim())) {
      setModelIdError("字母或数字开头，仅含字母、数字与 . _ : -，长度 1–128");
      return;
    }
    setModelIdError("");
    mutation.mutate();
  }

  const availableKeys = (keysQuery.data ?? []).filter(
    (k) => !caps.some((c) => c.capability_key === k),
  );

  function addCapability(key: string) {
    setCaps((prev) => [
      ...prev,
      { capability_key: key, support_level: "full", limits: null },
    ]);
  }
  function setCapLevel(key: string, level: SupportLevel) {
    setCaps((prev) =>
      prev.map((c) =>
        c.capability_key === key ? { ...c, support_level: level } : c,
      ),
    );
  }
  function removeCap(key: string) {
    setCaps((prev) => prev.filter((c) => c.capability_key !== key));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!modelIdError}>
            <FieldLabel htmlFor="adopt_model_id">对外模型 ID</FieldLabel>
            <Input
              id="adopt_model_id"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              aria-invalid={!!modelIdError}
              autoFocus
            />
            <FieldDescription>客户调用名，创建后不可改</FieldDescription>
            <FieldError>{modelIdError}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="adopt_display_name">展示名</FieldLabel>
            <Input
              id="adopt_display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="adopt_owned_by">归属方</FieldLabel>
            <Input
              id="adopt_owned_by"
              value={ownedBy}
              onChange={(e) => setOwnedBy(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="adopt_status">状态</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="adopt_status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">启用</SelectItem>
                <SelectItem value="disabled">停用</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>能力（可增删改）</FieldLabel>
          <div className="flex flex-col gap-2">
            {caps.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                无能力提示，可在下方新增。
              </p>
            ) : (
              <ul className="divide-border divide-y rounded-md border">
                {caps.map((c) => (
                  <li
                    key={c.capability_key}
                    className="flex items-center gap-2 p-2"
                  >
                    <span className="flex-1 font-mono text-sm">
                      {c.capability_key}
                    </span>
                    <Select
                      value={c.support_level}
                      onValueChange={(v) =>
                        setCapLevel(c.capability_key, v as SupportLevel)
                      }
                    >
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">full</SelectItem>
                        <SelectItem value="limited">limited</SelectItem>
                        <SelectItem value="unsupported">unsupported</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="移除"
                      onClick={() => removeCap(c.capability_key)}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {availableKeys.length > 0 && (
              <Select value="" onValueChange={addCapability}>
                <SelectTrigger size="sm" className="w-full">
                  <span className="text-muted-foreground flex items-center gap-1 text-sm">
                    <PlusIcon className="size-4" />
                    新增能力
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((k) => (
                    <SelectItem key={k} value={k} className="font-mono">
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Field>
      </FieldGroup>

      <DialogFooter className="mt-6">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            取消
          </Button>
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {mutation.isPending ? "采纳中..." : "采纳"}
        </Button>
      </DialogFooter>
    </form>
  );
}
