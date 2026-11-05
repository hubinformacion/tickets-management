import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { config } from "dotenv";
import { Pool } from "pg";
import { z } from "zod";
import { readUploadReconciliationReport } from "@/lib/uploads/reconciliation-report";
import { readDomainIntegrityReport } from "@/lib/validation/integrity-report";

async function main() {
  if (!z.tuple([z.literal("--read-only")]).safeParse(process.argv.slice(2)).success) {
    throw new Error("Solo se admite --read-only");
  }
  config({ path: ".env.local", quiet: true });
  const url = new URL(z.string().min(1).parse(process.env.DATABASE_URL));
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Destino PostgreSQL inválido");
  for (const option of ["ssl", "sslmode", "sslaccept", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(option);
  }
  const pool = new Pool({
    connectionString: url.toString(), ssl: { rejectUnauthorized: true },
    max: 1, connectionTimeoutMillis: 10_000, application_name: "tickets-integrity-diagnostic-readonly",
  });

  try {
    const db = drizzle(pool);
    const report = await db.transaction(async tx => {
      await tx.execute(sql`SET LOCAL statement_timeout = '15s'`);
      await tx.execute(sql`SET LOCAL lock_timeout = '2s'`);
      // Una transacción usa una sola conexión: pg serializa y desaconseja encolar consultas concurrentes.
      const uploads = await readUploadReconciliationReport(tx);
      const domains = await readDomainIntegrityReport(tx);
      return { uploads, domains };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    console.info(JSON.stringify({ mode: "read-only", generatedAt: new Date().toISOString(), repairsApplied: 0, ...report }, null, 2));
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  console.error("No se pudo completar el diagnóstico de solo lectura. No se repararon ni eliminaron datos o archivos.");
  process.exitCode = 1;
});
