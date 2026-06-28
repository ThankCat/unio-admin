import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 文本单元格：宽度不足时省略号截断，鼠标悬浮（title）查看完整内容。
 * 用 div(block) + truncate + min-w-0 保证省略号生效。
 */
export function TruncateCell({
  text,
  subtext,
  className,
  title,
}: {
  text: ReactNode;
  /** 第二行次要文本（同样截断 + 悬浮）。 */
  subtext?: ReactNode;
  className?: string;
  /** 悬浮提示，默认取 text 的字符串值。 */
  title?: string;
}) {
  const mainTitle = title ?? (typeof text === "string" ? text : undefined);
  const subTitle = typeof subtext === "string" ? subtext : undefined;
  return (
    <div className="min-w-0">
      <div className={cn("truncate", className)} title={mainTitle}>
        {text}
      </div>
      {subtext != null ? (
        <div className="text-muted-foreground truncate text-xs" title={subTitle}>
          {subtext}
        </div>
      ) : null}
    </div>
  );
}
