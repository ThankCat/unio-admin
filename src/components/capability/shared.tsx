import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProtocolScope, SupportLevel } from "@/lib/api/capability";
import {
  PROTOCOL_SCOPE_HINT,
  normalizeProtocolScope,
  protocolScopeLabel,
  protocolScopeStyles,
} from "@/lib/capability/protocolScope";

// 协议归属小标签（黑白灰，用于行内标注）。
export function ProtocolScopeBadge({
  scope,
  className,
}: {
  scope: ProtocolScope | "both";
  className?: string;
}) {
  const normalized = normalizeProtocolScope(scope);
  const styles = protocolScopeStyles(normalized);
  return (
    <Badge
      variant="outline"
      title={PROTOCOL_SCOPE_HINT[normalized]}
      className={cn("rounded-md border text-xs font-normal", styles.badge, className)}
    >
      {protocolScopeLabel(normalized)}
    </Badge>
  );
}

/** 下拉/列表分组标题。 */
export function ProtocolScopeGroupHeader({
  scope,
  className,
  count,
}: {
  scope: ProtocolScope | "both";
  className?: string;
  count?: number;
}) {
  const normalized = normalizeProtocolScope(scope);
  const styles = protocolScopeStyles(normalized);
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-xs",
        styles.groupHeader,
        className,
      )}
    >
      <span>{protocolScopeLabel(normalized)}</span>
      {count != null ? (
        <span className="opacity-70">({count})</span>
      ) : null}
    </div>
  );
}

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
