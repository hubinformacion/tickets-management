import { db } from "@/db";
import { tickets, attentionAreas } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

/**
 * Inserta un ticket con código atómico generado por la BD.
 * Formato: {SLUG}-YYYY-#### (ej: TSI-2026-0001). Se reinicia cada año por área.
 *
 * Usa una transacción con SELECT ... FOR UPDATE sobre la fila del contador
 * para garantizar secuencialidad sin colisiones. Reintenta hasta 3 veces
 * como red de seguridad ante conflictos de constraint UNIQUE.
 */
export async function insertTicketWithCode(
  values: Omit<typeof tickets.$inferInsert, "ticketCode">
): Promise<{ id: number; ticketCode: string }> {
  const maxRetries = 3;
  const currentYear = new Date().getFullYear();

  if (!values.attentionAreaId) {
    throw new Error("Se requiere un área de atención para generar el código de ticket");
  }

  const areaId = values.attentionAreaId;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [result] = await db.transaction(async (tx) => {
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
        return tx
          .insert(tickets)
          .values({ ...values, ticketCode })
          .returning({ id: tickets.id, ticketCode: tickets.ticketCode });
      });

      return result;
    } catch (error: unknown) {
      // Si es violación de UNIQUE constraint, reintentar
      const isUniqueViolation =
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "23505";

      if (isUniqueViolation && attempt < maxRetries) {
        continue;
      }
      throw error;
    }
  }

  // Nunca debería llegar aquí, pero TypeScript lo requiere
  throw new Error("No se pudo generar el código de ticket después de múltiples intentos");
}
