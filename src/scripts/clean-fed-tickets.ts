/**
 * Script: Eliminar tickets de prueba de Fondo Editorial (FED)
 *
 * IMPORTANTE: Este script SOLO elimina tickets que pertenecen al área
 * de atención "Fondo Editorial" (slug: FED). Las demás áreas (TSI, DIF)
 * NO se ven afectadas.
 *
 * Uso: pnpm tsx src/scripts/clean-fed-tickets.ts
 */

import "dotenv/config";
import { db } from "@/db";
import {
  tickets,
  comments,
  ticketAttachments,
  satisfactionSurveys,
  ticketStatusHistory,
  attentionAreas,
  providerTickets,
  providerSatisfactionSurveys,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function cleanFedTickets() {
  console.log("🧹 Limpieza de tickets de Fondo Editorial (FED)");
  console.log("──────────────────────────────────────────────────\n");

  // 1. Buscar el área FED
  const fedArea = await db.query.attentionAreas.findFirst({
    where: eq(attentionAreas.slug, "FED"),
    columns: { id: true, name: true },
  });

  if (!fedArea) {
    console.log("❌ No se encontró el área de atención 'FED'. Abortando.");
    process.exit(1);
  }

  console.log(`✅ Área encontrada: ${fedArea.name} (ID: ${fedArea.id})\n`);

  // 2. Obtener IDs de todos los tickets FED
  const fedTickets = await db
    .select({ id: tickets.id, ticketCode: tickets.ticketCode })
    .from(tickets)
    .where(eq(tickets.attentionAreaId, fedArea.id));

  if (fedTickets.length === 0) {
    console.log("ℹ️  No hay tickets de Fondo Editorial para eliminar.");
    process.exit(0);
  }

  const ticketIds = fedTickets.map((t) => t.id);
  const ticketCodes = fedTickets.map((t) => t.ticketCode);

  console.log(`📋 Tickets a eliminar (${fedTickets.length}):`);
  ticketCodes.forEach((code) => console.log(`   - ${code}`));
  console.log("");

  // 3. Eliminar en orden de dependencias (dentro de una transacción)
  await db.transaction(async (tx) => {
    // 3a. Encuestas de satisfacción de proveedores vinculados a estos tickets
    const pTickets = await tx
      .select({ id: providerTickets.id })
      .from(providerTickets)
      .where(inArray(providerTickets.ticketId, ticketIds));

    if (pTickets.length > 0) {
      const pTicketIds = pTickets.map((pt) => pt.id);
      const deletedProvSurveys = await tx
        .delete(providerSatisfactionSurveys)
        .where(inArray(providerSatisfactionSurveys.providerTicketId, pTicketIds));
      console.log(`   🗑️  Encuestas de proveedores eliminadas: ${deletedProvSurveys.rowCount ?? 0}`);
    }

    // 3b. Tickets de proveedores
    const deletedProvTickets = await tx
      .delete(providerTickets)
      .where(inArray(providerTickets.ticketId, ticketIds));
    console.log(`   🗑️  Tickets de proveedores eliminados: ${deletedProvTickets.rowCount ?? 0}`);

    // 3c. Encuestas de satisfacción del usuario
    const deletedSurveys = await tx
      .delete(satisfactionSurveys)
      .where(inArray(satisfactionSurveys.ticketId, ticketIds));
    console.log(`   🗑️  Encuestas de satisfacción eliminadas: ${deletedSurveys.rowCount ?? 0}`);

    // 3d. Historial de cambios de estado
    const deletedHistory = await tx
      .delete(ticketStatusHistory)
      .where(inArray(ticketStatusHistory.ticketId, ticketIds));
    console.log(`   🗑️  Historial de estado eliminado: ${deletedHistory.rowCount ?? 0}`);

    // 3e. Comentarios / actividad
    const deletedComments = await tx
      .delete(comments)
      .where(inArray(comments.ticketId, ticketIds));
    console.log(`   🗑️  Comentarios eliminados: ${deletedComments.rowCount ?? 0}`);

    // 3f. Archivos adjuntos
    const deletedAttachments = await tx
      .delete(ticketAttachments)
      .where(inArray(ticketAttachments.ticketId, ticketIds));
    console.log(`   🗑️  Adjuntos eliminados: ${deletedAttachments.rowCount ?? 0}`);

    // 3g. Los tickets mismos
    const deletedTickets = await tx
      .delete(tickets)
      .where(inArray(tickets.id, ticketIds));
    console.log(`   🗑️  Tickets eliminados: ${deletedTickets.rowCount ?? 0}`);
  });

  console.log("\n──────────────────────────────────────────────────");
  console.log(`🎉 Limpieza completada: ${fedTickets.length} ticket(s) de FED eliminados.`);
  console.log("   Las áreas TSI y DIF no fueron afectadas.");
  console.log("✨ ¡Listo!\n");
  process.exit(0);
}

cleanFedTickets().catch((err) => {
  console.error("❌ Error durante la limpieza:", err);
  process.exit(1);
});
