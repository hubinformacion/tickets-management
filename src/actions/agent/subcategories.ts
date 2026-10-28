"use server";

import { requireAgent } from "@/lib/auth/helpers";
import { mutateSubcategory } from "@/lib/catalog/mutations";
import { readCatalogFields } from "@/lib/catalog/form-data";

export async function createAgentSubcategory(formData: FormData) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateSubcategory({ role: "agent", areaId: session.user.attentionAreaId }, {
    operation: "create", ...readCatalogFields(formData), categoryId: formData.get("categoryId"),
  });
}

export async function updateAgentSubcategory(formData: FormData) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateSubcategory({ role: "agent", areaId: session.user.attentionAreaId }, {
    operation: "update", id: formData.get("id"), ...readCatalogFields(formData), categoryId: formData.get("categoryId"),
  });
}

export async function deleteAgentSubcategory(id: number) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateSubcategory({ role: "agent", areaId: session.user.attentionAreaId }, { operation: "delete", id });
}

export async function toggleAgentSubcategoryActive(id: number, newState: boolean) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateSubcategory({ role: "agent", areaId: session.user.attentionAreaId }, { operation: "toggle", id, newState });
}
