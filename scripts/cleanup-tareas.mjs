/**
 * ARIA v5.10 — Cleanup script: Delete all tasks and related records
 * Preserves: reuniones, archivos, departamentos, responsables, etc.
 * Cleans: tareas, notas (tareaId), adjuntos, actividad_tarea, tiempo_registros, task_followers, tarea_borradores, notificaciones (tareaId)
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

async function cleanup() {
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log("✅ Connected to database");

  try {
    // Order matters: delete child tables first, then parent
    const tables = [
      "actividad_tarea",
      "adjuntos",
      "notas",
      "tiempo_registros",
      "task_followers",
      "tarea_borradores",
    ];

    for (const table of tables) {
      try {
        const [result] = await connection.execute(`DELETE FROM \`${table}\``);
        console.log(`✅ Cleaned ${table}: ${result.affectedRows} rows deleted`);
      } catch (err) {
        console.warn(`⚠️  Could not clean ${table}: ${err.message}`);
      }
    }

    // Clean notificaciones that reference tareas
    try {
      const [result] = await connection.execute(
        `DELETE FROM notificaciones WHERE tareaId IS NOT NULL`
      );
      console.log(`✅ Cleaned notificaciones (tareaId): ${result.affectedRows} rows deleted`);
    } catch (err) {
      console.warn(`⚠️  Could not clean notificaciones: ${err.message}`);
    }

    // Finally delete tareas
    const [result] = await connection.execute(`DELETE FROM tareas`);
    console.log(`✅ Cleaned tareas: ${result.affectedRows} rows deleted`);

    // Verify
    const [remaining] = await connection.execute(`SELECT COUNT(*) as count FROM tareas`);
    console.log(`\n📊 Remaining tareas: ${remaining[0].count}`);

    console.log("\n✅ Cleanup complete. All tasks removed. Meetings, documents, departments, and responsables preserved.");
  } finally {
    await connection.end();
  }
}

cleanup().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
