"use client";

import { updatePriorityConfigAction } from "@/actions/admin/priority-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS } from "@/lib/constants/tickets";
import type { TicketPriority } from "@/types";
import { Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface PriorityConfigItem {
  id: number;
  attentionAreaId: number;
  priority: string;
  description: string;
  slaHours: number;
}

interface AttentionArea {
  id: number;
  name: string;
  slug: string;
}

interface PriorityConfigManagementProps {
  priorityConfigs: PriorityConfigItem[];
  attentionAreas: AttentionArea[];
}

function formatSla(hours: number): string {
  if (hours < 24 || hours % 24 !== 0) return `${hours} hora${hours !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} día${days !== 1 ? "s" : ""}`;
}

const PRIORITY_ORDER: TicketPriority[] = ["low", "medium", "high", "critical"];

export function PriorityConfigManagement({ priorityConfigs, attentionAreas }: PriorityConfigManagementProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    attentionAreas[0]?.id.toString() ?? ""
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PriorityConfigItem | null>(null);

  const areaConfigs = priorityConfigs
    .filter(c => c.attentionAreaId === Number(selectedAreaId))
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority as TicketPriority) - PRIORITY_ORDER.indexOf(b.priority as TicketPriority));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="area-select" className="text-sm font-medium whitespace-nowrap">
          Área de atención:
        </Label>
        <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
          <SelectTrigger id="area-select" className="w-64">
            <SelectValue placeholder="Selecciona un área" />
          </SelectTrigger>
          <SelectContent>
            {attentionAreas.map((area) => (
              <SelectItem key={area.id} value={area.id.toString()}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prioridad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areaConfigs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay configuración de prioridades para esta área.
                </TableCell>
              </TableRow>
            ) : (
              areaConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {PRIORITY_LABELS[config.priority as TicketPriority] ?? config.priority}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {config.description}
                  </TableCell>
                  <TableCell>{formatSla(config.slaHours)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingConfig(config);
                        setIsDialogOpen(true);
                      }}
                      aria-label={`Editar prioridad ${PRIORITY_LABELS[config.priority as TicketPriority]}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PriorityConfigDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        config={editingConfig}
      />
    </div>
  );
}

function PriorityConfigDialog({
  open,
  onOpenChange,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PriorityConfigItem | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (!config) return null;

  const label = PRIORITY_LABELS[config.priority as TicketPriority] ?? config.priority;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.append("id", config!.id.toString());

      const result = await updatePriorityConfigAction(formData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Prioridad "${label}" actualizada`);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar prioridad: {label}</DialogTitle>
          <DialogDescription>
            Modifica la descripción y el tiempo de atención (SLA) para esta prioridad.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={config.description}
              required
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slaHours">SLA (horas)</Label>
            <Input
              id="slaHours"
              name="slaHours"
              type="number"
              min={1}
              defaultValue={config.slaHours}
              required
              className="w-32"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
