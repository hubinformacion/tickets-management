import { Pool } from "pg";
import { db } from "../db/index";
import { 
  attentionAreas, ticketCategories, ticketSubcategories, 
  users, tickets, comments, ticketAttachments, ticketSequence,
  priorityConfig, appSettings, providers, sessions, accounts, verifications
} from "../db/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const oldPool = new Pool({ connectionString: process.env.OLD_DATABASE_URL });

async function migrate() {
    console.log("🚀 Iniciando migración de datos...");
    if (!process.env.OLD_DATABASE_URL) throw new Error("Falta OLD_DATABASE_URL");

    try {
        // 1. Áreas de Atención
        console.log("📦 Migrando Áreas de Atención...");
        const { rows: oldAreas } = await oldPool.query("SELECT * FROM attention_area");
        if (oldAreas.length > 0) {
            await db.insert(attentionAreas).values(
                oldAreas.map(a => ({
                    id: a.id,
                    name: a.name,
                    slug: (a.slug || "").toUpperCase(),
                    isActive: a.is_active,
                    isAcceptingTickets: a.is_accepting_tickets,
                    createdAt: a.created_at,
                    updatedAt: a.updated_at
                }))
            ).onConflictDoNothing();
        }

        // 2. Usuarios
        console.log("👥 Migrando Usuarios...");
        const { rows: oldUsers } = await oldPool.query("SELECT * FROM \"user\"");
        if (oldUsers.length > 0) {
            await db.insert(users).values(
                oldUsers.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    emailVerified: u.email_verified,
                    image: u.image,
                    createdAt: u.created_at,
                    updatedAt: u.updated_at,
                    role: u.role,
                    isActive: u.is_active ?? true,
                    deactivatedAt: u.deactivated_at,
                    deactivatedBy: u.deactivated_by,
                    attentionAreaId: u.attention_area_id
                }))
            ).onConflictDoNothing();
        }

        const cendocUser = oldUsers.find(u => u.email === 'cendoc@continental.edu.pe');
        const fromerorUser = oldUsers.find(u => u.email === 'fromeror@continental.edu.pe');
        
        const replaceAgentId = (id: string | null) => {
            if (id && cendocUser && fromerorUser && id === cendocUser.id) {
                return fromerorUser.id;
            }
            return id;
        };

        // Auth related
        console.log("🔑 Migrando Sesiones y Cuentas...");
        const { rows: oldSessions } = await oldPool.query("SELECT * FROM session");
        if (oldSessions.length > 0) {
            await db.insert(sessions).values(
                oldSessions.map(s => ({
                    id: s.id, expiresAt: s.expires_at, token: s.token,
                    createdAt: s.created_at, updatedAt: s.updated_at,
                    ipAddress: s.ip_address, userAgent: s.user_agent, userId: s.user_id
                }))
            ).onConflictDoNothing();
        }
        const { rows: oldAccounts } = await oldPool.query("SELECT * FROM account");
        if (oldAccounts.length > 0) {
            await db.insert(accounts).values(
                oldAccounts.map(a => ({
                    id: a.id, accountId: a.account_id, providerId: a.provider_id, userId: a.user_id,
                    accessToken: a.access_token, refreshToken: a.refresh_token, idToken: a.id_token,
                    accessTokenExpiresAt: a.access_token_expires_at, refreshTokenExpiresAt: a.refresh_token_expires_at,
                    scope: a.scope, password: a.password, createdAt: a.created_at, updatedAt: a.updated_at
                }))
            ).onConflictDoNothing();
        }
        const { rows: oldVerifications } = await oldPool.query("SELECT * FROM verification");
        if (oldVerifications.length > 0) {
            await db.insert(verifications).values(
                oldVerifications.map(v => ({
                    id: v.id, identifier: v.identifier, value: v.value, expiresAt: v.expires_at,
                    createdAt: v.created_at, updatedAt: v.updated_at
                }))
            ).onConflictDoNothing();
        }

        // 3. Categorías y Subcategorías
        console.log("📁 Migrando Categorías...");
        const { rows: oldCategories } = await oldPool.query("SELECT * FROM ticket_category");
        if (oldCategories.length > 0) {
            await db.insert(ticketCategories).values(
                oldCategories.map(c => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    isActive: c.is_active,
                    displayOrder: c.display_order,
                    attentionAreaId: c.attention_area_id,
                    createdAt: c.created_at,
                    updatedAt: c.updated_at
                }))
            ).onConflictDoNothing();
        }

        const { rows: oldSubcats } = await oldPool.query("SELECT * FROM ticket_subcategory");
        if (oldSubcats.length > 0) {
            await db.insert(ticketSubcategories).values(
                oldSubcats.map(s => ({
                    id: s.id,
                    categoryId: s.category_id,
                    name: s.name,
                    description: s.description,
                    isActive: s.is_active,
                    displayOrder: s.display_order,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at
                }))
            ).onConflictDoNothing();
        }

        // 4. Tickets
        console.log("🎫 Migrando Tickets...");
        const { rows: oldTickets } = await oldPool.query("SELECT * FROM ticket ORDER BY created_at ASC");
        
        const sequences: Record<string, number> = {}; // key: areaId_year -> maxNumber

        if (oldTickets.length > 0) {
            await db.insert(tickets).values(
                oldTickets.map(t => {
                    const area = oldAreas.find(a => a.id === t.attention_area_id);
                    const slug = area ? (area.slug || "UNK").toUpperCase() : "UNK";
                    let newTicketCode = t.ticket_code;
                    
                    // Parse old code YYYY-####
                    const match = String(newTicketCode).match(/^(\d{4})-(\d+)$/);
                    if (match) {
                        const [, yearStr, numStr] = match;
                        newTicketCode = `${slug}-${yearStr}-${numStr}`;
                        const year = parseInt(yearStr);
                        const num = parseInt(numStr);
                        if (t.attention_area_id) {
                            const seqKey = `${t.attention_area_id}_${year}`;
                            sequences[seqKey] = Math.max(sequences[seqKey] || 0, num);
                        }
                    } else if (String(newTicketCode).match(/^[A-Z]{3}-\d{4}-\d+$/)) {
                        // All good, already converted?
                    }

                    return {
                        id: t.id,
                        ticketCode: newTicketCode,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        priority: t.priority,
                        createdById: t.created_by_id,
                        assignedToId: replaceAgentId(t.assigned_to_id), // Reasignar agente si era cendoc
                        categoryId: t.category_id,
                        subcategoryId: t.subcategory_id,
                        attentionAreaId: t.attention_area_id,
                        watchers: t.watchers,
                        validationRequestedAt: t.validation_requested_at,
                        emailThreadId: t.email_thread_id,
                        initialMessageId: t.initial_message_id,
                        closedBy: t.closed_by,
                        closedAt: t.closed_at,
                        closedByUserId: t.closed_by_user_id,
                        createdAt: t.created_at,
                        updatedAt: t.updated_at,
                        // Defaults to null for difusión fields
                        activityStartDate: null,
                        desiredDiffusionDate: null,
                        targetAudience: null
                    };
                })
            ).onConflictDoNothing();
        }

        // Update sequences table based on the extracted values
        console.log("🔢 Reconstruyendo secuencias...");
        for (const [key, lastNumber] of Object.entries(sequences)) {
            const [areaId, year] = key.split("_").map(Number);
            await db.insert(ticketSequence).values({
                attentionAreaId: areaId,
                year,
                lastNumber
            }).onConflictDoNothing();
        }

        // 5. Comentarios
        console.log("💬 Migrando Comentarios...");
        const { rows: oldComments } = await oldPool.query("SELECT * FROM comment");
        if (oldComments.length > 0) {
            await db.insert(comments).values(
                oldComments.map(c => ({
                    id: c.id,
                    content: c.content,
                    ticketId: c.ticket_id,
                    userId: replaceAgentId(c.user_id), // Reasignar si fue emitido por cendoc
                    isInternal: c.is_internal,
                    type: "comment", // Default for old comments
                    createdAt: c.created_at
                }))
            ).onConflictDoNothing();
        }

        // 6. Archivos y Vistas
        console.log("📎 Migrando Adjuntos e Historial...");
        const { rows: oldAttachments } = await oldPool.query("SELECT * FROM ticket_attachment");
        if (oldAttachments.length > 0) {
            await db.insert(ticketAttachments).values(
                oldAttachments.map(a => ({
                    id: a.id, ticketId: a.ticket_id, fileName: a.file_name,
                    fileSize: a.file_size, mimeType: a.mime_type, driveFileId: a.drive_file_id,
                    driveViewLink: a.drive_view_link, uploadToken: a.upload_token,
                    uploadedById: a.uploaded_by_id, createdAt: a.created_at
                }))
            ).onConflictDoNothing();
        }



        // 7. Seed missing required configurations
        console.log("⚙️  Configurando valores por defecto adicionales...");
        await db.insert(appSettings).values([
            { key: "allow_new_tickets", value: "true" },
            { key: "ticket_disabled_message", value: "Estamos en mantenimiento. Por favor, inténtelo más tarde." },
            { key: "knowledge_base_url", value: "https://docs.google.com/spreadsheets/d/140VQoMEDkztJ1vmJ68ULwKlQ1y1BdQixU5w7AGZ5QZ4/" }
        ]).onConflictDoNothing();

        const priorityDefaults = [
            { priority: "low", description: "Consultas generales, solicitudes de información o problemas menores.", slaHours: 120 },
            { priority: "medium", description: "Incidencias que afectan parcialmente el trabajo.", slaHours: 48 },
            { priority: "high", description: "Problemas que impiden realizar tareas críticas.", slaHours: 24 },
            { priority: "critical", description: "Interrupción total del servicio, requiere acción inmediata.", slaHours: 1 },
        ];
        const priorityConfigRows = oldAreas.flatMap(area =>
            priorityDefaults.map(p => ({ attentionAreaId: area.id, ...p }))
        );
        if (priorityConfigRows.length > 0) {
            await db.insert(priorityConfig).values(priorityConfigRows).onConflictDoNothing();
        }

        // Fix sequences table postgres serial generator to match existing data
        // For tables with ID column we just inserted explicitly, we MUST reset the sequence so new inserts don't fail!
        console.log("🔧 Sincronizando secuencias de PostgreSQL (IDs)...");
        await db.execute(sql`SELECT setval('attention_area_id_seq', COALESCE((SELECT MAX(id)+1 FROM attention_area), 1), false);`);
        await db.execute(sql`SELECT setval('ticket_category_id_seq', COALESCE((SELECT MAX(id)+1 FROM ticket_category), 1), false);`);
        await db.execute(sql`SELECT setval('ticket_subcategory_id_seq', COALESCE((SELECT MAX(id)+1 FROM ticket_subcategory), 1), false);`);
        await db.execute(sql`SELECT setval('ticket_id_seq', COALESCE((SELECT MAX(id)+1 FROM ticket), 1), false);`);

        console.log("🎉 ¡Migración completada exitosamente!");
    } catch (e) {
        console.error("❌ Error durante la migración:", e);
    } finally {
        await oldPool.end();
    }
}
migrate().catch(console.error).finally(() => process.exit(0));
