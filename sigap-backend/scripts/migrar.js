/**
 * Aplica las migraciones SQL de prisma/migrations en orden, cada una en una transacción,
 * y registra cuáles ya se aplicaron (tabla _sigap_migraciones). No depende de los binarios de Prisma.
 * Uso: node scripts/migrar.js   (lee DATABASE_URL de .env)
 */
require('dotenv/config');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
  const dir = path.join(__dirname, '..', 'prisma', 'migrations');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query('CREATE TABLE IF NOT EXISTS "_sigap_migraciones" (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())');
  const hechas = new Set((await db.query('SELECT nombre FROM "_sigap_migraciones"')).rows.map((r) => r.nombre));
  const pendientes = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, 'migration.sql')) && !hechas.has(d)).sort();
  for (const nombre of pendientes) {
    const sql = fs.readFileSync(path.join(dir, nombre, 'migration.sql'), 'utf8');
    try {
      await db.query('BEGIN');
      await db.query(sql);
      await db.query('INSERT INTO "_sigap_migraciones"(nombre) VALUES ($1)', [nombre]);
      await db.query('COMMIT');
      console.log(`Aplicada: ${nombre}`);
    } catch (e) {
      await db.query('ROLLBACK');
      console.error(`Falló ${nombre}: ${e.message}`);
      process.exitCode = 1;
      break;
    }
  }
  if (!pendientes.length) console.log('La base de datos ya está al día.');
  await db.end();
}
main();
