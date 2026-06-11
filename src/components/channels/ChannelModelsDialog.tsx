import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckIcon, Trash2Icon } from "lucide-react";
import {
  createChannelModel,
  deleteChannelModel,
  listChannelModels,
  updateChannelModel,
  type ChannelModel,
} from "@/lib/api/channelModels";
import { listAllModels } from "@/lib/api/models";
import { type Channel } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 受控弹窗：内容随 open 挂载/卸载，重新打开自动清空上次的添加表单。
export function ChannelModelsDialog({
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
      <DialogContent className="sm:max-w-2xl">
        {open && <ChannelModelsManager channel={channel} />}
      </DialogContent>
    </Dialog>
  );
}

function ChannelModelsManager({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const bindingsKey = ["channel-models", channel.id];

  const bindingsQuery = useQuery({
    queryKey: bindingsKey,
    queryFn: () => listChannelModels(channel.id),
  });

  const modelsQuery = useQuery({
    queryKey: ["models", "options", "enabled"],
    queryFn: () => listAllModels("enabled"),
  });

  const bindings = bindingsQuery.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: bindingsKey });

  // 已绑定的模型从下拉里排除，避免触发唯一约束（409）。
  const boundModelIds = useMemo(
    () => new Set((bindingsQuery.data ?? []).map((b) => b.model_id)),
    [bindingsQuery.data],
  );
  const availableModels = (modelsQuery.data ?? []).filter(
    (m) => !boundModelIds.has(m.id),
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>管理模型</DialogTitle>
        <DialogDescription>
          为「{channel.name}」挂载可服务的模型，并设置转发到上游时使用的模型名。
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <AddBindingForm
          channelId={channel.id}
          availableModels={availableModels}
          modelsLoading={modelsQuery.isPending}
          onAdded={invalidate}
        />

        {bindingsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{bindingsQuery.error.message}</AlertDescription>
          </Alert>
        ) : bindingsQuery.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : bindings.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            还没有绑定任何模型
          </p>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {bindings.map((b) => (
              <BindingRow
                key={b.id}
                channelId={channel.id}
                binding={b}
                onChanged={invalidate}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function AddBindingForm({
  channelId,
  availableModels,
  modelsLoading,
  onAdded,
}: {
  channelId: number;
  availableModels: { id: number; model_id: string; display_name: string }[];
  modelsLoading: boolean;
  onAdded: () => void;
}) {
  const [modelId, setModelId] = useState("");
  const [upstream, setUpstream] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createChannelModel({
        channelId,
        model_id: Number(modelId),
        upstream_model: upstream.trim(),
        status: "enabled",
      }),
    onSuccess: (created) => {
      toast.success(`已绑定「${created.model_external_id}」`);
      setModelId("");
      setUpstream("");
      onAdded();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const canSubmit = Number(modelId) > 0 && upstream.trim() !== "";

  return (
    <div className="bg-muted/40 flex flex-wrap items-end gap-3 rounded-md border p-3">
      <Field className="min-w-44 flex-1">
        <FieldLabel htmlFor="bind_model">模型</FieldLabel>
        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger id="bind_model" className="w-full">
            <SelectValue
              placeholder={
                modelsLoading
                  ? "加载中…"
                  : availableModels.length === 0
                    ? "没有可绑定的模型"
                    : "选择模型"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.display_name}（{m.model_id}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="min-w-44 flex-1">
        <FieldLabel htmlFor="bind_upstream">上游模型名</FieldLabel>
        <Input
          id="bind_upstream"
          value={upstream}
          onChange={(e) => setUpstream(e.target.value)}
          placeholder="转发给上游的模型名"
        />
      </Field>

      <Button
        type="button"
        disabled={!canSubmit || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending && <Spinner data-icon="inline-start" />}
        添加
      </Button>
    </div>
  );
}

function BindingRow({
  channelId,
  binding,
  onChanged,
}: {
  channelId: number;
  binding: ChannelModel;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(binding.upstream_model);

  const updateMutation = useMutation({
    mutationFn: (vars: { upstream_model: string; status: string }) =>
      updateChannelModel({
        channelId,
        modelId: binding.model_id,
        upstream_model: vars.upstream_model,
        status: vars.status,
      }),
    onSuccess: () => onChanged(),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteChannelModel(channelId, binding.model_id),
    onSuccess: () => {
      toast.success(`已移除「${binding.model_external_id}」`);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const enabled = binding.status === "enabled";
  const trimmed = draft.trim();
  const dirty = trimmed !== "" && trimmed !== binding.upstream_model;
  const busy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-40 flex-1">
        <div className="font-medium">{binding.model_display_name}</div>
        <div className="text-muted-foreground text-xs">
          {binding.model_external_id}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="上游模型名"
          className="h-8 w-44"
        />
        {dirty && (
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="保存上游模型名"
            disabled={busy}
            onClick={() =>
              updateMutation.mutate({
                upstream_model: trimmed,
                status: binding.status,
              })
            }
          >
            <CheckIcon />
          </Button>
        )}
      </div>

      <Switch
        checked={enabled}
        disabled={busy}
        onCheckedChange={(next) =>
          updateMutation.mutate({
            upstream_model: binding.upstream_model,
            status: next ? "enabled" : "disabled",
          })
        }
        aria-label={`切换 ${binding.model_external_id} 状态`}
      />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="移除绑定"
        disabled={busy}
        onClick={() => deleteMutation.mutate()}
      >
        <Trash2Icon className="text-destructive" />
      </Button>
    </li>
  );
}
