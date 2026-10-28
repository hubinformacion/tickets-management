"use server";

import { requireAdmin } from "@/lib/auth/helpers";
import { mutateCategory } from "@/lib/catalog/mutations";

export async function createCategory(name: string, description: string, isActive: boolean, attentionAreaId?: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "create", name, description, isActive, attentionAreaId: attentionAreaId ?? null });
}

export async function updateCategory(id: number, name: string, description: string, isActive: boolean, attentionAreaId?: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "update", id, name, description, isActive, attentionAreaId: attentionAreaId ?? null });
}

export async function deleteCategory(id: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "delete", id });
}

export async function toggleCategoryActive(id: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "toggle", id });
}

export async function moveCategoryUp(id: number, currentOrder: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "move", id, direction: "up", currentOrder });
}

export async function moveCategoryDown(id: number, currentOrder: number) {
  await requireAdmin();
  return mutateCategory({ role: "admin" }, { operation: "move", id, direction: "down", currentOrder });
}
