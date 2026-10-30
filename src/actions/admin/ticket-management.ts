"use server";

import { db } from "@/db";
import { tickets, users } from "@/db/schema";
import { requireAgent, requireAdmin } from "@/lib/auth/helpers";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { purgeTicketCompletely, TicketPurgeError } from "@/lib/tickets/purge-ticket";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { TICKET_STATUS, VALID_STATUS_TRANSITIONS, STATUS_LABELS } from "@/lib/constants/tickets";
import { sendTicketAssignedEmail } from "@/lib/email/send-emails";
import { recordStatusChange } from "@/lib/utils/status-history";
import type { TicketStatus } from "@/types";
import { canManageTicket } from "@/lib/auth/ticket-permissions";
import { ticketIdSchema, ticketStatusSchema } from "@/lib/validation/schemas";
import { transitionTicket } from "@/lib/utils/ticket-transition";
import { createRateLimiter } from "@/lib/utils/rate-limit";

const purgeRateLimiter = createRateLimiter("RELAXED", "tickets:admin:delete");

export async function assignTicketToSelf(ticketId: number) {
  const session = await requireAgent();
  if (!ticketIdSchema.safeParse(ticketId).success) return { error: "Ticket inválido" };

  try {
    // Get full ticket details for email
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        category: true,
        subcategory: true,
        attentionArea: true,
        createdBy: true,
      },
    });

    if (!ticket || !canManageTicket(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin acceso" };
    }
    if (ticket.status !== TICKET_STATUS.OPEN || ticket.assignedToId) {
      return { error: "Solo se pueden asignar tickets abiertos sin responsable" };
    }
    const assigned = await db.transaction(async tx => {
      const rows = await tx.update(tickets).set({
        assignedToId: session.user.id, status: TICKET_STATUS.IN_PROGRESS,
        assignedAt: new Date(), updatedAt: new Date(),
        closedAt: null, closedBy: null, closedByUserId: null, validationRequestedAt: null,
      }).where(and(
        eq(tickets.id, ticketId), eq(tickets.status, TICKET_STATUS.OPEN), isNull(tickets.assignedToId),
        ticket.attentionAreaId === null ? isNull(tickets.attentionAreaId) : eq(tickets.attentionAreaId, ticket.attentionAreaId),
      )).returning({ id: tickets.id });
      if (rows.length === 0) return false;
      await recordStatusChange(ticketId, TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, session.user.id, undefined, tx);
      return true;
    });
    if (!assigned) return { error: "El ticket cambió. Actualiza la página e intenta de nuevo" };

    if (ticket && ticket.attentionAreaId) {
      // Defer email notification after response is sent to user
      const ticketData = ticket;
      const agentName = session.user.name;
      after(async () => {
        try {
          // Get agents and watchers in parallel
          const [agentData, watcherData] = await Promise.all([
            db.select({ email: users.email })
              .from(users)
              .where(and(
                eq(users.role, 'agent'),
                eq(users.attentionAreaId, ticketData.attentionAreaId!)
              )),
            ticketData.watchers && ticketData.watchers.length > 0
              ? db.select({ email: users.email })
                .from(users)
                .where(inArray(users.id, ticketData.watchers))
              : Promise.resolve([] as { email: string }[]),
          ]);

          const watcherEmails = watcherData.map(w => w.email);

          await sendTicketAssignedEmail({
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            categoryName: ticketData.category?.name || 'Sin categoría',
            subcategoryName: ticketData.subcategory?.name || 'Sin subcategoría',
            ticketId: ticketData.id,
            agentName,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherEmails,
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
          });
        } catch (emailError) {
          console.error("Error sending assigned email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket?.ticketCode ?? ticketId}`);
    revalidatePath("/dashboard/explorador");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return { error: "Error al asignar el ticket" };
  }
}

export async function unassignTicket(ticketId: number) {
  const session = await requireAgent();
  if (!ticketIdSchema.safeParse(ticketId).success) return { error: "Ticket inválido" };

  try {
    // Obtener ticketCode antes de actualizar
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { ticketCode: true, attentionAreaId: true, assignedToId: true, status: true },
    });

    if (!ticket || !canManageTicket(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin acceso" };
    }
    if (!ticket.assignedToId) return { error: "El ticket no tiene responsable asignado" };

    const updated = await db.update(tickets)
      .set({
        assignedToId: null,
        assignedAt: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(tickets.id, ticketId), eq(tickets.assignedToId, ticket.assignedToId), eq(tickets.status, ticket.status),
        ticket.attentionAreaId === null ? isNull(tickets.attentionAreaId) : eq(tickets.attentionAreaId, ticket.attentionAreaId),
      )).returning({ id: tickets.id });
    if (updated.length === 0) return { error: "El ticket cambió. Actualiza la página e intenta de nuevo" };

    revalidatePath(`/dashboard/tickets/${ticket?.ticketCode ?? ticketId}`);
    revalidatePath("/dashboard/explorador");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error unassigning ticket:", error);
    return { error: "Error al desasignar el ticket" };
  }
}

export async function updateTicketStatus(ticketId: number, newStatus: TicketStatus) {
  const session = await requireAgent();
  if (!ticketIdSchema.safeParse(ticketId).success || !ticketStatusSchema.safeParse(newStatus).success) {
    return { error: "Ticket o estado inválido" };
  }
  if (newStatus === TICKET_STATUS.PENDING_VALIDATION) {
    return { error: "Usa la solicitud de validación para notificar al creador" };
  }

  try {
    // Obtener el estado actual del ticket para validar la transición
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
    });

    if (!ticket || !canManageTicket(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin acceso" };
    }

    const currentStatus = ticket.status as TicketStatus;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions?.includes(newStatus)) {
      return {
        error: `No se puede cambiar de "${STATUS_LABELS[currentStatus]}" a "${STATUS_LABELS[newStatus]}"`
      };
    }

    const updated = await transitionTicket(ticket, newStatus, session.user.id);
    if (!updated) return { error: "El ticket cambió. Actualiza la página e intenta de nuevo" };

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/explorador");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return { error: "Error al actualizar el estado" };
  }
}

export async function deepDeleteTicketAction(ticketId: number) {
  const session = await requireAdmin();
  if (!ticketIdSchema.safeParse(ticketId).success) return { error: "Ticket inválido" };
  const limit = await purgeRateLimiter(session.user.id);
  if (!limit.success) return { error: limit.error ?? "Demasiadas solicitudes. Intenta de nuevo en un momento." };

  try {
    const result = await purgeTicketCompletely(session.user, ticketId);
    if (result.ticketCode) revalidatePath(`/dashboard/tickets/${result.ticketCode}`);
    revalidatePath("/dashboard/explorador");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof TicketPurgeError) {
      if (error.ticketCode) revalidatePath(`/dashboard/tickets/${error.ticketCode}`);
      return { error: error.message };
    }
    console.error("No se pudo confirmar la eliminación completa del ticket");
    return { error: "No se pudo confirmar la eliminación completa. Vuelve a intentar." };
  }
}
