"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { SubcategoryFormDialog } from "./subcategory-form-dialog";
import {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  toggleSubcategoryActive,
  moveSubcategoryUp,
  moveSubcategoryDown,
} from "@/actions/admin/subcategories";

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  category?: Category;
}

interface SubcategoriesManagementProps {
  initialSubcategories: Subcategory[];
  categories: Category[];
}

export function SubcategoriesManagement({ initialSubcategories, categories }: SubcategoriesManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const router = useRouter();

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    isActive: true,
  });

  const filteredSubcategories = useMemo(() => {
    if (filterCategoryId === "all") return initialSubcategories;
    return initialSubcategories.filter(sub => sub.categoryId.toString() === filterCategoryId);
  }, [initialSubcategories, filterCategoryId]);

  const subcategoriesByCategoryId = useMemo(() => {
    const map = new Map<number, Subcategory[]>();
    for (const sub of initialSubcategories) {
      const list = map.get(sub.categoryId);
      if (list) {
        list.push(sub);
      } else {
        map.set(sub.categoryId, [sub]);
      }
    }
    return map;
  }, [initialSubcategories]);

  const resetForm = () => {
    setFormData({ categoryId: "", name: "", description: "", isActive: true });
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
      toast.error("La categoría y el nombre son requeridos");
      return;
    }

    startTransition(async () => {
      const result = editingSubcategory
        ? await updateSubcategory(
          editingSubcategory.id,
          parseInt(formData.categoryId),
          formData.name,
          formData.description,
          formData.isActive
        )
        : await createSubcategory(
          parseInt(formData.categoryId),
          formData.name,
          formData.description,
          formData.isActive
        );

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

  const confirmDelete = () => {
    if (!deleteId) return;

    startTransition(async () => {
      const result = await deleteSubcategory(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subcategoría eliminada");
        router.refresh();
      }
      setDeleteId(null);
    });
  };

  const handleToggleActive = (id: number) => {
    startTransition(async () => {
      const result = await toggleSubcategoryActive(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Estado actualizado");
        router.refresh();
      }
    });
  };

  const handleMoveUp = (id: number, categoryId: number, displayOrder: number) => {
    startTransition(async () => {
      const result = await moveSubcategoryUp(id, categoryId, displayOrder);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleMoveDown = (id: number, categoryId: number, displayOrder: number) => {
    startTransition(async () => {
      const result = await moveSubcategoryDown(id, categoryId, displayOrder);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {filteredSubcategories.length} subcategoría(s)
            {filterCategoryId !== "all" && " en esta categoría"}
          </p>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por categoría" />
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
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva subcategoría
        </Button>
      </div>

      <SubcategoryFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingSubcategory={editingSubcategory}
        formData={formData}
        onFormDataChange={setFormData}
        categories={categories}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Orden</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[150px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {filterCategoryId === "all"
                    ? "No hay subcategorías creadas"
                    : "No hay subcategorías en esta categoría"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSubcategories.map((subcategory) => {
                const categorySubcategories = subcategoriesByCategoryId.get(subcategory.categoryId) || [];
                const indexInCategory = categorySubcategories.findIndex(s => s.id === subcategory.id);

                return (
                  <TableRow key={subcategory.id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(subcategory.id, subcategory.categoryId, subcategory.displayOrder)}
                          disabled={indexInCategory === 0 || isPending}
                          aria-label={`Mover arriba ${subcategory.name}`}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(subcategory.id, subcategory.categoryId, subcategory.displayOrder)}
                          disabled={indexInCategory === categorySubcategories.length - 1 || isPending}
                          aria-label={`Mover abajo ${subcategory.name}`}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {subcategory.category?.name || categories.find(c => c.id === subcategory.categoryId)?.name}
                    </TableCell>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                      <span className="block truncate" title={subcategory.description || ""}>
                        {subcategory.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={subcategory.isActive}
                        onCheckedChange={() => handleToggleActive(subcategory.id)}
                        disabled={isPending}
                        aria-label={`${subcategory.isActive ? "Desactivar" : "Activar"} subcategoría ${subcategory.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subcategory)}
                          disabled={isPending}
                          aria-label={`Editar ${subcategory.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(subcategory.id)}
                          disabled={isPending}
                          aria-label={`Eliminar ${subcategory.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Eliminar subcategoría"
        description="¿Estás seguro de eliminar esta subcategoría? Esta acción no se puede deshacer y puede afectar tickets existentes."
      />
    </div>
  );
}
