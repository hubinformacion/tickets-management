"use server";

import { db } from "@/db";
import { tickets, users, comments, ticketAttachments, satisfactionSurveys, providerTickets, providerSatisfactionSurveys, ticketStatusHistory } from "@/db/schema";
import { requireAgent, requireAdmin } from "@/lib/auth/helpers";
import { eq, inArray, and } from "drizzle-orm";
import { deleteFileFromDrive } from "@/lib/drive/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { TICKET_STATUS, VALID_STATUS_TRANSITIONS, STATUS_LABELS } from "@/lib/constants/tickets";
import { sendTicketAssignedEmail } from "@/lib/email/send-emails";
import { recordStatusChange } from "@/lib/utils/status-history";
import type { TicketStatus } from "@/types";

export async function assignTicketToSelf(ticketId: number) {
  const session = await requireAgent();

  try {
    await db.update(tickets)
      .set({
        assignedToId: session.user.id,
        status: TICKET_STATUS.IN_PROGRESS,
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Registrar cambio de estado en historial
    await recordStatusChange(ticketId, TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, session.user.id);

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
  await requireAgent();

  try {
    // Obtener ticketCode antes de actualizar
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { ticketCode: true },
    });

    await db.update(tickets)
      .set({
        assignedToId: null,
        assignedAt: null,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

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

  try {
    // Obtener el estado actual del ticket para validar la transición
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      columns: { status: true, ticketCode: true },
    });

    if (!ticket) {
      return { error: "Ticket no encontrado" };
    }

    const currentStatus = ticket.status as TicketStatus;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      return {
        error: `No se puede cambiar de "${STATUS_LABELS[currentStatus]}" a "${STATUS_LABELS[newStatus]}"`
      };
    }

    await db.update(tickets)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Registrar cambio de estado en historial
    await recordStatusChange(ticketId, currentStatus, newStatus, session.user.id);

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
  await requireAdmin();

  try {
    const targetTicket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: { attachments: true }
    });

    if (!targetTicket) {
      return { error: "Ticket no encontrado" };
    }

    // Eliminar archivos adjuntos de Google Drive en paralelo
    if (targetTicket.attachments && targetTicket.attachments.length > 0) {
      await Promise.allSettled(
        targetTicket.attachments.map((file) =>
          deleteFileFromDrive(file.driveFileId).catch((driveErr) => {
            console.error("Failed to delete file from Drive:", driveErr);
          })
        )
      );
    }

    // Operaciones en la BD usando transacción
    await db.transaction(async (tx) => {
      // 1. Encuestas de satisfacción a proveedores
      const pTickets = await tx.select({ id: providerTickets.id }).from(providerTickets).where(eq(providerTickets.ticketId, ticketId));
      if (pTickets.length > 0) {
        await tx.delete(providerSatisfactionSurveys).where(inArray(providerSatisfactionSurveys.providerTicketId, pTickets.map(pt => pt.id)));
      }

      // 2. Tickets de proveedores
      await tx.delete(providerTickets).where(eq(providerTickets.ticketId, ticketId));

      // 3. Encuestas de satisfacción del usuario
      await tx.delete(satisfactionSurveys).where(eq(satisfactionSurveys.ticketId, ticketId));

      // 4. Historial de cambios de estado
      await tx.delete(ticketStatusHistory).where(eq(ticketStatusHistory.ticketId, ticketId));

      // 5. Comentarios e historial de actividad
      await tx.delete(comments).where(eq(comments.ticketId, ticketId));

      // 6. Archivos adjuntos (aunque tienen CASCADE, es seguro forzarlo)
      await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, ticketId));

      // 7. Eliminar el propio ticket
      await tx.delete(tickets).where(eq(tickets.id, ticketId));
    });

    revalidatePath("/dashboard/explorador");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deeply deleting ticket:", error);
    return { error: "Error al intentar eliminar el ticket permanentemente" };
  }
}
