"use server";

import { requireAdmin } from "@/lib/auth/helpers";
import { mutateSubcategory } from "@/lib/catalog/mutations";

export async function createSubcategory(categoryId: number, name: string, description: string, isActive: boolean) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "create", categoryId, name, description, isActive });
}

export async function updateSubcategory(id: number, categoryId: number, name: string, description: string, isActive: boolean) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "update", id, categoryId, name, description, isActive });
}

export async function deleteSubcategory(id: number) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "delete", id });
}

export async function toggleSubcategoryActive(id: number) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "toggle", id });
}

export async function moveSubcategoryUp(id: number, categoryId: number, currentOrder: number) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "move", id, direction: "up", currentOrder, expectedCategoryId: categoryId });
}

export async function moveSubcategoryDown(id: number, categoryId: number, currentOrder: number) {
  await requireAdmin();
  return mutateSubcategory({ role: "admin" }, { operation: "move", id, direction: "down", currentOrder, expectedCategoryId: categoryId });
}
