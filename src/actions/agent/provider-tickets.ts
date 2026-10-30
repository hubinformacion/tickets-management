"use server";

import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { providerTickets, providers, providerSatisfactionSurveys, tickets } from "@/db/schema";
import { requireAgent } from "@/lib/auth/helpers";
import {
  createProviderTicketSchema, updateProviderTicketSchema, closeProviderTicketSchema, ticketIdSchema,
} from "@/lib/validation/schemas";
import { createRateLimiter } from "@/lib/utils/rate-limit";
import type { ProviderTicket } from "@/types";

const rateLimiter = createRateLimiter("MODERATE", "providers:create");
const conflictMessage = "El ticket cambió durante la operación. Actualiza la página e intenta de nuevo.";

class ExistingProviderSurveyError extends Error {}

// Todas las escrituras comprueban la versión leída, incluso en un ciclo de cierre y reapertura.
function unchangedTicket(expected: ProviderTicket) {
  return and(
    eq(providerTickets.id, expected.id),
    eq(providerTickets.attentionAreaId, expected.attentionAreaId),
    eq(providerTickets.status, expected.status),
    eq(providerTickets.providerId, expected.providerId),
    eq(providerTickets.requestDate, expected.requestDate),
    expected.ticketId === null ? isNull(providerTickets.ticketId) : eq(providerTickets.ticketId, expected.ticketId),
    expected.completionDate === null ? isNull(providerTickets.completionDate) : eq(providerTickets.completionDate, expected.completionDate),
    // Date conserva milisegundos, aunque un registro antiguo tenga microsegundos.
    sql`date_trunc('milliseconds', ${providerTickets.updatedAt}) = ${expected.updatedAt.toISOString()}::timestamp`,
  );
}

function nextUpdateTime(expected: ProviderTicket) {
  return new Date(Math.max(Date.now(), expected.updatedAt.getTime() + 1));
}

async function validateReferences(providerId: number, ticketId: number | undefined, areaId: number, previousProviderId?: number) {
  const [provider, ticket] = await Promise.all([
    db.query.providers.findFirst({
      where: and(eq(providers.id, providerId), eq(providers.attentionAreaId, areaId)),
      columns: { id: true, isActive: true },
    }),
    ticketId === undefined ? Promise.resolve(null) : db.query.tickets.findFirst({
      where: and(eq(tickets.id, ticketId), eq(tickets.attentionAreaId, areaId)),
      columns: { id: true },
    }),
  ]);
  // Se puede conservar un proveedor desactivado en un ticket existente, pero no crear un enlace nuevo.
  if (!provider || (!provider.isActive && providerId !== previousProviderId)) {
    return "Proveedor no disponible en tu área";
  }
  if (ticketId !== undefined && !ticket) return "Ticket vinculado no encontrado en tu área";
  return null;
}

export async function createProviderTicketAction(formData: FormData) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "No tienes un área asignada" };

  const limit = await rateLimiter(session.user.id);
  if (!limit.success) return { error: limit.error ?? "Demasiadas solicitudes. Intenta de nuevo en un momento." };

  const result = createProviderTicketSchema.safeParse({
    externalCode: formData.get("externalCode"),
    title: formData.get("title"),
    requestDate: formData.get("requestDate"),
    description: formData.get("description"),
    providerId: formData.get("providerId"),
    ticketId: formData.get("ticketId") || undefined,
    priority: formData.get("priority") || undefined,
  });
  if (!result.success) return { error: "Datos inválidos" };

  try {
    const referenceError = await validateReferences(result.data.providerId, result.data.ticketId, areaId);
    if (referenceError) return { error: referenceError };

    await db.insert(providerTickets).values({
      ...result.data,
      ticketId: result.data.ticketId ?? null,
      priority: result.data.priority ?? null,
      attentionAreaId: areaId,
      requestedById: session.user.id,
      createdById: session.user.id,
    });
    revalidatePath("/dashboard/proveedores");
    return { success: true };
  } catch (error) {
    console.error("Error al crear el ticket de proveedor:", error);
    return { error: "Error al crear el ticket de proveedor" };
  }
}

export async function updateProviderTicketAction(formData: FormData) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "No tienes un área asignada" };

  const result = updateProviderTicketSchema.safeParse({
    id: formData.get("id"),
    externalCode: formData.get("externalCode"),
    title: formData.get("title"),
    requestDate: formData.get("requestDate"),
    description: formData.get("description"),
    providerId: formData.get("providerId"),
    status: formData.get("status"),
    ticketId: formData.get("ticketId") || undefined,
    completionDate: formData.get("completionDate") || undefined,
    priority: formData.get("priority") || undefined,
  });
  if (!result.success) return { error: "Datos inválidos" };
  // La UI edita tickets abiertos; el cierre y la reapertura tienen acciones específicas.
  if (result.data.status !== "en_proceso" || result.data.completionDate) {
    return { error: "Usa la acción de cierre o reapertura para cambiar el estado del ticket" };
  }

  try {
    const existing = await db.query.providerTickets.findFirst({
      where: and(eq(providerTickets.id, result.data.id), eq(providerTickets.attentionAreaId, areaId)),
    });
    if (!existing) return { error: "Ticket derivado no encontrado en tu área" };
    if (existing.status !== "en_proceso") return { error: "Solo se pueden editar tickets en proceso" };
    if (result.data.providerId !== existing.providerId) {
      const survey = await db.query.providerSatisfactionSurveys.findFirst({
        where: eq(providerSatisfactionSurveys.providerTicketId, existing.id), columns: { id: true },
      });
      if (survey) return { error: "No se puede cambiar el proveedor de un ticket que ya tiene una evaluación" };
    }

    const referenceError = await validateReferences(result.data.providerId, result.data.ticketId, areaId, existing.providerId);
    if (referenceError) return { error: referenceError };

    const updated = await db.update(providerTickets).set({
      externalCode: result.data.externalCode,
      title: result.data.title,
      requestDate: result.data.requestDate,
      description: result.data.description,
      providerId: result.data.providerId,
      ticketId: result.data.ticketId ?? null,
      priority: result.data.priority ?? null,
      updatedAt: nextUpdateTime(existing),
    }).where(unchangedTicket(existing)).returning({ id: providerTickets.id });
    if (updated.length === 0) return { error: conflictMessage };

    revalidatePath("/dashboard/proveedores");
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el ticket de proveedor:", error);
    return { error: "Error al actualizar el ticket de proveedor" };
  }
}

export async function closeProviderTicketAction(formData: FormData) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "No tienes un área asignada" };

  const result = closeProviderTicketSchema.safeParse({
    id: formData.get("id"),
    completionDate: formData.get("completionDate"),
    responseTimeRating: formData.get("responseTimeRating") || undefined,
    deadlineRating: formData.get("deadlineRating") || undefined,
    qualityRating: formData.get("qualityRating") || undefined,
    requirementUnderstandingRating: formData.get("requirementUnderstandingRating") || undefined,
    attentionRating: formData.get("attentionRating") || undefined,
  });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const existing = await db.query.providerTickets.findFirst({
      where: and(eq(providerTickets.id, result.data.id), eq(providerTickets.attentionAreaId, areaId)),
    });
    if (!existing) return { error: "Ticket derivado no encontrado en tu área" };
    if (existing.status !== "en_proceso") return { error: "Solo se pueden cerrar tickets en proceso" };
    if (result.data.completionDate < existing.requestDate) {
      return { error: "La fecha de cierre no puede ser anterior a la fecha de requerimiento" };
    }

    const { responseTimeRating, deadlineRating, qualityRating, requirementUnderstandingRating, attentionRating } = result.data;
    const closed = await db.transaction(async tx => {
      const updated = await tx.update(providerTickets).set({
        status: "cerrado",
        completionDate: result.data.completionDate,
        updatedAt: nextUpdateTime(existing),
      }).where(unchangedTicket(existing)).returning({ id: providerTickets.id });
      if (updated.length === 0) return false;

      if (responseTimeRating !== undefined && deadlineRating !== undefined && qualityRating !== undefined
        && requirementUnderstandingRating !== undefined && attentionRating !== undefined) {
        const inserted = await tx.insert(providerSatisfactionSurveys).values({
          providerTicketId: existing.id,
          attentionAreaId: areaId,
          submittedById: session.user.id,
          responseTimeRating, deadlineRating, qualityRating, requirementUnderstandingRating, attentionRating,
        }).onConflictDoNothing({ target: providerSatisfactionSurveys.providerTicketId }).returning({ id: providerSatisfactionSurveys.id });
        // Una evaluación previa se conserva íntegra. El error revierte también el cierre.
        if (inserted.length === 0) throw new ExistingProviderSurveyError();
      }
      return true;
    });
    if (!closed) return { error: conflictMessage };

    revalidatePath("/dashboard/proveedores");
    revalidatePath("/dashboard/encuestas");
    return { success: true };
  } catch (error) {
    if (error instanceof ExistingProviderSurveyError) {
      return { error: "Ya existe una encuesta para este ticket. Ciérralo sin una nueva encuesta para conservarla." };
    }
    console.error("Error al cerrar el ticket de proveedor:", error);
    return { error: "Error al cerrar el ticket de proveedor" };
  }
}

export async function reopenProviderTicketAction(id: number) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "No tienes un área asignada" };
  if (!ticketIdSchema.safeParse(id).success) return { error: "ID de ticket inválido" };

  try {
    const existing = await db.query.providerTickets.findFirst({
      where: and(eq(providerTickets.id, id), eq(providerTickets.attentionAreaId, areaId)),
    });
    if (!existing) return { error: "Ticket derivado no encontrado en tu área" };
    if (existing.status !== "cerrado") return { error: "Solo se pueden reabrir tickets cerrados" };

    const updated = await db.update(providerTickets).set({
      status: "en_proceso", completionDate: null, updatedAt: nextUpdateTime(existing),
    }).where(unchangedTicket(existing)).returning({ id: providerTickets.id });
    if (updated.length === 0) return { error: conflictMessage };

    revalidatePath("/dashboard/proveedores");
    return { success: true };
  } catch (error) {
    console.error("Error al reabrir el ticket de proveedor:", error);
    return { error: "Error al reabrir el ticket de proveedor" };
  }
}

export async function deleteProviderTicketAction(id: number) {
  const session = await requireAgent();
  const areaId = session.user.attentionAreaId;
  if (!areaId) return { error: "No tienes un área asignada" };
  if (!ticketIdSchema.safeParse(id).success) return { error: "ID de ticket inválido" };

  try {
    const existing = await db.query.providerTickets.findFirst({
      where: and(eq(providerTickets.id, id), eq(providerTickets.attentionAreaId, areaId)),
    });
    if (!existing) return { error: "Ticket derivado no encontrado en tu área" };

    if (existing.status !== "en_proceso") return { error: "Los tickets cerrados se conservan y no se pueden eliminar" };
    const deleted = await db.delete(providerTickets).where(and(
      unchangedTicket(existing),
      notExists(db.select({ id: providerSatisfactionSurveys.id }).from(providerSatisfactionSurveys)
        .where(eq(providerSatisfactionSurveys.providerTicketId, existing.id))),
    )).returning({ id: providerTickets.id });
    if (deleted.length === 0) return { error: "El ticket cambió o tiene una evaluación que debe conservarse. Actualiza la página." };

    revalidatePath("/dashboard/proveedores");
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el ticket de proveedor:", error);
    return { error: "Error al eliminar el ticket de proveedor" };
  }
}
