import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import type { CapabilityKeyDef } from "@/lib/api/capability";
import {
  groupKeysByProtocolScope,
  protocolScopeLabel,
} from "@/lib/capability/protocolScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** 从能力字典多选新增（默认 support_level=full，由调用方写入）。 */
export function AddCapabilitiesDialog({
  keys,
  onConfirm,
  disabled,
}: {
  keys: CapabilityKeyDef[];
  onConfirm: (selectedKeys: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter(
      (k) =>
        k.key.toLowerCase().includes(q) ||
        k.display_name.toLowerCase().includes(q) ||
        k.description.toLowerCase().includes(q) ||
        k.domain.toLowerCase().includes(q),
    );
  }, [keys, search]);

  const grouped = groupKeysByProtocolScope(filtered);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSearch("");
      setSelected(new Set());
    }
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirm() {
    if (selected.size === 0) return;
    onConfirm([...selected]);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled || keys.length === 0}
        >
          <PlusIcon data-icon="inline-start" />
          新增能力…
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增能力</DialogTitle>
          <DialogDescription>
            从能力字典多选；确认后以 full 档位加入列表，可在采纳前再改档位。
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 key / 展示名 / 描述"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">
              {search ? `没有匹配「${search.trim()}」的能力` : "暂无可选能力"}
            </p>
          ) : (
            grouped.map(([scope, defs]) => (
              <div key={scope}>
                <div className="text-muted-foreground sticky top-0 border-b bg-muted/50 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                  {protocolScopeLabel(scope)}
                  <span className="ml-1 opacity-70">({defs.length})</span>
                </div>
                <ul className="divide-border divide-y">
                  {defs.map((def) => (
                    <li key={def.key}>
                      <label className="hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0"
                          checked={selected.has(def.key)}
                          onChange={() => toggle(def.key)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-mono text-sm">{def.key}</span>
                            {def.display_name ? (
                              <span className="text-muted-foreground text-xs">
                                {def.display_name}
                              </span>
                            ) : null}
                          </span>
                          {def.description ? (
                            <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                              {def.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button type="button" onClick={confirm} disabled={selected.size === 0}>
            确认添加{selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
