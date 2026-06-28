import { Button } from "@/components/ui/button";
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

export type StatusEntityLabel = "模型" | "渠道" | "服务商" | "线路";

export function StatusChangeConfirmDialog({
  open,
  onOpenChange,
  entityLabel,
  entityName,
  enabling,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: StatusEntityLabel;
  entityName: string;
  enabling: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const action = enabling ? "启用" : "停用";

  const description = enabling
    ? `确认启用「${entityName}」？启用后将按当前绑定与价格配置参与路由。`
    : `确认停用「${entityName}」？停用后不再接收新请求。`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action}
            {entityLabel}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={enabling ? "default" : "destructive"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? `${action}中…` : `确认${action}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
