import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProvider, type Provider } from "@/lib/api/providers";
import { apiErrorMessage } from "@/lib/api/client";
import { Switch } from "@/components/ui/switch";

export function ProviderStatusToggle({ provider }: { provider: Provider }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateProvider,
    // 服务端分页后，列表缓存按 {status,q,page} 分片，乐观改单片缓存不可靠；
    // 切状态又会让条目从当前 tab 移走，直接失效重拉最简单可靠。
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const enabled = provider.status === "enabled";

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={enabled}
        disabled={mutation.isPending}
        onCheckedChange={(next) =>
          mutation.mutate({
            id: provider.id,
            name: provider.name,
            status: next ? "enabled" : "disabled",
          })
        }
        aria-label={`切换 ${provider.name} 状态`}
      />
      <span className="text-muted-foreground text-sm tabular-nums">
        {enabled ? "启用" : "停用"}
      </span>
    </div>
  );
}
