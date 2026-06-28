import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon, EyeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getModel, updateModel } from "@/lib/api/models";
import { apiErrorMessage } from "@/lib/api/client";
import { StatusChangeConfirmDialog } from "@/components/common/StatusChangeConfirmDialog";
import { ModelFormDialog } from "@/components/models/ModelFormDialog";
import { ModelCapabilitiesDialog } from "@/components/models/ModelCapabilitiesDialog";
import { DeleteModelDialog } from "@/components/models/DeleteModelDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  HoverDropdownMenu,
  HoverDropdownMenuContent,
  HoverDropdownMenuTrigger,
} from "@/components/ui/hover-dropdown-menu";

function buildStatusUpdate(model: Awaited<ReturnType<typeof getModel>>, enabled: boolean) {
  return {
    id: model.id,
    display_name: model.display_name,
    owned_by: model.owned_by,
    status: enabled ? "enabled" : "disabled",
    max_output_tokens: model.max_output_tokens,
    context_window_tokens: model.context_window_tokens,
    input_price_usd_per_million_tokens: model.input_price_usd_per_million_tokens,
    output_price_usd_per_million_tokens: model.output_price_usd_per_million_tokens,
    release_date: model.release_date,
  };
}

export function ModelRowActions({ modelId }: { modelId: number }) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [capOpen, setCapOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  const needModel = editOpen || capOpen || deleteOpen || menuOpen || statusConfirmOpen;
  const modelQ = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel(modelId),
    enabled: needModel,
  });

  const model = modelQ.data;

  const statusMutation = useMutation({
    mutationFn: updateModel,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      toast.success(vars.status === "enabled" ? "已启用" : "已停用");
      setStatusConfirmOpen(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  function openDialog(setter: (open: boolean) => void) {
    setMenuOpen(false);
    setter(true);
  }

  function requestStatusChange() {
    if (!model) return;
    setMenuOpen(false);
    setStatusConfirmOpen(true);
  }

  function confirmStatusChange() {
    if (!model) return;
    statusMutation.mutate(buildStatusUpdate(model, model.status !== "enabled"));
  }

  return (
    <>
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button asChild variant="ghost" size="icon-sm" aria-label="查看">
          <Link to={`/models/${modelId}`}>
            <EyeIcon />
          </Link>
        </Button>

        <HoverDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <HoverDropdownMenuTrigger asChild onOpen={() => setMenuOpen(true)}>
            <Button variant="ghost" size="icon-sm" aria-label="更多">
              <EllipsisIcon />
            </Button>
          </HoverDropdownMenuTrigger>
          <HoverDropdownMenuContent align="end" className="min-w-32">
            <DropdownMenuItem onClick={() => openDialog(setEditOpen)}>编辑</DropdownMenuItem>
            <DropdownMenuItem disabled={!model} onClick={requestStatusChange}>
              {model?.status === "enabled" ? "停用" : "启用"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDialog(setCapOpen)}>能力</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDialog(setDeleteOpen)}
            >
              删除
            </DropdownMenuItem>
          </HoverDropdownMenuContent>
        </HoverDropdownMenu>
      </div>

      {model ? (
        <>
          <ModelFormDialog open={editOpen} onOpenChange={setEditOpen} model={model} />
          <ModelCapabilitiesDialog model={model} open={capOpen} onOpenChange={setCapOpen} />
          <DeleteModelDialog model={model} open={deleteOpen} onOpenChange={setDeleteOpen} />
          <StatusChangeConfirmDialog
            open={statusConfirmOpen}
            onOpenChange={setStatusConfirmOpen}
            entityLabel="模型"
            entityName={model.display_name}
            enabling={model.status !== "enabled"}
            pending={statusMutation.isPending}
            onConfirm={confirmStatusChange}
          />
        </>
      ) : null}
    </>
  );
}
