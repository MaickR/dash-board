import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

const departamentos = [
  // CAP Honduras
  { nombre: "Gerencia General", empresa: "CAP Honduras" },
  { nombre: "Contabilidad y Finanzas", empresa: "CAP Honduras" },
  { nombre: "Talento Humano", empresa: "CAP Honduras" },
  { nombre: "Compras", empresa: "CAP Honduras" },
  { nombre: "Legal", empresa: "CAP Honduras" },
  { nombre: "Servicios Generales", empresa: "CAP Honduras" },
  { nombre: "Procesos y Mejora Continua", empresa: "CAP Honduras" },
  { nombre: "Programación y Tecnología", empresa: "CAP Honduras" },
  { nombre: "Marketing", empresa: "CAP Honduras" },
  { nombre: "Auditoría", empresa: "CAP Honduras" },
  { nombre: "Comercial", empresa: "CAP Honduras" },
  // Distribuidora Mansiago
  { nombre: "Gerencia", empresa: "Distribuidora Mansiago" },
  { nombre: "Logística", empresa: "Distribuidora Mansiago" },
  { nombre: "Ventas", empresa: "Distribuidora Mansiago" },
  // Inversiones S&M
  { nombre: "Gerencia", empresa: "Inversiones S&M" },
  { nombre: "Administración", empresa: "Inversiones S&M" },
  // CAP Soluciones Logísticas
  { nombre: "Gerencia", empresa: "CAP Soluciones Logísticas" },
  { nombre: "Operaciones", empresa: "CAP Soluciones Logísticas" },
  // Auto Repuestos Blessing
  { nombre: "Gerencia", empresa: "Auto Repuestos Blessing" },
  { nombre: "Ventas", empresa: "Auto Repuestos Blessing" },
  { nombre: "Inventario", empresa: "Auto Repuestos Blessing" },
];

// Map responsable names to IDs (from existing responsables table)
const responsableMap = {
  "Gerencia General": "Sindy Castro",
  "Contabilidad y Finanzas": "Wilfredo Martínez",
  "Talento Humano": "Silvia Ruiz",
  "Compras": "Samuel Ávila",
  "Legal": "Ángel Aguirre",
  "Servicios Generales": "Ramiro Castejón",
  "Procesos y Mejora Continua": "Carlos Rosales",
  "Programación y Tecnología": "Víctor Hernández",
  "Marketing": "Daniel Henríquez",
  "Auditoría": "Yenifer Carcamo",
  "Comercial": "Eileen Sánchez",
};

// Get responsable IDs
const [responsables] = await conn.execute("SELECT id, nombre FROM responsables");
const nameToId = {};
for (const r of responsables) {
  nameToId[r.nombre] = r.id;
}

let inserted = 0;
for (const dept of departamentos) {
  // Check if already exists
  const [existing] = await conn.execute(
    "SELECT id FROM departamentos WHERE nombre = ? AND empresa = ?",
    [dept.nombre, dept.empresa]
  );
  if (existing.length > 0) {
    console.log(`  Skipping ${dept.empresa} / ${dept.nombre} (already exists)`);
    continue;
  }

  const responsableName = responsableMap[dept.nombre];
  const responsableId = responsableName ? (nameToId[responsableName] || null) : null;

  await conn.execute(
    "INSERT INTO departamentos (nombre, empresa, responsableActualId, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())",
    [dept.nombre, dept.empresa, responsableId]
  );
  inserted++;

  // If has responsable, add to historial
  if (responsableId) {
    const [deptRow] = await conn.execute(
      "SELECT id FROM departamentos WHERE nombre = ? AND empresa = ?",
      [dept.nombre, dept.empresa]
    );
    if (deptRow.length > 0) {
      await conn.execute(
        "INSERT INTO departamento_historial (departamentoId, responsableId, responsableNombre, fechaInicio, createdAt) VALUES (?, ?, ?, NOW(), NOW())",
        [deptRow[0].id, responsableId, responsableName || 'N/A']
      );
    }
  }
}

console.log(`✅ Inserted ${inserted} departamentos across 5 empresas`);

// Verify
const [counts] = await conn.execute(
  "SELECT empresa, COUNT(*) as total FROM departamentos GROUP BY empresa ORDER BY empresa"
);
console.log("\nDepartamentos por empresa:");
for (const row of counts) {
  console.log(`  ${row.empresa}: ${row.total}`);
}

await conn.end();
