"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import {
  createAgentCategory,
  updateAgentCategory,
  deleteAgentCategory,
  toggleAgentCategoryActive,
} from "@/actions/agent/categories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  attentionAreaId?: number | null;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  isActive: boolean;
}

interface AgentCategoriesManagementProps {
  categories: Category[];
}

export function AgentCategoriesManagement({ categories }: AgentCategoriesManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isActive: true
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("isActive", String(formData.isActive));

      let result;
      if (editingCategory) {
        data.append("id", String(editingCategory.id));
        result = await updateAgentCategory(data);
      } else {
        result = await createAgentCategory(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada");
        setIsDialogOpen(false);
        resetForm();
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteAgentCategory(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoría eliminada");
        setDeleteId(null);
        router.refresh();
      }
    });
  };

  const handleToggleActive = (id: number, currentState: boolean) => {
    startTransition(async () => {
      const result = await toggleAgentCategoryActive(id, !currentState);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Categoría ${!currentState ? "activada" : "desactivada"}`);
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías y Subcategorías</CardTitle>
        <CardDescription>
          Gestiona las categorías de tu área de atención
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {categories.length} categoría(s) total(es)
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar categoría" : "Nueva categoría"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Modifica los datos de la categoría"
                    : "Crea una nueva categoría para los tickets de tu área"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Soporte Técnico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Categoría activa
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {editingCategory ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Subcategorías</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay categorías. Crea una nueva.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      <span className="block truncate" title={category.description || ""}>
                        {category.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {category.subcategories?.length || 0} subcategoría(s)
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.isActive}
                        aria-label={`${category.isActive ? "Desactivar" : "Activar"} categoría ${category.name}`}
                        onCheckedChange={() => handleToggleActive(category.id, category.isActive)}
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          aria-label={`Editar ${category.name}`}
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(category.id)}
                          aria-label={`Eliminar ${category.name}`}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DeleteConfirmDialog
          open={deleteId !== null}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={handleDelete}
          title="¿Eliminar categoría?"
          description="Esta acción no se puede deshacer. Se eliminarán también todas las subcategorías asociadas."
        />
      </CardContent>
    </Card>
  );
}
