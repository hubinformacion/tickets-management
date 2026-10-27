"use server";

import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageTicketWatchers } from "@/lib/auth/ticket-permissions";
import { updateTicketWatchersSchema } from "@/lib/validation/schemas";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const watchersLimiter = createRateLimiter("MODERATE");

export async function updateWatchersAction(ticketId: number, watchers: string[]) {
  const session = await requireAuth();
  const parsed = updateTicketWatchersSchema.safeParse({ ticketId, watchers });
  if (!parsed.success) return { error: "Lista de observadores inválida", details: parsed.error.flatten() };
  if (!watchersLimiter(`watchers:${session.user.id}`).success) {
    return { error: "Demasiadas solicitudes. Intenta de nuevo en un momento" };
  }

  try {
    // Obtener el ticket para verificar permisos
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: {
        id: true,
        ticketCode: true,
        createdById: true,
        attentionAreaId: true,
        watchers: true,
        status: true,
      },
    });

    if (!ticket || !canManageTicketWatchers(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin permiso para modificar observadores" };
    }
    if (ticket.status === "resolved" || ticket.status === "voided") {
      return { error: "No se pueden modificar observadores de un ticket cerrado" };
    }

    const watcherIds = parsed.data.watchers;
    if (watcherIds.length > 0) {
      const activeUsers = await db.select({ id: users.id }).from(users)
        .where(and(inArray(users.id, watcherIds), eq(users.isActive, true)));
      if (activeUsers.length !== watcherIds.length) {
        return { error: "Los observadores deben ser usuarios activos existentes" };
      }
    }

    await db.update(tickets)
      .set({ watchers: watcherIds })
      .where(eq(tickets.id, ticketId));

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating watchers:", error);
    return { error: "Error al actualizar observadores" };
  }
}
