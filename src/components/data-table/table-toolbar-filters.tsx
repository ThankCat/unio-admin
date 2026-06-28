import { useState } from "react";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  HoverDropdownMenu,
  HoverDropdownMenuContent,
  HoverDropdownMenuTrigger,
} from "@/components/ui/hover-dropdown-menu";

export const OPS_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "enabled", label: "启用" },
  { value: "disabled", label: "停用" },
] as const;

export type OpsStatusFilter = (typeof OPS_STATUS_FILTER_OPTIONS)[number]["value"];

export function TableToolbarSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-56", className)}>
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

const triggerClass =
  "flex h-8 w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export function TableToolbarSelect<T extends string>({
  value,
  onValueChange,
  options,
  triggerClassName,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <HoverDropdownMenu open={open} onOpenChange={setOpen}>
      <HoverDropdownMenuTrigger asChild onOpen={() => setOpen(true)}>
        <button type="button" className={cn(triggerClass, triggerClassName ?? "w-32")}>
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="text-muted-foreground size-4" />
        </button>
      </HoverDropdownMenuTrigger>
      <HoverDropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            onValueChange(next as T);
            setOpen(false);
          }}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </HoverDropdownMenuContent>
    </HoverDropdownMenu>
  );
}
