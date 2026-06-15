import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteModel, type Model } from "@/lib/api/models";
import { apiErrorMessage, apiErrorStatus } from "@/lib/api/client";
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
  DialogTrigger,
} from "@/components/ui/dialog";

// 删除模型确认弹窗：用于清理录错的脏数据。删除会级联清理该模型自身的售价、模型绑定、
// 成本价、能力声明与项目可见性策略。一旦被请求/账务历史引用，后端返回 409，这里给出中文引导（改用停用）。
export function DeleteModelDialog({
  model,
  children,
}: {
  model: Model;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteModel(model.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      toast.success(`已删除模型「${model.display_name}」`);
      setOpen(false);
    },
    onError: (err) => {
      if (apiErrorStatus(err) === 409) {
        toast.error(
          "该模型已被请求或账务历史引用，无法删除。请改为「停用」。",
        );
        return;
      }
      toast.error(apiErrorMessage(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除模型</DialogTitle>
          <DialogDescription>
            将永久删除「{model.display_name}」（{model.model_id}），并一并清理它的售价、
            模型绑定、成本价、能力声明与项目可见性策略。仅用于清理录错的数据；
            若该模型已被使用，请改用「停用」。此操作不可逆。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {mutation.isPending ? "删除中..." : "确认删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
