import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateApiKey, type ApiKey } from "@/lib/api/apiKeys";
import { listRoutes } from "@/lib/api/routes";
import { apiErrorMessage } from "@/lib/api/client";
import { HintLabel } from "@/components/common/field-hint";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup } from "@/components/ui/field";

// 换绑 API Key 线路（每条 Key 必须绑定一条线路）。
export function ApiKeyRouteDialog({
  apiKey,
  children,
}: {
  apiKey: Pick<ApiKey, "id" | "user_id" | "name" | "route_id">;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [routeId, setRouteId] = useState(String(apiKey.route_id));

  const queryClient = useQueryClient();

  const routesQuery = useQuery({
    queryKey: ["routes"],
    queryFn: listRoutes,
    enabled: open,
  });
  const routes = (routesQuery.data ?? []).filter((r) => r.status === "enabled");

  const mutation = useMutation({
    mutationFn: () =>
      updateApiKey({
        id: apiKey.id,
        routeId: Number(routeId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", apiKey.user_id] });
      toast.success("已换绑线路");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err));
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setRouteId(String(apiKey.route_id));
      mutation.reset();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (Number(routeId) === apiKey.route_id) {
      setOpen(false);
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>换绑线路</DialogTitle>
          <DialogDescription>
            {apiKey.name} · 每条 Key 必须绑定一条线路，决定选路策略与候选渠道池
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <HintLabel
                htmlFor="key_route_edit"
                hint="选择该 Key 使用的线路；仅可换绑到其他已启用线路，不可清除。"
              >
                线路
              </HintLabel>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger id="key_route_edit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending || routesQuery.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {mutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
