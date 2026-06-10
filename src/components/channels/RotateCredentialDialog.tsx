import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { rotateChannelCredential, type Channel } from "@/lib/api/channels";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

// 受控弹窗：内层表单随 open 挂载/卸载，重新打开自动清空上次输入。
export function RotateCredentialDialog({
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
      <DialogContent>
        {open && (
          <RotateForm channel={channel} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RotateForm({
  channel,
  onDone,
}: {
  channel: Channel;
  onDone: () => void;
}) {
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: () =>
      rotateChannelCredential({ id: channel.id, credential: credential.trim() }),
    onSuccess: () => {
      toast.success(`已轮换「${channel.name}」的凭据`);
      onDone();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (credential.trim() === "") {
      setError("凭据不能为空");
      return;
    }
    setError(undefined);
    mutation.mutate();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>轮换凭据</DialogTitle>
        <DialogDescription>
          为「{channel.name}」写入新的上游凭据；旧凭据立即失效，且不可回读。
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="new_credential">新凭据</FieldLabel>
          <Input
            id="new_credential"
            type="password"
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder="sk-..."
            aria-invalid={!!error}
            autoComplete="off"
            autoFocus
          />
          <FieldDescription>加密落库、不可回读</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {mutation.isPending ? "提交中..." : "轮换"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
