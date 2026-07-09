"use server";

import { db } from "@/db";
import { attentionAreas } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const timeStringSchema = z.string().regex(
  /^([01]\d|2[0-3]):([0-5]\d)$/,
  "Formato de hora inválido (HH:MM)"
);

const businessDaysSchema = z.string().regex(
  /^[0-6](,[0-6])*$/,
  "Formato de días inválido"
);

const businessHoursSchema = z.object({
  businessStartTime: timeStringSchema,
  businessEndTime: timeStringSchema,
  businessDays: businessDaysSchema.default("1,2,3,4,5"),
}).refine(
  (data) => data.businessStartTime < data.businessEndTime,
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["businessEndTime"] }
);

export async function updateBusinessHoursAction(formData: FormData) {
  const session = await requireAgent();

  if (!session.user.attentionAreaId) {
    return { error: "No tienes área asignada" };
  }

  const rawData = {
    businessStartTime: formData.get("businessStartTime"),
    businessEndTime: formData.get("businessEndTime"),
    businessDays: formData.get("businessDays") || "1,2,3,4,5",
  };

  const result = businessHoursSchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.issues[0]?.message;
    return { error: firstError || "Datos inválidos" };
  }

  try {
    await db
      .update(attentionAreas)
      .set({
        businessStartTime: result.data.businessStartTime,
        businessEndTime: result.data.businessEndTime,
        businessDays: result.data.businessDays,
        updatedAt: new Date(),
      })
      .where(eq(attentionAreas.id, session.user.attentionAreaId));

    revalidatePath("/dashboard/configuracion");

    return { success: true };
  } catch (error) {
    console.error("Error updating business hours:", error);
    return { error: "No se pudo actualizar el horario" };
  }
}
