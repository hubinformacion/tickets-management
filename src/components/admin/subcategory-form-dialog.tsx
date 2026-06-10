"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Category {
  id: number;
  name: string;
}

interface SubcategoryFormData {
  categoryId: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface SubcategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubcategory: { id: number; categoryId: number; name: string; description: string | null; isActive: boolean } | null;
  formData: SubcategoryFormData;
  onFormDataChange: (data: SubcategoryFormData) => void;
  categories: Category[];
  onSubmit: () => void;
  isPending: boolean;
}

export function SubcategoryFormDialog({
  isOpen,
  onOpenChange,
  editingSubcategory,
  formData,
  onFormDataChange,
  categories,
  onSubmit,
  isPending,
}: SubcategoryFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingSubcategory ? "Editar subcategoría" : "Nueva subcategoría"}
          </DialogTitle>
          <DialogDescription>
            {editingSubcategory
              ? "Modifica los datos de la subcategoría"
              : "Crea una nueva subcategoría de tickets"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => onFormDataChange({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="Ej: Hardware"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional de la subcategoría"
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {editingSubcategory ? "Actualizar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
