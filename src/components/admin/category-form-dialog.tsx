"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AttentionArea {
  id: number;
  name: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  isActive: boolean;
  attentionAreaId: number | undefined;
}

interface CategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: { id: number; name: string; description: string | null; isActive: boolean; attentionAreaId?: number | null } | null;
  formData: CategoryFormData;
  onFormDataChange: (data: CategoryFormData) => void;
  attentionAreas: AttentionArea[];
  onSubmit: () => void;
  isPending: boolean;
}

export function CategoryFormDialog({
  isOpen,
  onOpenChange,
  editingCategory,
  formData,
  onFormDataChange,
  attentionAreas,
  onSubmit,
  isPending,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {editingCategory
              ? "Modifica los datos de la categoría"
              : "Crea una nueva categoría para los tickets"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="Ej: Soporte Técnico"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attentionArea">Área de Atención</Label>
            <Select
              value={formData.attentionAreaId?.toString() || "none"}
              onValueChange={(value) =>
                onFormDataChange({
                  ...formData,
                  attentionAreaId: value === "none" ? undefined : Number(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar área..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin área específica</SelectItem>
                {attentionAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.8rem] text-muted-foreground">
              Los tickets de esta categoría se asignarán a esta área.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                onFormDataChange({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Categoría activa
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {editingCategory ? "Actualizar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
