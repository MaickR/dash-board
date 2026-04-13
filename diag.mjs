import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const url = new URL(process.env.DATABASE_URL);
const conn = await mysql.createConnection({
  host: url.hostname, user: url.username, password: url.password,
  database: url.pathname.slice(1), port: Number(url.port) || 3306,
  ssl: { rejectUnauthorized: false }
});

// Check actual columns in reuniones
const [cols] = await conn.execute(`SHOW COLUMNS FROM reuniones`);
console.log('=== REUNIONES COLUMNS ===');
cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Key}`))

// Check reuniones data
const [reuniones] = await conn.execute('SELECT * FROM reuniones ORDER BY id DESC LIMIT 20');
console.log('\n=== REUNIONES ===', reuniones.length, 'total');
reuniones.forEach(r => console.log(JSON.stringify(r)));

// Check archivos columns
const [archCols] = await conn.execute('SHOW COLUMNS FROM archivos');
console.log('\n=== ARCHIVOS COLUMNS ===');
archCols.forEach(c => console.log(`  ${c.Field} (${c.Type}) ${c.Key}`));

// Check archivos data
const [archivos] = await conn.execute('SELECT * FROM archivos ORDER BY id DESC LIMIT 20');
console.log('\n=== ARCHIVOS ===', archivos.length, 'total');
archivos.forEach(a => console.log(JSON.stringify(a)));

// Check autoincrement values
const dbName = url.pathname.slice(1);
const [autoInc] = await conn.execute(`SELECT TABLE_NAME, AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME IN ('reuniones', 'archivos', 'tareas', 'acuerdos') ORDER BY TABLE_NAME`);
console.log('\n=== AUTO_INCREMENT VALUES ===');
autoInc.forEach(t => console.log(`${t.TABLE_NAME}: next_id=${t.AUTO_INCREMENT}`));

await conn.end();
