import { Badge } from "@/components/ui/badge";
import type { SupportLevel } from "@/lib/api/capability";

// 支持级别徽标：full=放行，limited=受 limits 约束，unsupported=不支持。
export function SupportLevelBadge({ level }: { level: SupportLevel }) {
  if (level === "full") {
    return <Badge variant="default">full</Badge>;
  }
  if (level === "limited") {
    return <Badge variant="secondary">limited</Badge>;
  }
  return <Badge variant="outline">unsupported</Badge>;
}

// 能力来源徽标：manual=手工覆盖，models_dev=同步种子，adapter_seed=adapter 画像物化。
export function CapabilitySourceBadge({ source }: { source: string }) {
  if (source === "manual") {
    return <Badge variant="secondary">手工</Badge>;
  }
  if (source === "models_dev") {
    return <Badge variant="outline">同步</Badge>;
  }
  if (source === "adapter_seed") {
    return <Badge variant="outline">adapter</Badge>;
  }
  return <Badge variant="outline">{source}</Badge>;
}
