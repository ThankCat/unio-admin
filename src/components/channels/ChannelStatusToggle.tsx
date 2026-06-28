import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateChannel, type Channel } from "@/lib/api/channels";
import { apiErrorMessage } from "@/lib/api/client";
import { StatusChangeConfirmDialog } from "@/components/common/StatusChangeConfirmDialog";
import { Button } from "@/components/ui/button";

export function ChannelStatusToggle({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  const mutation = useMutation({
    mutationFn: updateChannel,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["channel", channel.id] });
      toast.success(vars.status === "enabled" ? "已启用" : "已停用");
      setConfirmOpen(false);
      setPendingEnabled(null);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  const enabled = channel.status === "enabled";

  function requestChange() {
    setPendingEnabled(!enabled);
    setConfirmOpen(true);
  }

  function confirmChange() {
    if (pendingEnabled == null) return;
    mutation.mutate({
      id: channel.id,
      name: channel.name,
      base_url: channel.base_url,
      status: pendingEnabled ? "enabled" : "disabled",
      priority: channel.priority,
      timeout_ms: channel.timeout_ms,
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={requestChange}>
        {enabled ? "停用" : "启用"}
      </Button>

      <StatusChangeConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingEnabled(null);
        }}
        entityLabel="渠道"
        entityName={channel.name}
        enabling={pendingEnabled ?? false}
        pending={mutation.isPending}
        onConfirm={confirmChange}
      />
    </>
  );
}
