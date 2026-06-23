import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createModel, updateModel, type Model } from "@/lib/api/models";
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

// 与后端 model.modelIDPattern 保持一致：字母/数字开头，允许字母数字与 . _ : -，长度 1–128。
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

interface FieldErrors {
  model_id?: string;
  display_name?: string;
  owned_by?: string;
  max_output_tokens?: string;
}

// 同一个弹窗承担新建与编辑：传了 model 即编辑（model_id 只读），否则新建。
//
// 支持两种用法：① 传 children 作为内置触发器（自管 open）；② 传 open/onOpenChange 受控
// （供 ModelsPage「新建」下拉的「自定义」项打开，无需独立触发按钮）。
export function ModelFormDialog({
  model,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  model?: Model;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = !!model;

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ownedBy, setOwnedBy] = useState("");
  const [status, setStatus] = useState("enabled");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");
  const [contextWindow, setContextWindow] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const num = (s: string) => (s.trim() === "" ? null : Number(s));
      const str = (s: string) => (s.trim() === "" ? null : s.trim());
      const meta = {
        max_output_tokens: num(maxOutputTokens),
        context_window_tokens: num(contextWindow),
        input_price_usd_per_million_tokens: str(inputPrice),
        output_price_usd_per_million_tokens: str(outputPrice),
        release_date: str(releaseDate),
      };
      if (model) {
        return updateModel({
          id: model.id,
          display_name: displayName.trim(),
          owned_by: ownedBy.trim(),
          status,
          ...meta,
        });
      }
      return createModel({
        model_id: modelId.trim(),
        display_name: displayName.trim(),
        owned_by: ownedBy.trim(),
        status,
        ...meta,
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      toast.success(
        isEdit ? `已保存「${saved.display_name}」` : `已创建模型「${saved.display_name}」`,
      );
      setOpen(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  // 打开时按当前 model 预填（编辑）或清空（新建），并清掉上次的校验/请求状态。
  // 非受控用法（children 触发）经此回填；受控用法（无触发器）由调用方以 key 重挂载保证初值干净。
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setModelId(model?.model_id ?? "");
      setDisplayName(model?.display_name ?? "");
      setOwnedBy(model?.owned_by ?? "");
      setStatus(model?.status ?? "enabled");
      setMaxOutputTokens(
        model?.max_output_tokens != null ? String(model.max_output_tokens) : "",
      );
      setContextWindow(
        model?.context_window_tokens != null
          ? String(model.context_window_tokens)
          : "",
      );
      setInputPrice(model?.input_price_usd_per_million_tokens ?? "");
      setOutputPrice(model?.output_price_usd_per_million_tokens ?? "");
      setReleaseDate(model?.release_date ?? "");
      setErrors({});
      mutation.reset();
    }
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    // model_id 编辑时只读且已合法，只在新建时校验。
    if (!isEdit && !MODEL_ID_PATTERN.test(modelId.trim())) {
      next.model_id =
        "字母或数字开头，仅含字母、数字与 . _ : -，长度 1–128";
    }
    if (displayName.trim() === "") {
      next.display_name = "展示名不能为空";
    }
    if (ownedBy.trim() === "") {
      next.owned_by = "归属方不能为空";
    }
    if (maxOutputTokens.trim() !== "") {
      const n = Number(maxOutputTokens);
      if (!Number.isInteger(n) || n <= 0) {
        next.max_output_tokens = "需为正整数";
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑模型" : "新建模型"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "对外模型 ID（model_id）作为稳定标识不可修改。"
              : "model_id 是客户 API 调用时使用的模型名，创建后不可修改。"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!errors.model_id}>
              <FieldLabel htmlFor="model_id">对外模型 ID</FieldLabel>
              <Input
                id="model_id"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="deepseek-chat"
                aria-invalid={!!errors.model_id}
                disabled={isEdit}
                autoFocus={!isEdit}
              />
              {isEdit ? (
                <FieldDescription>创建后不可修改</FieldDescription>
              ) : (
                <FieldError>{errors.model_id}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.display_name}>
              <FieldLabel htmlFor="display_name">展示名</FieldLabel>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="DeepSeek Chat"
                aria-invalid={!!errors.display_name}
                autoFocus={isEdit}
              />
              <FieldError>{errors.display_name}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.owned_by}>
                <FieldLabel htmlFor="owned_by">归属方</FieldLabel>
                <Input
                  id="owned_by"
                  value={ownedBy}
                  onChange={(e) => setOwnedBy(e.target.value)}
                  placeholder="deepseek"
                  aria-invalid={!!errors.owned_by}
                />
                <FieldError>{errors.owned_by}</FieldError>
              </Field>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.max_output_tokens}>
                <FieldLabel htmlFor="max_output_tokens">最大输出 token</FieldLabel>
                <Input
                  id="max_output_tokens"
                  type="number"
                  min={1}
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(e.target.value)}
                  placeholder="可选"
                  aria-invalid={!!errors.max_output_tokens}
                />
                <FieldError>{errors.max_output_tokens}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="context_window_tokens">上下文长度</FieldLabel>
                <Input
                  id="context_window_tokens"
                  type="number"
                  min={1}
                  value={contextWindow}
                  onChange={(e) => setContextWindow(e.target.value)}
                  placeholder="可选（仅展示）"
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="input_price">输入价格基线</FieldLabel>
                <Input
                  id="input_price"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  placeholder="USD/百万 token"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="output_price">输出价格基线</FieldLabel>
                <Input
                  id="output_price"
                  value={outputPrice}
                  onChange={(e) => setOutputPrice(e.target.value)}
                  placeholder="USD/百万 token"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="release_date">发布日期</FieldLabel>
                <Input
                  id="release_date"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </Field>
            </div>
            <FieldDescription>
              价格基线与上下文长度仅作展示，不参与计费（计费以售价/成本价为准）。
            </FieldDescription>
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
      </DialogContent>
    </Dialog>
  );
}
