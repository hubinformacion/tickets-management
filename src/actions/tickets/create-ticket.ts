"use server";

import { db } from "@/db";
import { tickets, users, attentionAreas, ticketCategories, ticketSubcategories, ticketAttachments } from "@/db/schema";
import { createTicketSchema, createFedTicketSchema, createDiffusionTicketSchema } from "@/lib/validation/schemas";
import { requireAuth } from "@/lib/auth/helpers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { TICKET_STATUS } from "@/lib/constants/tickets";
import { sendTicketCreatedEmail } from "@/lib/email/send-emails";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import { recordStatusChange } from "@/lib/utils/status-history";

// Rate limiter: 5 tickets por minuto por usuario
const ticketRateLimiter = createRateLimiter('MODERATE');

export async function createTicketAction(formData: FormData) {
  const session = await requireAuth();

  // Aplicar rate limiting
  const rateLimitResult = ticketRateLimiter(session.user.id);
  if (!rateLimitResult.success) {
    const resetDate = new Date(rateLimitResult.reset);
    const resetTime = resetDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return {
      error: `Has alcanzado el límite de creación de tickets. Por favor, espera hasta las ${resetTime} para crear más tickets.`
    };
  }

  // Determinar el slug del área para elegir el schema de validación
  const attentionAreaIdRaw = formData.get("attentionAreaId");
  const attentionAreaIdNum = Number(attentionAreaIdRaw);

  if (!attentionAreaIdNum || isNaN(attentionAreaIdNum)) {
    return { error: "Selecciona un área de atención" };
  }

  // Obtener el área para saber si es Difusión
  const targetArea = await db.query.attentionAreas.findFirst({
    where: eq(attentionAreas.id, attentionAreaIdNum),
  });

  if (!targetArea) {
    return { error: "Área de atención inválida" };
  }

  if (!targetArea.isAcceptingTickets) {
    return {
      error: "Esta área no está aceptando tickets en este momento.",
    };
  }

  const isDiffusion = targetArea.slug === "DIF";
  const isFondoEditorial = targetArea.slug === "FED";

  // Validar según el tipo de formulario
  let title: string;
  let description: string;
  let priority: string | null = null;
  let categoryId: number;
  let subcategoryId: number;
  let attentionAreaId: number;
  let activityStartDate: string | null = null;
  let desiredDiffusionDate: string | null = null;
  let targetAudience: string | null = null;
  let metadata: Record<string, unknown> | null = null;
  let allowAttachments = true;

  if (isDiffusion) {
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      categoryId: formData.get("categoryId"),
      subcategoryId: formData.get("subcategoryId"),
      attentionAreaId: formData.get("attentionAreaId"),
      activityStartDate: formData.get("activityStartDate"),
      desiredDiffusionDate: formData.get("desiredDiffusionDate"),
      targetAudience: formData.get("targetAudience"),
    };

    const result = createDiffusionTicketSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Datos inválidos", details: result.error.flatten() };
    }

    ({ title, description, priority, categoryId, subcategoryId, attentionAreaId } = result.data);
    activityStartDate = result.data.activityStartDate;
    desiredDiffusionDate = result.data.desiredDiffusionDate;
    targetAudience = result.data.targetAudience;
  } else if (isFondoEditorial) {
    // Parsear metadata FED del FormData
    let parsedMetadata: Record<string, unknown> | undefined;
    const metadataRaw = formData.get("metadata");
    if (metadataRaw && typeof metadataRaw === "string") {
      try {
        parsedMetadata = JSON.parse(metadataRaw);
      } catch {
        return { error: "Metadata de Fondo Editorial inválida" };
      }
    }

    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      categoryId: formData.get("categoryId"),
      subcategoryId: formData.get("subcategoryId"),
      attentionAreaId: formData.get("attentionAreaId"),
      metadata: parsedMetadata,
    };

    const result = createFedTicketSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Datos inválidos", details: result.error.flatten() };
    }

    ({ title, description, priority, categoryId, subcategoryId, attentionAreaId } = result.data);
    metadata = result.data.metadata ?? null;

    // Validación detallada por subcategoría de Fondo Editorial
    const subcat = await db.query.ticketSubcategories.findFirst({
      where: eq(ticketSubcategories.id, subcategoryId),
      columns: { name: true },
    });

    if (subcat) {
      const { getFedFieldConfig } = require("@/lib/constants/fed-fields");
      const config = getFedFieldConfig(subcat.name);
      if (config) {
        allowAttachments = config.allowAttachments ?? false;
        const metaObj = metadata || {};
        if (config.requestType && !metaObj.requestType) {
          return { error: "El tipo de solicitud es obligatorio." };
        }
        if (config.documentLink?.required && !metaObj.documentLink) {
          return { error: "El enlace al documento/carpeta es obligatorio." };
        }
        if (config.quantity?.required && !metaObj.quantity) {
          return { error: `El campo '${config.quantity.label}' es obligatorio.` };
        }
        if (config.numberOfPages?.required && !metaObj.numberOfPages) {
          return { error: "El número de páginas es obligatorio." };
        }
        if (config.maxWords && description) {
          const plainText = description.replace(/<[^>]*>/g, " ").trim();
          const wordCount = plainText.split(/\s+/).filter(Boolean).length;
          if (wordCount > config.maxWords) {
            return { error: `La descripción de esta subcategoría no debe superar las ${config.maxWords} palabras.` };
          }
        }
      }
    }
  } else {
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      categoryId: formData.get("categoryId"),
      subcategoryId: formData.get("subcategoryId"),
      attentionAreaId: formData.get("attentionAreaId"),
    };

    const result = createTicketSchema.safeParse(rawData);
    if (!result.success) {
      return { error: "Datos inválidos", details: result.error.flatten() };
    }

    ({ title, description, priority, categoryId, subcategoryId, attentionAreaId } = result.data);
  }

  // Parse watchers (user IDs)
  let watcherList: string[] = [];
  const watchersData = formData.get("watchers");
  if (watchersData && typeof watchersData === "string") {
    try {
      watcherList = JSON.parse(watchersData as string);
    } catch (e) {
      console.error("Error parsing watchers:", e);
    }
  }

  let ticketId: number;
  let ticketCode: string;

  try {
    // Inserción atómica: genera el código y crea el ticket en una sola transacción
    const { insertTicketWithCode } = await import("@/lib/utils/ticket-code");
    const newTicket = await insertTicketWithCode({
      title,
      description,
      priority,
      status: TICKET_STATUS.OPEN,
      createdById: session.user.id,
      categoryId,
      subcategoryId,
      attentionAreaId,
      watchers: watcherList,
      // Campos de Difusión (null para TSI/FED)
      activityStartDate,
      desiredDiffusionDate,
      targetAudience,
      // Metadata dinámica (FED)
      metadata,
    });

    ticketId = newTicket.id;
    ticketCode = newTicket.ticketCode;

    // Registrar estado inicial en historial
    await recordStatusChange(ticketId, null, TICKET_STATUS.OPEN, session.user.id);

    // Vincular archivos adjuntos al ticket (solo para áreas que no son Difusión y que permitan adjuntos)
    if (!isDiffusion && allowAttachments) {
      const uploadToken = formData.get("uploadToken") as string | null;
      if (uploadToken) {
        await db.update(ticketAttachments)
          .set({ ticketId: ticketId, uploadToken: null })
          .where(
            and(
              eq(ticketAttachments.uploadToken, uploadToken),
              eq(ticketAttachments.uploadedById, session.user.id),
              isNull(ticketAttachments.ticketId)
            )
          );
      }
    }

    // Defer email notification after response is sent to user
    after(async () => {
      try {
        // Get category, subcategory, watcher, and agent data in parallel
        const [category, subcategory, watcherData, agentData] = await Promise.all([
          db.query.ticketCategories.findFirst({
            where: eq(ticketCategories.id, categoryId),
          }),
          db.query.ticketSubcategories.findFirst({
            where: eq(ticketSubcategories.id, subcategoryId),
          }),
          watcherList.length > 0
            ? db.select({ email: users.email })
              .from(users)
              .where(inArray(users.id, watcherList))
            : Promise.resolve([] as { email: string }[]),
          db.select({ email: users.email })
            .from(users)
            .where(and(
              eq(users.role, 'agent'),
              eq(users.attentionAreaId, attentionAreaId)
            )),
        ]);

        const watcherEmails = watcherData.map(w => w.email);

        const emailResult = await sendTicketCreatedEmail({
          ticketCode,
          title,
          description,
          priority: priority || 'medium', // Fallback para emails de Difusión
          categoryName: category?.name || 'Sin categoría',
          subcategoryName: subcategory?.name || 'Sin subcategoría',
          createdAt: new Date(),
          ticketId,
          creatorEmail: session.user.email,
          creatorName: session.user.name,
          agentEmails: agentData.map(a => a.email),
          watcherEmails,
          attentionAreaName: targetArea.name,
        });

        if (emailResult.success) {
          // Update ticket with threading info
          // 1. Thread ID (Gmail Native)
          // 2. Initial Message ID (RFC Header for recipients) - NEW ROBUST METHOD
          await db.update(tickets)
            .set({
              emailThreadId: emailResult.data?.threadId,
              initialMessageId: emailResult.data?.rfcMessageId // Captured from actual sent email
            })
            .where(eq(tickets.id, ticketId));
        }
      } catch (emailError) {
        // Log error but don't fail ticket creation
        console.error("Error sending email:", emailError);
      }
    });

  } catch (error) {
    console.error("Error creating ticket:", error);
    return { error: "Error interno del servidor al crear el ticket" };
  }

  // Redirect to ticket detail page (outside try-catch to avoid catching NEXT_REDIRECT)
  redirect(`/dashboard/tickets/${ticketCode}`);
}
