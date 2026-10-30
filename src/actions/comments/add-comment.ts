"use server";

import { db } from "@/db";
import { comments, tickets, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { TICKET_STATUS } from "@/lib/constants/tickets";
import { sendUserCommentEmail } from "@/lib/email/send-emails";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { canReadTicket } from "@/lib/auth/ticket-permissions";
import { ticketCommentSchema } from "@/lib/validation/schemas";

// Rate limiter para comentarios: 10 por minuto
const commentRateLimiter = createRateLimiter("MODERATE", "comments:create");

export async function addCommentAction(formData: FormData) {
  const session = await requireAuth();

  // Aplicar rate limiting
  const rateLimitResult = await commentRateLimiter(session.user.id);
  if (!rateLimitResult.success) {
    return { error: rateLimitResult.error ?? "Estás enviando comentarios muy rápido. Por favor, espera un momento." };
  }

  const parsed = ticketCommentSchema.safeParse({
    ticketId: formData.get("ticketId"), content: formData.get("content"),
  });
  if (!parsed.success) {
    return { error: "Comentario inválido" };
  }
  const { ticketId, content } = parsed.data;

  try {
    // Get full ticket details including creator
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        category: true,
        subcategory: true,
        attentionArea: true,
        createdBy: true,
      },
    });

    if (!ticket || !canReadTicket(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin acceso" };
    }

    if (ticket.status === TICKET_STATUS.RESOLVED || ticket.status === TICKET_STATUS.VOIDED) {
      return { error: "No se puede comentar en un ticket cerrado" };
    }

    await db.insert(comments).values({
      ticketId,
      userId: session.user.id,
      content,
      isInternal: false,
      type: "comment",
    });

    // Defer email notification after response is sent to user
    if (ticket.attentionAreaId) {
      const ticketData = ticket;
      const userEmail = session.user.email;
      const userName = session.user.name;
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

          await sendUserCommentEmail({
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            status: ticketData.status,
            priority: ticketData.priority || 'medium',
            categoryName: ticketData.category?.name || 'Sin categoría',
            subcategoryName: ticketData.subcategory?.name || 'Sin subcategoría',
            ticketId: ticketData.id,
            comment: content,
            userEmail,
            userName,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherEmails,
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
          });
        } catch (emailError) {
          console.error("Error sending comment notification email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { error: "Error al guardar el comentario" };
  }
}
