import { db } from "@/db";
import { tickets, attentionAreas, ticketAttachments } from "@/db/schema";
import { sql, eq, and, isNull } from "drizzle-orm";
import { recordStatusChange } from "@/lib/utils/status-history";
import type { TicketStatus } from "@/types";

interface TicketCreationOptions {
  uploadToken?: string;
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

/**
 * Inserta un ticket con código atómico generado por la BD.
 * Formato: {SLUG}-YYYY-#### (ej: TSI-2026-0001). Se reinicia cada año por área.
 *
 * El UPSERT del contador bloquea su fila y confirma ticket, historial inicial
 * y vinculación de adjuntos juntos. Reintenta hasta 3 veces ante un conflicto
 * de constraint UNIQUE; cualquier fallo revierte toda la transacción.
 */
export async function insertTicketWithCode(
  values: Omit<typeof tickets.$inferInsert, "ticketCode" | "status"> & { status?: TicketStatus },
  options: TicketCreationOptions = {},
): Promise<{ id: number; ticketCode: string }> {
  const maxRetries = 3;
  const currentYear = Number(new Intl.DateTimeFormat("en", {
    year: "numeric", timeZone: "America/Lima",
  }).format(new Date()));

  if (!values.attentionAreaId) {
    throw new Error("Se requiere un área de atención para generar el código de ticket");
  }

  const areaId = values.attentionAreaId;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        // 1. Obtener el slug del área de atención
        const area = await tx.query.attentionAreas.findFirst({
          where: eq(attentionAreas.id, areaId),
          columns: { slug: true },
        });

        if (!area) {
          throw new Error(`Área de atención con ID ${areaId} no encontrada`);
        }

        // 2. Obtener o crear el contador para esta área+año con bloqueo de fila
        const sequenceResult = await tx.execute(
          sql`INSERT INTO ticket_sequence (attention_area_id, year, last_number)
                        VALUES (${areaId}, ${currentYear}, 1)
                        ON CONFLICT (attention_area_id, year)
                        DO UPDATE SET last_number = ticket_sequence.last_number + 1
                        RETURNING last_number`
        );

        const nextNum = Number(sequenceResult.rows[0].last_number);
        const ticketCode = `${area.slug}-${currentYear}-${nextNum.toString().padStart(4, "0")}`;

        // 3. Insertar el ticket con el código generado
        const [created] = await tx
          .insert(tickets)
          .values({ ...values, ticketCode })
          .returning({ id: tickets.id, ticketCode: tickets.ticketCode });

        if (!created) throw new Error("No se pudo crear el ticket");
        await recordStatusChange(created.id, null, values.status ?? "open", values.createdById, undefined, tx);
        if (options.uploadToken) {
          await tx.update(ticketAttachments).set({ ticketId: created.id, uploadToken: null })
            .where(and(
              eq(ticketAttachments.uploadToken, options.uploadToken),
              eq(ticketAttachments.uploadedById, values.createdById),
              isNull(ticketAttachments.ticketId),
            ));
        }
        return created;
      });

      return result;
    } catch (error: unknown) {
      // Si es violación de UNIQUE constraint, reintentar
      if (isUniqueViolation(error) && attempt < maxRetries) {
        continue;
      }
      throw error;
    }
  }

  // Nunca debería llegar aquí, pero TypeScript lo requiere
  throw new Error("No se pudo generar el código de ticket después de múltiples intentos");
}
