import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import {
  RANGE_PRESETS,
  type RangePreset,
  type RangeValue,
} from "@/lib/range";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  HoverDropdownMenu,
  HoverDropdownMenuContent,
  HoverDropdownMenuTrigger,
} from "@/components/ui/hover-dropdown-menu";

// 固定范围下拉 + 自定义区间 + 「最后刷新」+ 刷新按钮。
export function RangeFilter({
  value,
  onChange,
  refreshedAt,
  onRefresh,
  className,
}: {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  refreshedAt?: number;
  onRefresh?: () => void;
  className?: string;
}) {
  const [calOpen, setCalOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const presetValue = value.preset === "custom" ? "" : value.preset;
  const presetLabel =
    value.preset === "custom"
      ? "时间范围"
      : (RANGE_PRESETS.find((p) => p.value === value.preset)?.label ?? "时间范围");

  function handlePreset(next: string) {
    if (!next) return;
    onChange({ preset: next as Exclude<RangePreset, "custom"> });
  }

  function applyCustom() {
    if (draft?.from && draft?.to) {
      const from = new Date(draft.from);
      from.setHours(0, 0, 0, 0);
      const to = new Date(draft.to);
      to.setHours(23, 59, 59, 999);
      onChange({
        preset: "custom",
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setCalOpen(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <HoverDropdownMenu open={presetOpen} onOpenChange={setPresetOpen}>
        <HoverDropdownMenuTrigger asChild onOpen={() => setPresetOpen(true)}>
          <button
            type="button"
            className="flex h-7 min-w-28 items-center justify-between gap-1.5 rounded-[min(var(--radius-md),10px)] border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
          >
            <span className={cn(value.preset === "custom" && "text-muted-foreground")}>
              {presetLabel}
            </span>
            <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
          </button>
        </HoverDropdownMenuTrigger>
        <HoverDropdownMenuContent align="end" className="min-w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuRadioGroup
            value={presetValue}
            onValueChange={(next) => {
              handlePreset(next);
              setPresetOpen(false);
            }}
          >
            {RANGE_PRESETS.map((p) => (
              <DropdownMenuRadioItem key={p.value} value={p.value}>
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </HoverDropdownMenuContent>
      </HoverDropdownMenu>

      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === "custom" ? "outline" : "ghost"}
            size="sm"
          >
            <CalendarIcon data-icon="inline-start" />
            {value.preset === "custom" && value.from && value.to
              ? `${new Date(value.from).toLocaleDateString()} – ${new Date(
                  value.to,
                ).toLocaleDateString()}`
              : "自定义"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            onSelect={setDraft}
            autoFocus
          />
          <div className="flex justify-end gap-2 px-1 pb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(undefined);
                setCalOpen(false);
              }}
            >
              取消
            </Button>
            <Button size="sm" disabled={!draft?.from || !draft?.to} onClick={applyCustom}>
              应用
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {onRefresh ? (
        <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs tabular-nums">
          {refreshedAt ? <span>最后刷新 {formatClock(refreshedAt)}</span> : null}
          <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label="刷新">
            <RefreshCwIcon />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
