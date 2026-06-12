import { useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  deleteChannelOverride,
  listCapabilityKeys,
  listChannelOverrides,
  setChannelOverride,
  type ChannelOverride,
} from "@/lib/api/capability";
import { type Channel } from "@/lib/api/channels";
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
import { SupportLevelBadge } from "@/components/capability/shared";
import { formatLimits, parseLimitsInput } from "@/lib/capability/limits";

type OverrideLevel = "limited" | "unsupported";

export function ChannelCapabilityOverridesDialog({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {open && <OverrideManager channel={channel} />}
      </DialogContent>
    </Dialog>
  );
}

function OverrideManager({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ChannelOverride | "new" | null>(null);
  const overridesKey = ["channel-overrides", channel.id];

  const overridesQuery = useQuery({
    queryKey: overridesKey,
    queryFn: () => listChannelOverrides(channel.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: overridesKey });
  const overrides = overridesQuery.data ?? [];

  if (editing) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>
            {editing === "new" ? "新增能力收紧" : "编辑能力收紧"}
          </DialogTitle>
          <DialogDescription>
            为「{channel.name}」收紧某能力（只能减：limited / unsupported）。这是在模型能力基础上的渠道级覆盖（Layer 3）。
          </DialogDescription>
        </DialogHeader>
        <OverrideForm
          channelId={channel.id}
          editing={editing === "new" ? null : editing}
          existingKeys={overrides.map((o) => o.capability_key)}
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
        <DialogTitle>能力收紧</DialogTitle>
        <DialogDescription>
          「{channel.name}」的渠道级能力收紧策略。只能在模型已声明能力上做减法，不能放开模型本身不支持的能力。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div>
          <Button size="sm" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            新增收紧
          </Button>
        </div>

        {overridesQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{overridesQuery.error.message}</AlertDescription>
          </Alert>
        ) : overridesQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : overrides.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            还没有任何能力收紧策略
          </p>
        ) : (
          <ul className="divide-border max-h-[60vh] divide-y overflow-y-auto rounded-md border">
            {overrides.map((o) => (
              <OverrideRow
                key={o.capability_key}
                channelId={channel.id}
                override={o}
                onEdit={() => setEditing(o)}
                onChanged={invalidate}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function OverrideRow({
  channelId,
  override,
  onEdit,
  onChanged,
}: {
  channelId: number;
  override: ChannelOverride;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const mutation = useMutation({
    mutationFn: () => deleteChannelOverride(channelId, override.capability_key),
    onSuccess: () => {
      toast.success("已移除收紧");
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="min-w-40 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">
            {override.capability_key}
          </span>
          <SupportLevelBadge level={override.support_level} />
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {override.reason ? override.reason : "（无原因说明）"}
          {override.limits != null && ` · ${formatLimits(override.limits)}`}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="编辑" onClick={onEdit}>
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="移除"
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

function OverrideForm({
  channelId,
  editing,
  existingKeys,
  onCancel,
  onSaved,
}: {
  channelId: number;
  editing: ChannelOverride | null;
  existingKeys: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState(editing?.capability_key ?? "");
  const [level, setLevel] = useState<OverrideLevel>(
    (editing?.support_level as OverrideLevel) ?? "unsupported",
  );
  const [reason, setReason] = useState(editing?.reason ?? "");
  const [limits, setLimits] = useState(
    editing?.limits != null ? formatLimits(editing.limits) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const keysQuery = useQuery({
    queryKey: ["capability-keys"],
    queryFn: listCapabilityKeys,
  });

  const mutation = useMutation({
    mutationFn: () =>
      setChannelOverride({
        channelId,
        capability_key: key,
        support_level: level,
        limits: parseLimitsInput(limits),
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("已保存收紧");
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

  const keyOptions = (keysQuery.data ?? []).filter(
    (k) => editing != null || !existingKeys.includes(k),
  );

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.capability_key}>
          <FieldLabel htmlFor="ov_key">能力 key</FieldLabel>
          {editing ? (
            <Input id="ov_key" value={key} readOnly className="font-mono" />
          ) : (
            <Select value={key} onValueChange={setKey}>
              <SelectTrigger id="ov_key" className="w-full font-mono">
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
          <FieldLabel htmlFor="ov_level">收紧到</FieldLabel>
          <Select
            value={level}
            onValueChange={(v) => setLevel(v as OverrideLevel)}
          >
            <SelectTrigger id="ov_level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="limited">limited（受 limits 约束）</SelectItem>
              <SelectItem value="unsupported">unsupported（关闭）</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>渠道层只能减；放不开模型本身不支持的能力。</FieldDescription>
        </Field>

        <Field data-invalid={!!errors.limits}>
          <FieldLabel htmlFor="ov_limits">limits（JSON，可选）</FieldLabel>
          <Input
            id="ov_limits"
            value={limits}
            onChange={(e) => setLimits(e.target.value)}
            placeholder='{"max_effort":"high"}'
            className="font-mono"
            aria-invalid={!!errors.limits}
          />
          <FieldError>{errors.limits}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="ov_reason">原因（可选）</FieldLabel>
          <Input
            id="ov_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="如：上游不支持 web_search"
          />
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
