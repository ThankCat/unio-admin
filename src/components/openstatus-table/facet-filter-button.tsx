import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FacetOption } from "./types";

/**
 * 受控 facet 筛选按钮（server 表格用）：顶栏 Popover + 多选/单选。
 * 不依赖 TanStack column filter，由父组件持有筛选值。
 */
export function FacetFilterButton({
  label,
  value,
  options,
  onChange,
  multiple = true,
}: {
  label: string;
  value: string[];
  options: FacetOption[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const count = value.length;

  const toggle = (v: string, checked: boolean) => {
    if (!multiple) {
      onChange(checked ? [v] : []);
      setOpen(false);
      return;
    }
    onChange(checked ? [...value, v] : value.filter((x) => x !== v));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5 border-dashed", count > 0 && "border-solid")}
        >
          {label}
          {count > 0 ? (
            <Badge variant="secondary" className="h-5 rounded-full px-1.5 font-mono text-[10px]">
              {count}
            </Badge>
          ) : null}
          <ChevronDownIcon className="text-muted-foreground size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <div className="rounded-lg border">
          {options.map((option, index) => {
            const checked = value.includes(option.value);
            return (
              <div
                key={option.value}
                className={cn(
                  "hover:bg-accent/50 flex items-center gap-2 px-2.5 py-2",
                  index !== options.length - 1 && "border-b",
                )}
              >
                <Checkbox
                  id={`facet-${label}-${option.value}`}
                  checked={checked}
                  onCheckedChange={(c) => toggle(option.value, !!c)}
                />
                <Label
                  htmlFor={`facet-${label}-${option.value}`}
                  className="text-foreground/80 w-full truncate"
                >
                  {option.render ? option.render() : option.label}
                </Label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
