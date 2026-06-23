import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting database cleanup (keeping only products)...");

  // 1. Delete dependent tables in order
  const orderCount = await prisma.order.deleteMany({});
  console.log(`Deleted ${orderCount.count} order records.`);

  const txCount = await prisma.walletTransaction.deleteMany({});
  console.log(`Deleted ${txCount.count} wallet transaction records.`);

  const walletCount = await prisma.wallet.deleteMany({});
  console.log(`Deleted ${walletCount.count} wallet records.`);

  const memberCount = await prisma.autoPoolMember.deleteMany({});
  console.log(`Deleted ${memberCount.count} auto-pool member records.`);

  const logCount = await prisma.incomeLog.deleteMany({});
  console.log(`Deleted ${logCount.count} income log records.`);

  const userCount = await prisma.user.deleteMany({});
  console.log(`Deleted ${userCount.count} user records.`);

  // 2. Clean and reset Admins
  const adminCount = await prisma.admin.deleteMany({});
  console.log(`Deleted ${adminCount.count} admin user records.`);

  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.admin.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password: adminPassword,
    },
  });
  console.log("Created default admin user: admin@example.com / admin123");

  // Check product count to verify they were preserved
  const productCount = await prisma.product.count();
  console.log(`Cleanup complete! Preserved ${productCount} products.`);
}

main()
  .catch((e) => {
    console.error("Error executing database clean script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
