import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Pool } from "pg";
import { z } from "zod";
import { attentionAreas, tickets, users } from "@/db/schema";
import { escapeHtml } from "@/lib/email/escape-html";
import { getSurveyReminderDigestTemplate, SURVEY_REMINDER_DIGEST_SUBJECT } from "@/lib/email/templates/survey-reminder-digest";
import { getWeekdayCutoff } from "@/lib/reminders/schedule";

async function main() {
  const args = z.tuple([
    z.literal("--prepare"), z.literal("--cutoff"), z.iso.datetime(), z.literal("--base-url"), z.url(),
  ]).safeParse(process.argv.slice(2));
  if (!args.success) {
    throw new Error("Uso: pnpm exec tsx src/scripts/prepare-survey-reminder-digests.ts --prepare --cutoff FECHA_ISO --base-url URL_HTTPS");
  }
  const cutoff = new Date(args.data[2]);
  const baseUrl = new URL(args.data[4]);
  if (cutoff > getWeekdayCutoff(new Date()) || baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password) {
    throw new Error("El plazo debe estar cumplido y la URL debe usar HTTPS sin credenciales");
  }

  config({ path: ".env.local", quiet: true });
  const databaseUrl = new URL(z.string().min(1).parse(process.env.DATABASE_URL));
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("sslaccept");
  const pool = new Pool({
    connectionString: databaseUrl.toString(), ssl: { rejectUnauthorized: true },
    max: 1, connectionTimeoutMillis: 10_000, application_name: "tickets-survey-digest-drafts-readonly",
  });

  try {
    const db = drizzle(pool);
    const rows = await db.transaction(async tx => {
      await tx.execute(sql`SET LOCAL statement_timeout = '10s'`);
      await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
      return tx.select({
        ticketId: tickets.id, ticketCode: tickets.ticketCode, title: tickets.title,
        closedAt: tickets.closedAt, attentionAreaName: attentionAreas.name,
        creatorId: users.id, creatorName: users.name, creatorEmail: users.email,
      }).from(tickets)
        .innerJoin(users, eq(users.id, tickets.createdById))
        .innerJoin(attentionAreas, eq(attentionAreas.id, tickets.attentionAreaId))
        .where(and(
          eq(tickets.status, "resolved"), eq(users.isActive, true),
          isNotNull(tickets.closedAt), lte(tickets.closedAt, cutoff),
          sql`NOT EXISTS (SELECT 1 FROM satisfaction_survey s WHERE s.ticket_id = ${tickets.id})`,
        ))
        .orderBy(users.id, tickets.closedAt, tickets.id);
    }, { isolationLevel: "repeatable read", accessMode: "read only" });

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const group = groups.get(row.creatorId);
      if (group) group.push(row);
      else groups.set(row.creatorId, [row]);
    }
    const directory = await mkdtemp(join(tmpdir(), "tickets-survey-digest-drafts-"));
    const drafts = [];
    const links: string[] = [];
    for (const group of groups.values()) {
      const creator = group[0];
      const file: string = `${String(drafts.length + 1).padStart(3, "0")}.html`;
      const digestTickets = group.map(row => ({
        ticketCode: row.ticketCode, title: row.title,
        attentionAreaName: row.attentionAreaName, closedAt: row.closedAt!,
      }));
      const html = getSurveyReminderDigestTemplate({ userName: creator.creatorName, baseUrl: baseUrl.origin, tickets: digestTickets });
      await writeFile(join(directory, file), html, { mode: 0o600, flag: "wx" });
      drafts.push({
        to: { userId: creator.creatorId, name: creator.creatorName, email: creator.creatorEmail },
        cc: [], bcc: [], subject: SURVEY_REMINDER_DIGEST_SUBJECT, htmlFile: file,
        tickets: group.map(row => ({ id: row.ticketId, ticketCode: row.ticketCode, closedAt: row.closedAt!.toISOString() })),
      });
      links.push(`<li><a href="${file}">${escapeHtml(creator.creatorName)}</a> — ${group.length} ticket(s)</li>`);
    }
    await writeFile(join(directory, "manifest.json"), JSON.stringify({
      mode: "draft-only", sent: false, generatedAt: new Date().toISOString(),
      cutoff: cutoff.toISOString(), baseUrl: baseUrl.origin, totalTickets: rows.length, drafts,
    }, null, 2), { mode: 0o600, flag: "wx" });
    await writeFile(join(directory, "index.html"), `<!DOCTYPE html><html lang="es"><meta charset="utf-8"><title>Borradores de encuestas</title><h1>Borradores sin enviar</h1><p>${rows.length} tickets · ${drafts.length} correos. Solo para revisión; ningún envío realizado.</p><ul>${links.join("")}</ul></html>`, { mode: 0o600, flag: "wx" });
    console.info(JSON.stringify({ mode: "draft-only", sent: 0, totalTickets: rows.length, recipients: drafts.length, index: join(directory, "index.html") }));
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  console.error("No se pudieron preparar los borradores. Verifica los argumentos y la conexión; no se enviaron correos.");
  process.exitCode = 1;
});
