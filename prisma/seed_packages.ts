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
  console.log("Seeding subscription packages...");

  // Clear existing package references
  await prisma.userPackage.deleteMany({});
  await prisma.package.deleteMany({});
  console.log("Existing packages cleared.");

  // Create the 3 packages matching reference image
  await prisma.package.createMany({
    data: [
      {
        id: "package-uuid-1",
        name: "Waves + 1 Module",
        price: 100,
        pointValue: 10,
        benefits: [
          "Up to 500 Monthly Order Limits",
          "Commission Level 1-3 Eligibility",
          "Auto Pool Placement Access",
          "Instant Wallet PV Points Credited",
          "Standard Member Support"
        ],
        status: "ACTIVE",
      },
      {
        id: "package-uuid-2",
        name: "Waves + 2",
        price: 250,
        pointValue: 20,
        benefits: [
          "Up to 2,000 Monthly Order Limits",
          "Commission Level 1-5 Eligibility",
          "Auto Pool Placement Access",
          "Instant Wallet PV Points Credited",
          "Everything in Waves + 1 Module",
          "24/7 Member Support"
        ],
        status: "ACTIVE",
      },
      {
        id: "package-uuid-3",
        name: "Get Em All!",
        price: 500,
        pointValue: 30,
        benefits: [
          "Up to 10,000 Monthly Order Limits",
          "Commission Level 1-7 Eligibility",
          "Auto Pool Placement Access",
          "Instant Wallet PV Points Credited",
          "Everything in Waves + 2",
          "Unlimited Referral Networks",
          "Premium Direct Line Support"
        ],
        status: "ACTIVE",
      },
    ]
  });

  console.log("3 Packages seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
