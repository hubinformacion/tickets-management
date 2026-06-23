"use client";

import { createAttentionArea, updateAttentionArea } from "@/actions/admin/attention-areas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBusinessHoursRange } from "@/lib/utils/business-hours";
import { Clock, Loader2, Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AttentionArea {
  id: number;
  name: string;
  slug: string;
  isAcceptingTickets: boolean;
  businessStartTime: string;
  businessEndTime: string;
}

interface AttentionAreasListProps {
  areas: AttentionArea[];
}

export function AttentionAreasList({ areas }: AttentionAreasListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AttentionArea | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingArea(null); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva área
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Horario de atención</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay áreas de atención registradas.
                </TableCell>
              </TableRow>
            ) : (
              areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell className="text-muted-foreground">{area.slug}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatBusinessHoursRange(area.businessStartTime, area.businessEndTime)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${area.isAcceptingTickets ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                      {area.isAcceptingTickets ? "Activo" : "Cerrado"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingArea(area);
                        setIsDialogOpen(true);
                      }}
                      aria-label={`Editar ${area.name}`}
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

      <AreaDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        area={editingArea}
      />
    </div>
  );
}

function AreaDialog({
  open,
  onOpenChange,
  area
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: AttentionArea | null;
}) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const formDataClone = new FormData();
      formDataClone.append("name", formData.get("name") as string);
      formDataClone.append("slug", formData.get("slug") as string);
      formDataClone.append("isAcceptingTickets", formData.get("isAcceptingTickets") === "on" ? "true" : "false");
      formDataClone.append("businessStartTime", formData.get("businessStartTime") as string);
      formDataClone.append("businessEndTime", formData.get("businessEndTime") as string);

      const result = area
        ? await updateAttentionArea(area.id, formDataClone)
        : await createAttentionArea(formDataClone);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(area ? "Área actualizada" : "Área creada");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nueva área"}</DialogTitle>
          <DialogDescription>
            {area ? "Modifica los datos del área de atención." : "Crea una nueva área de atención."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={area?.name}
              required
              placeholder="Ej: Tecnologías y Sistemas"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={area?.slug}
              required
              placeholder="Ej: TSI"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isAcceptingTickets"
              name="isAcceptingTickets"
              defaultChecked={area?.isAcceptingTickets ?? true}
            />
            <Label htmlFor="isAcceptingTickets">Aceptar tickets</Label>
          </div>

          {/* Horario de atención */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Horario de atención
            </div>
            <p className="text-xs text-muted-foreground">
              Define el horario hábil para cálculos estadísticos. No afecta la disponibilidad de formularios.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="businessStartTime">Hora de inicio</Label>
                <Input
                  id="businessStartTime"
                  name="businessStartTime"
                  type="time"
                  defaultValue={area?.businessStartTime ?? "08:30"}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="businessEndTime">Hora de fin</Label>
                <Input
                  id="businessEndTime"
                  name="businessEndTime"
                  type="time"
                  defaultValue={area?.businessEndTime ?? "18:30"}
                  required
                />
              </div>
            </div>
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
