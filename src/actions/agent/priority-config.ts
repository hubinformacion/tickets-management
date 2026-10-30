"use server";

import { db } from "@/db";
import { priorityConfig } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { updatePriorityConfigSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const rateLimiter = createRateLimiter("MODERATE", "priorities:agent:update");

export async function updateAgentPriorityConfigAction(formData: FormData) {
  const session = await requireAgent();

  if (!session.user.attentionAreaId) {
    return { error: "No tienes área asignada" };
  }

  const rateLimitResult = await rateLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return { error: rateLimitResult.error ?? "Has alcanzado el límite de solicitudes. Inténtalo en un momento." };
  }

  const rawData = {
    id: formData.get("id"),
    description: formData.get("description"),
    slaHours: formData.get("slaHours"),
  };

  const result = updatePriorityConfigSchema.safeParse(rawData);

  if (!result.success) {
    return { error: "Datos inválidos" };
  }

  try {
    // Verify the config belongs to the agent's area
    const config = await db.query.priorityConfig.findFirst({
      where: and(
        eq(priorityConfig.id, result.data.id),
        eq(priorityConfig.attentionAreaId, session.user.attentionAreaId),
      ),
    });

    if (!config) {
      return { error: "Configuración no encontrada o no pertenece a tu área" };
    }

    await db.update(priorityConfig)
      .set({
        description: result.data.description,
        slaHours: result.data.slaHours,
      })
      .where(eq(priorityConfig.id, result.data.id));

    revalidatePath("/dashboard/configuracion");
    revalidatePath("/dashboard/tickets/nuevo");
    return { success: true };
  } catch (error) {
    console.error("Error updating agent priority config:", error);
    return { error: "Error al actualizar la configuración de prioridad" };
  }
}
