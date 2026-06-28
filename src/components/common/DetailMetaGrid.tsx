import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailMetaGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function DetailMetaField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd
        className={cn(
          "text-foreground mt-1 truncate text-sm font-medium",
          mono && "font-mono text-[13px] font-normal",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function DetailMetaGridSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
