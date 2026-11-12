import { neon } from "@neondatabase/serverless";

// Requêtes SQL paramétrées : sql`select … where id = ${id}`
export const sql = neon(process.env.DATABASE_URL!);
