import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteChannel, type Channel } from "@/lib/api/channels";
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
} from "@/components/ui/dialog";

// 删除渠道确认弹窗：用于清理录错的脏数据。删除会级联清理该渠道自身的模型绑定、成本价与能力收紧。
// 一旦被请求/账务历史引用，后端返回 409，这里给出中文引导（改用停用）。
// 受控弹窗：与同页其它操作弹窗一致，由 ChannelsPage 的下拉菜单项控制开关。
export function DeleteChannelDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteChannel(channel.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      toast.success(`已删除渠道「${channel.name}」`);
      onOpenChange(false);
    },
    onError: (err) => {
      if (apiErrorStatus(err) === 409) {
        toast.error(
          "该渠道已被请求或账务历史引用，无法删除。请改为「停用」。",
        );
        return;
      }
      toast.error(apiErrorMessage(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除渠道</DialogTitle>
          <DialogDescription>
            将永久删除「{channel.name}」，并一并清理它的模型绑定、成本价与能力收紧配置。
            仅用于清理录错的数据；若该渠道已被使用，请改用「停用」。此操作不可逆。
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
