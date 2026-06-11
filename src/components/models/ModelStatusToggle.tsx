import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateModel, type Model } from "@/lib/api/models";
import { apiErrorMessage } from "@/lib/api/client";
import { Switch } from "@/components/ui/switch";

export function ModelStatusToggle({ model }: { model: Model }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateModel,
    // 列表缓存按 {status,q,page} 分片，切状态又会让条目移出当前 tab，直接失效重拉最稳。
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const enabled = model.status === "enabled";

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={enabled}
        disabled={mutation.isPending}
        onCheckedChange={(next) =>
          mutation.mutate({
            id: model.id,
            display_name: model.display_name,
            owned_by: model.owned_by,
            status: next ? "enabled" : "disabled",
            lab: model.lab,
            max_output_tokens: model.max_output_tokens,
          })
        }
        aria-label={`切换 ${model.display_name} 状态`}
      />
      <span className="text-muted-foreground text-sm tabular-nums">
        {enabled ? "启用" : "停用"}
      </span>
    </div>
  );
}
