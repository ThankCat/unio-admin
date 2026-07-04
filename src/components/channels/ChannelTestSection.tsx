import { useState } from "react";
import type { Channel } from "@/lib/api/channels";
import { ChannelLastTestDetail } from "@/components/channels/ChannelLastTest";
import { ChannelTestDialog } from "@/components/channels/ChannelTestDialog";
import { ChannelTestLogs } from "@/components/channels/ChannelTestLogs";
import { Button } from "@/components/ui/button";

export function ChannelTestSection({ channel }: { channel: Channel }) {
  const [testOpen, setTestOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <ChannelLastTestDetail info={channel} />
      <div>
        <Button type="button" size="sm" onClick={() => setTestOpen(true)}>
          发起检测
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">检测日志</h3>
        <p className="text-muted-foreground text-xs">
          自动巡检（凭据失效自动摘除 / 检测通过自动恢复）、手动检测与运行时连续 401 的历史记录。
        </p>
        <ChannelTestLogs channelId={channel.id} />
      </div>

      <ChannelTestDialog open={testOpen} onOpenChange={setTestOpen} channel={channel} />
    </div>
  );
}
