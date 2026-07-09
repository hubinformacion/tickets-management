"use server";

import { db } from "@/db";
import { attentionAreas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/helpers";
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

const attentionAreaSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  slug: z.string().min(3, "El slug debe tener al menos 3 caracteres"),
  isAcceptingTickets: z.boolean().default(true),
  businessStartTime: timeStringSchema.default("08:30"),
  businessEndTime: timeStringSchema.default("18:30"),
  businessDays: businessDaysSchema.default("1,2,3,4,5"),
}).refine(
  (data) => data.businessStartTime < data.businessEndTime,
  { message: "La hora de inicio debe ser anterior a la hora de fin", path: ["businessEndTime"] }
);

export async function createAttentionArea(formData: FormData) {
  await requireAdmin();

  const rawData = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    isAcceptingTickets: formData.get("isAcceptingTickets") === "true",
    businessStartTime: formData.get("businessStartTime") || "08:30",
    businessEndTime: formData.get("businessEndTime") || "18:30",
    businessDays: formData.get("businessDays") || "1,2,3,4,5",
  };

  const result = attentionAreaSchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.issues[0]?.message;
    return { error: firstError || "Datos inválidos" };
  }

  try {
    await db.insert(attentionAreas).values(result.data);
    revalidatePath("/dashboard/sistema");
    return { success: true };
  } catch (error) {
    console.error("Error creating attention area:", error);
    return { error: "Error al crear el área" };
  }
}

export async function updateAttentionArea(id: number, formData: FormData) {
  await requireAdmin();

  const rawData = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    isAcceptingTickets: formData.get("isAcceptingTickets") === "true",
    businessStartTime: formData.get("businessStartTime") || "08:30",
    businessEndTime: formData.get("businessEndTime") || "18:30",
    businessDays: formData.get("businessDays") || "1,2,3,4,5",
  };

  const result = attentionAreaSchema.safeParse(rawData);

  if (!result.success) {
    const firstError = result.error.issues[0]?.message;
    return { error: firstError || "Datos inválidos" };
  }

  try {
    await db.update(attentionAreas)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(eq(attentionAreas.id, id));

    revalidatePath("/dashboard/sistema");
    return { success: true };
  } catch (error) {
    console.error("Error updating attention area:", error);
    return { error: "Error al actualizar el área" };
  }
}
