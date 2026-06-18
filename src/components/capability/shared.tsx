import { Badge } from "@/components/ui/badge";
import type { EvidenceKind, SupportLevel } from "@/lib/api/capability";

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

// 自动校正证据强度：strong=可自动补，weak=仅建议。
export function EvidenceKindBadge({ kind }: { kind: EvidenceKind }) {
  if (kind === "strong") {
    return <Badge variant="default">强证据</Badge>;
  }
  return <Badge variant="secondary">弱证据</Badge>;
}

// 由 worker 自动写入的能力声明（updated_by=auto_calibrate）。
export function AutoCalibrateBadge() {
  return <Badge variant="outline">自动</Badge>;
}
