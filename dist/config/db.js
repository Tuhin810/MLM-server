import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required.");
}
const pool = new Pool({ connectionString });
// pool.on("connect", () => {
//   console.log("[Database Pool] New client connected to Neon PostgreSQL.");
// });
pool.on("error", (err) => {
    console.error("[Database Pool] Unexpected error on idle PostgreSQL client:", err);
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
