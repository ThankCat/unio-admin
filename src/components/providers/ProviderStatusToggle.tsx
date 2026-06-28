import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProvider, type Provider } from "@/lib/api/providers";
import { apiErrorMessage } from "@/lib/api/client";
import { StatusChangeConfirmDialog } from "@/components/common/StatusChangeConfirmDialog";
import { Switch } from "@/components/ui/switch";

export function ProviderStatusToggle({ provider }: { provider: Provider }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: updateProvider,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success(vars.status === "enabled" ? "已启用" : "已停用");
      setConfirmOpen(false);
      setPendingEnabled(null);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const enabled = provider.status === "enabled";

  function requestChange(next: boolean) {
    if (next === enabled) return;
    setPendingEnabled(next);
    setConfirmOpen(true);
  }

  function confirmChange() {
    if (pendingEnabled == null) return;
    mutation.mutate({
      id: provider.id,
      name: provider.name,
      status: pendingEnabled ? "enabled" : "disabled",
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          disabled={mutation.isPending}
          onCheckedChange={requestChange}
          aria-label={`切换 ${provider.name} 状态`}
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
        entityLabel="服务商"
        entityName={provider.name}
        enabling={pendingEnabled ?? false}
        pending={mutation.isPending}
        onConfirm={confirmChange}
      />
    </>
  );
}
