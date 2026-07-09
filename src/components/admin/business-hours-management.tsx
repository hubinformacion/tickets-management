"use client";

import { updateAttentionArea } from "@/actions/admin/attention-areas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBusinessDays, formatBusinessHoursRange, WEEKDAYS_ORDER, DAY_LABELS } from "@/lib/utils/business-hours";
import { Clock, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface AttentionArea {
  id: number;
  name: string;
  slug: string;
  isAcceptingTickets: boolean;
  businessStartTime: string;
  businessEndTime: string;
  businessDays: string;
}

interface BusinessHoursManagementProps {
  attentionAreas: AttentionArea[];
}

export function BusinessHoursManagement({ attentionAreas }: BusinessHoursManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AttentionArea | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Área de atención</TableHead>
              <TableHead>Horario hábil</TableHead>
              <TableHead>Días hábiles</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attentionAreas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No hay áreas de atención registradas.
                </TableCell>
              </TableRow>
            ) : (
              attentionAreas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{area.name}</span>
                      <span className="text-xs text-muted-foreground">({area.slug})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatBusinessHoursRange(area.businessStartTime, area.businessEndTime)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatBusinessDays(area.businessDays)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingArea(area);
                        setIsDialogOpen(true);
                      }}
                      aria-label={`Editar horario de ${area.name}`}
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

      <BusinessHoursDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        area={editingArea}
      />
    </div>
  );
}

function BusinessHoursDialog({
  open,
  onOpenChange,
  area,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: AttentionArea | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

  // Sincronizar selectedDays cuando se abre el diálogo o cambia el área
  useEffect(() => {
    if (open && area) {
      setSelectedDays(new Set(area.businessDays.split(",").map(Number)));
    }
  }, [open, area]);

  function handleDayToggle(day: number, checked: boolean) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(day);
      } else {
        next.delete(day);
      }
      return next;
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setSelectedDays(new Set());
    }
    onOpenChange(newOpen);
  }

  if (!area) return null;

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const formDataClone = new FormData();
      formDataClone.append("name", area!.name);
      formDataClone.append("slug", area!.slug);
      formDataClone.append("isAcceptingTickets", area!.isAcceptingTickets ? "true" : "false");
      formDataClone.append("businessStartTime", formData.get("businessStartTime") as string);
      formDataClone.append("businessEndTime", formData.get("businessEndTime") as string);
      formDataClone.append("businessDays", [...selectedDays].sort().join(","));

      const result = await updateAttentionArea(area!.id, formDataClone);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Horario de "${area!.name}" actualizado`);
        setSelectedDays(new Set());
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar horario de recepción</DialogTitle>
          <DialogDescription>
            Configura el horario hábil de <strong>{area.name}</strong> para cálculos estadísticos. No afecta la disponibilidad de formularios.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bh-start">Hora de inicio</Label>
              <Input
                id="bh-start"
                name="businessStartTime"
                type="time"
                defaultValue={area.businessStartTime}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bh-end">Hora de fin</Label>
              <Input
                id="bh-end"
                name="businessEndTime"
                type="time"
                defaultValue={area.businessEndTime}
                required
              />
            </div>
          </div>

          {/* Días hábiles */}
          <div className="space-y-3">
            <Label>Días hábiles</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS_ORDER.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedDays.has(day)}
                    onCheckedChange={(checked) => handleDayToggle(day, !!checked)}
                  />
                  {DAY_LABELS[day]}
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Los usuarios pueden enviar requerimientos las 24 horas. Este horario se utiliza exclusivamente para el cálculo de métricas y tiempos de atención.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || selectedDays.size === 0}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
