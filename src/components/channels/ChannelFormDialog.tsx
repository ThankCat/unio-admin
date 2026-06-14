import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createChannel,
  updateChannel,
  listAdapterKeys,
  type Channel,
} from "@/lib/api/channels";
import { listAllProviders } from "@/lib/api/providers";
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

// 受控弹窗：open 由父组件管理。表单状态放在内层 ChannelForm，
// Radix 关闭即卸载，重新打开时随之重新挂载、用 useState 初值预填，无需 effect 重置。
export function ChannelFormDialog({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: Channel;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ChannelForm channel={channel} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FieldErrors {
  provider_id?: string;
  name?: string;
  adapter_key?: string;
  base_url?: string;
  credential?: string;
  priority?: string;
  timeout_ms?: string;
}

function ChannelForm({
  channel,
  onDone,
}: {
  channel?: Channel;
  onDone: () => void;
}) {
  const isEdit = !!channel;
  const queryClient = useQueryClient();

  const [providerId, setProviderId] = useState(
    channel ? String(channel.provider_id) : "",
  );
  const [name, setName] = useState(channel?.name ?? "");
  const initialProtocol = channel?.protocol ?? "openai";
  const [protocol, setProtocol] = useState(initialProtocol);
  // adapter_key 留空时后端默认取协议同名的忠实透传 adapter，故初值跟随协议默认。
  const [adapterKey, setAdapterKey] = useState(
    channel?.adapter_key ?? initialProtocol,
  );
  const [baseUrl, setBaseUrl] = useState(channel?.base_url ?? "");
  const [credential, setCredential] = useState("");
  const [status, setStatus] = useState(channel?.status ?? "enabled");
  const [priority, setPriority] = useState(String(channel?.priority ?? 0));
  const [timeoutMs, setTimeoutMs] = useState(
    channel?.timeout_ms != null ? String(channel.timeout_ms) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  // 仅创建时需要服务商下拉；编辑时所属服务商不可改，不必拉取。
  const providersQuery = useQuery({
    queryKey: ["providers", "options"],
    queryFn: listAllProviders,
    enabled: !isEdit,
  });

  // 可选 adapter_key 由后端按已注册能力枚举；仅创建时需要（编辑不可改 adapter）。
  const adapterKeysQuery = useQuery({
    queryKey: ["channels", "adapter-keys"],
    queryFn: listAdapterKeys,
    enabled: !isEdit,
  });

  // 按当前协议过滤出可选 adapter_key（协议变更时联动）。
  const adapterOptions = (adapterKeysQuery.data ?? []).filter(
    (o) => o.protocol === protocol,
  );

  // 协议切换时把 adapter_key 重置为新协议的默认项（忠实透传），避免残留跨协议的非法值。
  function handleProtocolChange(next: string) {
    setProtocol(next);
    const opts = (adapterKeysQuery.data ?? []).filter(
      (o) => o.protocol === next,
    );
    const fallback = opts.find((o) => o.is_default) ?? opts[0];
    setAdapterKey(fallback ? fallback.adapter_key : next);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const timeout = timeoutMs.trim() === "" ? null : Number(timeoutMs);
      const prio = Number(priority);
      if (channel) {
        return updateChannel({
          id: channel.id,
          name: name.trim(),
          base_url: baseUrl.trim(),
          status,
          priority: prio,
          timeout_ms: timeout,
        });
      }
      return createChannel({
        provider_id: Number(providerId),
        name: name.trim(),
        protocol,
        adapter_key: adapterKey.trim(),
        base_url: baseUrl.trim(),
        credential: credential.trim(),
        status,
        priority: prio,
        timeout_ms: timeout,
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success(
        isEdit ? `已保存「${saved.name}」` : `已创建渠道「${saved.name}」`,
      );
      onDone();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!isEdit && !(Number(providerId) > 0)) {
      next.provider_id = "请选择服务商";
    }
    if (name.trim() === "") {
      next.name = "名称不能为空";
    }
    if (!isEdit && adapterKey.trim() === "") {
      next.adapter_key = "adapter_key 不能为空";
    }
    if (!isValidHttpUrl(baseUrl.trim())) {
      next.base_url = "请输入合法的 http(s) 地址";
    }
    if (!isEdit && credential.trim() === "") {
      next.credential = "凭据不能为空";
    }
    const prio = Number(priority);
    if (!Number.isInteger(prio) || prio < 0) {
      next.priority = "优先级需为 ≥ 0 的整数";
    }
    if (timeoutMs.trim() !== "") {
      const t = Number(timeoutMs);
      if (!Number.isInteger(t) || t <= 0) {
        next.timeout_ms = "超时需为正整数（毫秒）";
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "编辑渠道" : "新建渠道"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "所属服务商、协议、adapter 与凭据不在此修改（凭据请用「轮换凭据」）。"
            : "凭据将加密落库、不可回读；协议与 adapter 复合键须在当前进程注册。"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field data-invalid={!!errors.provider_id}>
            <FieldLabel htmlFor="provider">服务商</FieldLabel>
            {isEdit ? (
              <Input
                id="provider"
                value={`${channel.provider_name || "未知"}（#${channel.provider_id}）`}
                disabled
              />
            ) : (
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger
                  id="provider"
                  className="w-full"
                  aria-invalid={!!errors.provider_id}
                >
                  <SelectValue
                    placeholder={
                      providersQuery.isPending ? "加载中…" : "选择服务商"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(providersQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}（{p.slug}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isEdit ? (
              <FieldDescription>所属服务商创建后不可修改</FieldDescription>
            ) : (
              <FieldError>{errors.provider_id}</FieldError>
            )}
          </Field>

          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">名称</FieldLabel>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="primary"
              aria-invalid={!!errors.name}
              autoFocus
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="protocol">协议</FieldLabel>
              {isEdit ? (
                <Input id="protocol" value={channel.protocol} disabled />
              ) : (
                <Select value={protocol} onValueChange={handleProtocolChange}>
                  <SelectTrigger id="protocol" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">openai</SelectItem>
                    <SelectItem value="anthropic">anthropic</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field data-invalid={!!errors.adapter_key}>
              <FieldLabel htmlFor="adapter_key">adapter_key</FieldLabel>
              {isEdit ? (
                <Input id="adapter_key" value={channel.adapter_key} disabled />
              ) : (
                <Select value={adapterKey} onValueChange={setAdapterKey}>
                  <SelectTrigger
                    id="adapter_key"
                    className="w-full"
                    aria-invalid={!!errors.adapter_key}
                  >
                    <SelectValue
                      placeholder={
                        adapterKeysQuery.isPending ? "加载中…" : "选择 adapter"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {adapterOptions.map((o) => (
                      <SelectItem key={o.adapter_key} value={o.adapter_key}>
                        {o.adapter_key}
                        {o.is_default ? "（默认 · 忠实透传）" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isEdit ? (
                <FieldDescription>创建后不可修改</FieldDescription>
              ) : (
                <FieldError>{errors.adapter_key}</FieldError>
              )}
            </Field>
          </div>

          <Field data-invalid={!!errors.base_url}>
            <FieldLabel htmlFor="base_url">上游地址</FieldLabel>
            <Input
              id="base_url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              aria-invalid={!!errors.base_url}
            />
            <FieldError>{errors.base_url}</FieldError>
          </Field>

          {!isEdit && (
            <Field data-invalid={!!errors.credential}>
              <FieldLabel htmlFor="credential">凭据</FieldLabel>
              <Input
                id="credential"
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="sk-..."
                aria-invalid={!!errors.credential}
                autoComplete="off"
              />
              <FieldDescription>加密落库、不可回读</FieldDescription>
              <FieldError>{errors.credential}</FieldError>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.priority}>
              <FieldLabel htmlFor="priority">优先级</FieldLabel>
              <Input
                id="priority"
                type="number"
                min={0}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                aria-invalid={!!errors.priority}
              />
              <FieldError>{errors.priority}</FieldError>
            </Field>

            <Field data-invalid={!!errors.timeout_ms}>
              <FieldLabel htmlFor="timeout_ms">超时（毫秒）</FieldLabel>
              <Input
                id="timeout_ms"
                type="number"
                min={1}
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
                placeholder="留空表示不单独设置"
                aria-invalid={!!errors.timeout_ms}
              />
              <FieldError>{errors.timeout_ms}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="status">状态</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">启用</SelectItem>
                <SelectItem value="disabled">停用</SelectItem>
              </SelectContent>
            </Select>
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
            {mutation.isPending ? "保存中..." : isEdit ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
