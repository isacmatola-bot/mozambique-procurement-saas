import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../db.js';

const sqlPath = resolve(process.cwd(), '../database/001_schema.sql');
const sql = await readFile(sqlPath, 'utf8');
await pool.query(sql);
await pool.end();
console.log('Database migration completed.');
