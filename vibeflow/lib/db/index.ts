import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[db] DATABASE_URL is not set; server routes will fail to connect in production.");
}

const pool = new Pool({ connectionString: url });
export const db = drizzle(pool);
