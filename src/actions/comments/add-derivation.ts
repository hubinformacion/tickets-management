"use server";

import { db } from "@/db";
import { comments, tickets, users, providerTickets } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import { TICKET_STATUS } from "@/lib/constants/tickets";
import { sendDerivationEmail } from "@/lib/email/send-emails";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { formatCalendarDate } from "@/lib/utils/format";
import type { DerivationMetadata } from "@/types";
import { canManageTicket } from "@/lib/auth/ticket-permissions";
import { ticketDerivationSchema } from "@/lib/validation/schemas";

// Rate limiter para derivaciones: 10 por minuto
const derivationRateLimiter = createRateLimiter('MODERATE');

export async function addDerivationAction(formData: FormData) {
  const session = await requireAgent();

  // Aplicar rate limiting
  const rateLimitResult = derivationRateLimiter(`derivation-${session.user.id}`);
  if (!rateLimitResult.success) {
    return { error: "Estás registrando derivaciones muy rápido. Por favor, espera un momento." };
  }

  const parsed = ticketDerivationSchema.safeParse({
    ticketId: formData.get("ticketId"),
    providerName: formData.get("providerName"),
    estimatedDate: formData.get("estimatedDate") || undefined,
    note: formData.get("note") || undefined,
    providerTicketId: formData.get("providerTicketId") ? Number(formData.get("providerTicketId")) : undefined,
  });
  if (!parsed.success) {
    return { error: "Datos de derivación inválidos" };
  }
  const { ticketId, providerName, estimatedDate, note, providerTicketId } = parsed.data;

  try {
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: {
        createdBy: true,
        attentionArea: true,
      },
    });

    if (!ticket || !canManageTicket(session.user, ticket)) {
      return { error: "Ticket no encontrado o sin acceso" };
    }

    if (providerTicketId) {
      if (!ticket.attentionAreaId) return { error: "El ticket no tiene un área asignada" };
      const providerTicket = await db.query.providerTickets.findFirst({
        where: and(eq(providerTickets.id, providerTicketId), eq(providerTickets.attentionAreaId, ticket.attentionAreaId)),
        columns: { id: true, ticketId: true },
      });
      if (!providerTicket || (providerTicket.ticketId !== null && providerTicket.ticketId !== ticket.id)) {
        return { error: "El ticket del proveedor no pertenece a este ticket o área" };
      }
    }

    if (ticket.status === TICKET_STATUS.RESOLVED || ticket.status === TICKET_STATUS.VOIDED) {
      return { error: "No se puede registrar una derivación en un ticket cerrado" };
    }

    const metadata: DerivationMetadata = {
      providerName,
      ...(estimatedDate && { estimatedDate }),
      ...(providerTicketId && { providerTicketId }),
      ...(note && { note }),
    };

    // Construir mensaje descriptivo para la actividad
    const content = `Derivado a ${providerName}`;

    await db.insert(comments).values({
      ticketId,
      userId: session.user.id,
      content,
      isInternal: false,
      type: "derivation",
      metadata,
    });

    // Enviar notificación por correo después de responder
    if (ticket.attentionAreaId) {
      const ticketData = ticket;
      const userName = session.user.name;
      const derivationEstimatedDate = estimatedDate;
      const derivationProviderName = providerName;

      after(async () => {
        try {
          // Obtener agentes y watchers en paralelo
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

          await sendDerivationEmail({
            ticketId: ticketData.id,
            ticketCode: ticketData.ticketCode,
            title: ticketData.title,
            creatorEmail: ticketData.createdBy.email,
            creatorName: ticketData.createdBy.name,
            agentEmails: agentData.map(a => a.email),
            watcherEmails: watcherData.map(w => w.email),
            attentionAreaName: ticketData.attentionArea?.name || 'Hub de Información',
            emailThreadId: ticketData.emailThreadId,
            initialMessageId: ticketData.initialMessageId,
            providerName: derivationProviderName,
            estimatedDate: derivationEstimatedDate
              ? formatCalendarDate(derivationEstimatedDate)
              : undefined,
            userName,
            note,
          });
        } catch (emailError) {
          console.error("Error sending derivation notification email:", emailError);
        }
      });
    }

    revalidatePath(`/dashboard/tickets/${ticket.ticketCode}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding derivation:", error);
    return { error: "Error al registrar la derivación" };
  }
}
