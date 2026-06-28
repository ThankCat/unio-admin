import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateModel, type Model } from "@/lib/api/models";
import { apiErrorMessage } from "@/lib/api/client";
import { StatusChangeConfirmDialog } from "@/components/common/StatusChangeConfirmDialog";
import { Switch } from "@/components/ui/switch";

export function ModelStatusToggle({ model }: { model: Model }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: updateModel,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model", model.id] });
      toast.success(vars.status === "enabled" ? "已启用" : "已停用");
      setConfirmOpen(false);
      setPendingEnabled(null);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const enabled = model.status === "enabled";

  function requestChange(next: boolean) {
    if (next === enabled) return;
    setPendingEnabled(next);
    setConfirmOpen(true);
  }

  function confirmChange() {
    if (pendingEnabled == null) return;
    mutation.mutate({
      id: model.id,
      display_name: model.display_name,
      owned_by: model.owned_by,
      status: pendingEnabled ? "enabled" : "disabled",
      max_output_tokens: model.max_output_tokens,
      context_window_tokens: model.context_window_tokens,
      input_price_usd_per_million_tokens: model.input_price_usd_per_million_tokens,
      output_price_usd_per_million_tokens: model.output_price_usd_per_million_tokens,
      release_date: model.release_date,
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          disabled={mutation.isPending}
          onCheckedChange={requestChange}
          aria-label={`切换 ${model.display_name} 状态`}
        />
        <span className="text-muted-foreground text-sm tabular-nums">
          {enabled ? "启用" : "停用"}
        </span>
      </div>

      <StatusChangeConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingEnabled(null);
        }}
        entityLabel="模型"
        entityName={model.display_name}
        enabling={pendingEnabled ?? false}
        pending={mutation.isPending}
        onConfirm={confirmChange}
      />
    </>
  );
}
