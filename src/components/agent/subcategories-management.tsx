"use client";

import { useState, useTransition, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import {
  createAgentSubcategory,
  updateAgentSubcategory,
  deleteAgentSubcategory,
  toggleAgentSubcategoryActive,
} from "@/actions/agent/subcategories";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  category?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface AgentSubcategoriesManagementProps {
  subcategories: Subcategory[];
  categories: Category[];
}

export function AgentSubcategoriesManagement({
  subcategories,
  categories
}: AgentSubcategoriesManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const router = useRouter();

  const [formData, setFormData] = useState({
    categoryId: "" as string,
    name: "",
    description: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      description: "",
      isActive: true
    });
    setEditingSubcategory(null);
  };

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      categoryId: subcategory.categoryId.toString(),
      name: subcategory.name,
      description: subcategory.description || "",
      isActive: subcategory.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.categoryId || !formData.name.trim()) {
      toast.error("Categoría y nombre son requeridos");
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append("categoryId", formData.categoryId);
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("isActive", String(formData.isActive));

      let result;
      if (editingSubcategory) {
        data.append("id", String(editingSubcategory.id));
        result = await updateAgentSubcategory(data);
      } else {
        result = await createAgentSubcategory(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingSubcategory ? "Subcategoría actualizada" : "Subcategoría creada");
        setIsDialogOpen(false);
        resetForm();
        router.refresh();
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteAgentSubcategory(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subcategoría eliminada");
        setDeleteId(null);
        router.refresh();
      }
    });
  };

  const handleToggleActive = (id: number, currentState: boolean) => {
    startTransition(async () => {
      const result = await toggleAgentSubcategoryActive(id, !currentState);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Subcategoría ${!currentState ? "activada" : "desactivada"}`);
        router.refresh();
      }
    });
  };

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(
    () => selectedCategory === "all"
      ? subcategories
      : subcategories.filter(sub => sub.categoryId === parseInt(selectedCategory)),
    [subcategories, selectedCategory]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subcategorías</CardTitle>
        <CardDescription>
          Gestiona las subcategorías de tus categorías
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <p className="text-sm text-muted-foreground">
              {filteredSubcategories.length} subcategoría(s)
            </p>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por categoría..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva subcategoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSubcategory ? "Editar subcategoría" : "Nueva subcategoría"}
                </DialogTitle>
                <DialogDescription>
                  {editingSubcategory
                    ? "Modifica los datos de la subcategoría"
                    : "Crea una nueva subcategoría para tus categorías"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData(prev => ({ ...prev, categoryId: value }))
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Seleccionar categoría..." />
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Instalación de Software"
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
                    Subcategoría activa
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {editingSubcategory ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay subcategorías. Crea una nueva.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubcategories.map((subcategory) => (
                  <TableRow key={subcategory.id}>
                    <TableCell className="font-medium">
                      {subcategory.category?.name || "N/A"}
                    </TableCell>
                    <TableCell>{subcategory.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      <span className="block truncate" title={subcategory.description || ""}>
                        {subcategory.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={subcategory.isActive}
                        aria-label={`${subcategory.isActive ? "Desactivar" : "Activar"} subcategoría ${subcategory.name}`}
                        onCheckedChange={() => handleToggleActive(subcategory.id, subcategory.isActive)}
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subcategory)}
                          aria-label={`Editar ${subcategory.name}`}
                          disabled={isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(subcategory.id)}
                          aria-label={`Eliminar ${subcategory.name}`}
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
          title="¿Eliminar subcategoría?"
          description="Esta acción no se puede deshacer."
        />
      </CardContent>
    </Card>
  );
}
