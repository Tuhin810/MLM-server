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
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Locating 'Test Customer' user...");

  const user = await prisma.user.findFirst({
    where: {
      name: {
        contains: "Test Customer",
        mode: "insensitive"
      }
    }
  });

  if (!user) {
    console.log("No user named 'Test Customer' found in the database.");
    return;
  }

  console.log(`Found user: ${user.name} (${user.email})`);

  // 1. Delete AutoPoolMember record
  const deleted = await prisma.autoPoolMember.deleteMany({
    where: { userId: user.id }
  });
  console.log(`Successfully removed ${deleted.count} Auto Pool membership records.`);

  // 2. Reset points/PV and wallet balances back to 0
  await prisma.wallet.update({
    where: { userId: user.id },
    data: { points: 0 }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { pointBalance: 0 }
  });
  console.log("Successfully reset user PV points back to 0.");
}

main()
  .catch((e) => {
    console.error("Error executing database clean script:", e);
  })
  .finally(async () => {
    await pool.end();
  });
