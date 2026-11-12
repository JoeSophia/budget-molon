// Applique db/schema.sql à la base DATABASE_URL (lu dans .env.local).
// Usage : node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquant dans .env.local");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
const { rows } = await pool.query("select table_name from information_schema.tables where table_schema = 'public' order by 1");
console.log("Tables :", rows.map((r) => r.table_name).join(", "));
await pool.end();
