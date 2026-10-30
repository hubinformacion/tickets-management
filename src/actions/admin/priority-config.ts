"use server";

import { db } from "@/db";
import { priorityConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/helpers";
import { updatePriorityConfigSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const rateLimiter = createRateLimiter("MODERATE", "priorities:admin:update");

export async function updatePriorityConfigAction(formData: FormData) {
  const session = await requireAdmin();

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
    await db.update(priorityConfig)
      .set({
        description: result.data.description,
        slaHours: result.data.slaHours,
      })
      .where(eq(priorityConfig.id, result.data.id));

    revalidatePath("/dashboard/admin/sistema");
    revalidatePath("/dashboard/tickets/nuevo");
    return { success: true };
  } catch (error) {
    console.error("Error updating priority config:", error);
    return { error: "Error al actualizar la configuración de prioridad" };
  }
}
