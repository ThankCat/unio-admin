import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { HoverCardContent } from "@/components/ui/hover-card";

/** 指标 tip：固定宽度 320px，高度随内容收缩，最高 320px 后隐式滚动。 */
export const TIP_PANEL_CLASS = "w-80 max-h-80 overflow-hidden p-0";
export const TIP_SCROLL_CLASS = "tip-scroll max-h-80 overflow-y-auto p-3";

export function TipHoverCardContent({
  className,
  children,
  ...props
}: ComponentProps<typeof HoverCardContent>) {
  return (
    <HoverCardContent className={cn(TIP_PANEL_CLASS, className)} {...props}>
      <div className={TIP_SCROLL_CLASS}>{children}</div>
    </HoverCardContent>
  );
}
