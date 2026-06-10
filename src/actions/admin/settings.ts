"use server";

import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth/helpers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateAppSetting(key: string, value: string) {
    await requireAdmin();

    try {
        await db
            .insert(appSettings)
            .values({ key, value, updatedAt: new Date() })
            .onConflictDoUpdate({
                target: appSettings.key,
                set: { value, updatedAt: new Date() },
            });

        revalidatePath("/dashboard/tickets/nuevo");
        revalidatePath("/dashboard/admin/configuracion");
        revalidatePath("/dashboard/admin/config");
        revalidatePath("/dashboard", "layout");
        return { success: true };
    } catch (error) {
        console.error("Error updating setting:", error);
        return { error: "Error al actualizar configuración" };
    }
}

/**
 * Obtiene el valor de una configuración de la aplicación.
 * Requiere autenticación (cualquier usuario logueado).
 */
export async function getAppSettingAction(key: string): Promise<string | null> {
    await requireAuth();

    const setting = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, key),
    });
    return setting?.value ?? null;
}

async function updateDisabledMessage(title: string, message: string) {
    await requireAdmin();

    try {
        // Both updates are independent — run in parallel
        await Promise.all([
            updateAppSetting("ticket_disabled_title", title),
            updateAppSetting("ticket_disabled_message", message),
        ]);

        return { success: true };
    } catch (error) {
        console.error("Error updating disabled message:", error);
        return { error: "Error al actualizar mensaje" };
    }
}
