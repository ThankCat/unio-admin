import { useState, type FormEvent, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  deleteModelCapability,
  listCapabilityKeys,
  listModelCapabilities,
  setModelCapability,
  type ModelCapability,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SupportLevelBadge,
  CapabilitySourceBadge,
} from "@/components/capability/shared";
import { formatLimits, parseLimitsInput } from "@/lib/capability/limits";

// children-trigger 弹窗：与 PricesDialog 一致，自管 open 状态，便于嵌进操作列。
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
      <DialogContent className="sm:max-w-3xl">
        {open && <CapabilityManager model={model} />}
      </DialogContent>
    </Dialog>
  );
}

function CapabilityManager({ model }: { model: Model }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ModelCapability | "new" | null>(null);
  const capsKey = ["model-capabilities", model.id];

  const capsQuery = useQuery({
    queryKey: capsKey,
    queryFn: () => listModelCapabilities(model.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: capsKey });
  const caps = capsQuery.data ?? [];

  if (editing) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{editing === "new" ? "新增能力" : "编辑能力"}</DialogTitle>
          <DialogDescription>
            为「{model.display_name}」手工声明能力（source=manual）；models.dev 同步只在新模型首次落库时写粗能力，手工覆盖不会被同步回滚。
          </DialogDescription>
        </DialogHeader>
        <CapabilityForm
          modelId={model.id}
          editing={editing === "new" ? null : editing}
          existingKeys={caps.map((c) => c.capability_key)}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>模型能力</DialogTitle>
        <DialogDescription>
          「{model.display_name}」的能力声明（Layer 2）。渠道侧只能在此基础上做减法（能力收紧）。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div>
          <Button size="sm" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            新增能力
          </Button>
        </div>

        {capsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{capsQuery.error.message}</AlertDescription>
          </Alert>
        ) : capsQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : caps.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            还没有声明任何能力
          </p>
        ) : (
          <ul className="divide-border max-h-[60vh] divide-y overflow-y-auto rounded-md border">
            {caps.map((c) => (
              <CapabilityRow
                key={c.capability_key}
                modelId={model.id}
                cap={c}
                onEdit={() => setEditing(c)}
                onChanged={invalidate}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function CapabilityRow({
  modelId,
  cap,
  onEdit,
  onChanged,
}: {
  modelId: number;
  cap: ModelCapability;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => deleteModelCapability(modelId, cap.capability_key),
    onSuccess: () => {
      toast.success("已删除能力");
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="min-w-40 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">
            {cap.capability_key}
          </span>
          <SupportLevelBadge level={cap.support_level} />
          <CapabilitySourceBadge source={cap.source} />
        </div>
        {cap.limits != null && (
          <div className="text-muted-foreground mt-1 font-mono text-xs">
            {formatLimits(cap.limits)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="编辑" onClick={onEdit}>
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="删除"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

interface FieldErrors {
  capability_key?: string;
  limits?: string;
}

function CapabilityForm({
  modelId,
  editing,
  existingKeys,
  onCancel,
  onSaved,
}: {
  modelId: number;
  editing: ModelCapability | null;
  existingKeys: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState(editing?.capability_key ?? "");
  const [level, setLevel] = useState<SupportLevel>(
    editing?.support_level ?? "full",
  );
  const [limits, setLimits] = useState(
    editing?.limits != null ? formatLimits(editing.limits) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const keysQuery = useQuery({
    queryKey: ["capability-keys"],
    queryFn: listCapabilityKeys,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = parseLimitsInput(limits);
      return setModelCapability({
        modelId,
        capability_key: key,
        support_level: level,
        limits: parsed,
      });
    },
    onSuccess: () => {
      toast.success("已保存能力");
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function validate(): boolean {
    const next: FieldErrors = {};
    if (key.trim() === "") next.capability_key = "请选择能力 key";
    if (limits.trim() !== "") {
      if (level !== "limited") {
        next.limits = "仅 limited 级别允许 limits";
      } else {
        try {
          JSON.parse(limits);
        } catch {
          next.limits = "limits 需为合法 JSON";
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  // 新增时可选未声明的 key；编辑时锁定 key。
  const keyOptions = (keysQuery.data ?? []).filter(
    (k) => editing != null || !existingKeys.includes(k),
  );

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.capability_key}>
          <FieldLabel htmlFor="cap_key">能力 key</FieldLabel>
          {editing ? (
            <Input id="cap_key" value={key} readOnly className="font-mono" />
          ) : (
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger id="cap_key" className="w-full font-mono">
                <SelectValue placeholder="选择能力 key" />
              </SelectTrigger>
              <SelectContent>
                {keyOptions.map((k) => (
                  <SelectItem key={k} value={k} className="font-mono">
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError>{errors.capability_key}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="cap_level">支持级别</FieldLabel>
          <Select
            value={level}
            onValueChange={(v) => setLevel(v as SupportLevel)}
          >
            <SelectTrigger id="cap_level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">full（完整支持）</SelectItem>
              <SelectItem value="limited">limited（受 limits 约束）</SelectItem>
              <SelectItem value="unsupported">unsupported（不支持）</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!errors.limits}>
          <FieldLabel htmlFor="cap_limits">limits（JSON，可选）</FieldLabel>
          <Input
            id="cap_limits"
            value={limits}
            onChange={(e) => setLimits(e.target.value)}
            placeholder='{"max_effort":"high"}'
            className="font-mono"
            aria-invalid={!!errors.limits}
          />
          <FieldDescription>仅 limited 级别可填，如 reasoning.effort 的上限。</FieldDescription>
          <FieldError>{errors.limits}</FieldError>
        </Field>
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner data-icon="inline-start" />}
          {mutation.isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
