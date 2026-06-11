import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

async function backfill() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Backfill desde comments tipo 'system' con metadata de cambio de estado
    const result1 = await client.query(`
      INSERT INTO ticket_status_history (ticket_id, from_status, to_status, changed_by_id, changed_at)
      SELECT
        c.ticket_id,
        c.metadata->>'from_status',
        c.metadata->>'to_status',
        c.user_id,
        c.created_at
      FROM comment c
      WHERE c.type = 'system'
        AND c.metadata->>'to_status' IS NOT NULL
        AND c.metadata->>'from_status' IS NOT NULL
    `);
    console.log(`Backfill desde comments: ${result1.rowCount} registros insertados`);

    // 2. Para tickets sin historial, inferir desde estado actual
    const result2 = await client.query(`
      INSERT INTO ticket_status_history (ticket_id, to_status, changed_by_id, changed_at)
      SELECT
        t.id,
        t.status,
        t.created_by_id,
        t.created_at
      FROM ticket t
      WHERE NOT EXISTS (
        SELECT 1 FROM ticket_status_history h WHERE h.ticket_id = t.id
      )
    `);
    console.log(`Backfill desde tickets existentes: ${result2.rowCount} registros insertados`);

    await client.query("COMMIT");
    console.log("Backfill completado exitosamente");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en backfill:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

backfill();
