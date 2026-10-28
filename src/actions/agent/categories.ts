"use server";

import { requireAgent } from "@/lib/auth/helpers";
import { mutateCategory } from "@/lib/catalog/mutations";
import { readCatalogFields } from "@/lib/catalog/form-data";

export async function createAgentCategory(formData: FormData) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateCategory({ role: "agent", areaId: session.user.attentionAreaId }, {
    operation: "create", ...readCatalogFields(formData), attentionAreaId: session.user.attentionAreaId,
  });
}

export async function updateAgentCategory(formData: FormData) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateCategory({ role: "agent", areaId: session.user.attentionAreaId }, {
    operation: "update", id: formData.get("id"), ...readCatalogFields(formData), attentionAreaId: session.user.attentionAreaId,
  });
}

export async function deleteAgentCategory(id: number) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateCategory({ role: "agent", areaId: session.user.attentionAreaId }, { operation: "delete", id });
}

export async function toggleAgentCategoryActive(id: number, newState: boolean) {
  const session = await requireAgent();
  if (!session.user.attentionAreaId) return { error: "No tienes área asignada" };
  return mutateCategory({ role: "agent", areaId: session.user.attentionAreaId }, { operation: "toggle", id, newState });
}
