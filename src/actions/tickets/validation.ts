"use server";

import { db } from "@/db";
import { tickets, users, comments } from "@/db/schema";
import { requireAuth, requireAgent } from "@/lib/auth/helpers";
import { eq, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { TICKET_STATUS, CLOSURE_TYPE } from "@/lib/constants/tickets";
import { sendValidationRequestEmail, sendTicketResolvedEmail, sendTicketRejectedEmail } from "@/lib/email/send-emails";
import { recordStatusChange } from "@/lib/utils/status-history";

/**
 * User approves ticket closure - moves from pending_validation to resolved
 */
export async function approveTicketValidation(ticketId: number) {
  const session = await requireAuth();

  try {
    // Verify ticket exists and user is the creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        category: true,
        subcategory: true,
        attentionArea: true,
        createdBy: true,
      },
    });

    if (!ticket) {
      return { error: "Ticket no encontrado" };
    }

    if (ticket.createdById !== session.user.id) {
      return { error: "Solo el creador del ticket puede validar" };
    }

    if (ticket.status !== TICKET_STATUS.PENDING_VALIDATION) {
      return { error: "El ticket no está pendiente de validación" };
    }

    // Approve and close ticket
    await db.update(tickets)
      .set({
        status: TICKET_STATUS.RESOLVED,
        closedBy: CLOSURE_TYPE.USER,
        closedAt: new Date(),
        closedByUserId: session.user.id,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Registrar cambio de estado en historial
    await recordStatusChange(ticketId, TICKET_STATUS.PENDING_VALIDATION, TICKET_STATUS.RESOLVED, session.user.id);

    // Defer email notification after response is sent to user
    if (ticket.attentionAreaId) {
      const ticketData = ticket;
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

          await sendTicketResolvedEmail({
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            categoryName: ticketData.category?.name || 'Sin categoría',
            subcategoryName: ticketData.subcategory?.name || 'Sin subcategoría',
            ticketId: ticketData.id,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherEmails,
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
          });
        } catch (emailError) {
          console.error("Error sending resolved email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error approving validation:", error);
    return { error: "Error al aprobar la validación" };
  }
}

/**
 * User rejects ticket closure - moves from pending_validation back to in_progress
 */
export async function rejectTicketValidation(ticketId: number, rejectionMessage: string) {
  const session = await requireAuth();

  try {
    // Verify ticket exists and user is the creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        category: true,
        subcategory: true,
        attentionArea: true,
        createdBy: true,
      },
    });

    if (!ticket) {
      return { error: "Ticket no encontrado" };
    }

    if (ticket.createdById !== session.user.id) {
      return { error: "Solo el creador del ticket puede rechazar" };
    }

    if (ticket.status !== TICKET_STATUS.PENDING_VALIDATION) {
      return { error: "El ticket no está pendiente de validación" };
    }

    // Reject and move back to in_progress + insert rejection comment
    await db.transaction(async (tx) => {
      await tx.update(tickets)
        .set({
          status: TICKET_STATUS.IN_PROGRESS,
          validationRequestedAt: null, // Clear validation request
          updatedAt: new Date()
        })
        .where(eq(tickets.id, ticketId));

      // Registrar cambio de estado en historial
      await recordStatusChange(ticketId, TICKET_STATUS.PENDING_VALIDATION, TICKET_STATUS.IN_PROGRESS, session.user.id);

      // Always insert rejection comment so agents see why it was rejected
      await tx.insert(comments).values({
        content: rejectionMessage,
        ticketId: ticketId,
        userId: session.user.id,
        isInternal: false,
        type: "comment",
      });
    });

    // Defer email notification after response is sent to user
    if (ticket.attentionAreaId) {
      const ticketData = ticket;
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

          await sendTicketRejectedEmail({
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            categoryName: ticketData.category?.name || 'Sin categoría',
            subcategoryName: ticketData.subcategory?.name || 'Sin subcategoría',
            ticketId: ticketData.id,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherEmails,
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
            rejectionMessage,
          });
        } catch (emailError) {
          console.error("Error sending rejected email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/tickets");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting validation:", error);
    return { error: "Error al rechazar la validación" };
  }
}


/**
 * Admin/Agent requests validation from user - moves from in_progress to pending_validation
 */
export async function requestValidation(ticketId: number, message?: string) {
  const session = await requireAgent();

  // Only admins/agents can request validation (handled by requireAgent)

  try {
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        createdBy: true,
        category: true,
        subcategory: true,
        attentionArea: true,
      }
    });

    if (!ticket || !ticket.createdBy) {
      return { error: "Ticket no encontrado" };
    }

    if (ticket.status !== TICKET_STATUS.IN_PROGRESS) {
      return { error: "Solo se puede solicitar validación desde estado 'En Progreso'" };
    }

    if (!ticket.assignedToId) {
      return { error: "El ticket debe estar asignado para solicitar validación" };
    }

    await db.update(tickets)
      .set({
        status: TICKET_STATUS.PENDING_VALIDATION,
        validationRequestedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // Registrar cambio de estado en historial
    await recordStatusChange(ticketId, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_VALIDATION, session.user.id);

    if (message) {
      await db.insert(comments).values({
        content: message,
        ticketId: ticketId,
        userId: session.user.id,
        isInternal: false,
        type: "comment",
      });
    }

    // Defer email notification after response is sent to user
    if (ticket.attentionAreaId) {
      const ticketData = ticket;
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

          await sendValidationRequestEmail({
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            categoryName: ticketData.category?.name || 'Sin categoría',
            subcategoryName: ticketData.subcategory?.name || 'Sin subcategoría',
            ticketId: ticketData.id,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherEmails,
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
            message,
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    revalidatePath("/dashboard/explorador");
    return { success: true };
  } catch (error) {
    console.error("Error requesting validation:", error);
    return { error: "Error al solicitar validación" };
  }
}
