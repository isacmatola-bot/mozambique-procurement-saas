import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../db.js';

async function runSqlFile(filePath: string) {
  const sql = await readFile(filePath, 'utf8');
  await pool.query(sql);
  console.log(`Applied migration: ${filePath}`);
}

const databaseDir = resolve(process.cwd(), '../database');
const baseSchemaPath = resolve(databaseDir, '001_schema.sql');
const migrationsDir = resolve(databaseDir, 'migrations');

await runSqlFile(baseSchemaPath);

const migrationFiles = (await readdir(migrationsDir))
  .filter(file => file.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  await runSqlFile(resolve(migrationsDir, file));
}

await pool.end();

console.log('Database migration completed.');
