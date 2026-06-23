import { PrismaClient, TransactionType, IncomeType } from "@prisma/client";
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

const LEVEL_REWARDS: Record<number, number> = {
  1: 8,
  2: 20,
  3: 320,
  4: 4800,
  5: 128000,
  6: 4096000,
  7: 262144000,
};

const firstNames = [
  "Alex", "John", "Emma", "David", "Sarah", "Michael", "Emily", "James", "Jessica", "Daniel",
  "Olivia", "Matthew", "Sophia", "Andrew", "Isabella", "Joseph", "Charlotte", "William", "Amelia", "Robert",
  "Mia", "Harper", "Thomas", "Evelyn", "Charles", "Abigail", "Christopher", "Elizabeth", "Daniel", "Sofia"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson",
  "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White",
  "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall"
];

async function main() {
  console.log("Starting high-performance batched database seed...");

  // 1. Clean existing records in dependency order
  await prisma.order.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.autoPoolMember.deleteMany({});
  await prisma.incomeLog.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.product.deleteMany({});

  console.log("Existing records cleared.");

  // 2. Create Admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.admin.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password: adminPassword,
    },
  });
  console.log("Admin user created: admin@example.com");

  // 3. Create Products with fixed IDs for batching
  const productsData = [
    {
      id: "product-uuid-1",
      name: "Luxury Gold Watch",
      description: "Premium gold-plated automatic wristwatch with elegant design.",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
      price: 2500,
      pointValue: 200,
      stock: 500,
    },
    {
      id: "product-uuid-2",
      name: "Active Fitness Tracker",
      description: "Waterproof smart tracker with built-in pulse sensor and steps counter.",
      image: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&q=80&w=600",
      price: 1500,
      pointValue: 100,
      stock: 500,
    },
    {
      id: "product-uuid-3",
      name: "Noise-Cancelling Wireless Earbuds",
      description: "True wireless earphones featuring ANC block filters.",
      image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600",
      price: 1800,
      pointValue: 120,
      stock: 500,
    },
    {
      id: "product-uuid-4",
      name: "Fast Qi Wireless Stand",
      description: "Dual-coil rapid charger dock compatible with all smart cellular devices.",
      image: "https://images.unsplash.com/photo-1622445262465-24819df57490?auto=format&fit=crop&q=80&w=600",
      price: 999,
      pointValue: 80,
      stock: 500,
    },
  ];

  await prisma.product.createMany({ data: productsData });
  console.log("Products seeded.");

  // 4. Pre-calculate all 255 Users, Wallets, Transactions, and Orders
  const passwordHash = await bcrypt.hash("password123", 10);
  const totalUsersCount = 255;

  const users = [];
  const wallets = [];
  const transactions = [];
  const orders = [];
  const incomeLogs = [];
  const autoPoolMembers = [];

  console.log("Calculating all user, auto pool, and commission rows locally...");

  // First pass: generate basic users and placements
  for (let i = 1; i <= totalUsersCount; i++) {
    let name = "";
    let email = "";
    let mobile = "";

    if (i === 1) {
      name = "Test Customer";
      email = "customer@example.com";
      mobile = "9876543210";
    } else {
      const fName = firstNames[(i + 3) % firstNames.length];
      const lName = lastNames[(i * 7) % lastNames.length];
      name = `${fName} ${lName}`;
      email = `user${i}@example.com`;
      mobile = `9${Math.floor(100000000 + (i * 123457) % 900000000)}`;
    }

    const userId = `user-uuid-${i}`;
    const referralCode = `REF${i}`;
    const referredBy = i > 1 ? `REF${Math.floor(i / 2)}` : null;

    // Pick product based on index
    const product = productsData[(i - 1) % productsData.length];
    const productCost = product.price;
    const productPV = product.pointValue;

    // Calculate commissions received by User i
    // Node i is placed in the tree. The tree of size 255 is completely filled.
    // So node i is the root of a fully filled subtree of height = 7 - level_of_i.
    const levelOfI = Math.floor(Math.log2(i));
    const maxCompletionHeight = 7 - levelOfI;
    
    let commissionsEarned = 0;
    for (let h = 1; h <= maxCompletionHeight; h++) {
      const reward = LEVEL_REWARDS[h] || 0;
      commissionsEarned += reward;

      // Add commission IncomeLog row
      incomeLogs.push({
        id: `income-uuid-${i}-${h}`,
        userId,
        amount: reward,
        level: h,
        incomeType: IncomeType.AUTO_POOL,
        createdAt: new Date(Date.now() - (7 - h) * 3600000), // formatted dates
      });

      // Add commission transaction row
      transactions.push({
        id: `tx-comm-uuid-${i}-${h}`,
        userId,
        amount: reward,
        type: TransactionType.CREDIT,
        description: `Auto Pool Level ${h} completion reward`,
        createdAt: new Date(Date.now() - (7 - h) * 3600000),
      });
    }

    const finalBalance = 10000 - productCost + commissionsEarned;
    const finalPoints = productPV;

    // User Row
    users.push({
      id: userId,
      name,
      email,
      mobile,
      password: passwordHash,
      referralCode,
      referredBy,
      walletBalance: finalBalance,
      pointBalance: finalPoints,
    });

    // Wallet Row
    wallets.push({
      id: `wallet-uuid-${i}`,
      userId,
      balance: finalBalance,
      points: finalPoints,
    });

    // Initial Deposit Transaction
    transactions.push({
      id: `tx-dep-uuid-${i}`,
      userId,
      amount: 10000,
      type: TransactionType.CREDIT,
      description: "Initial wallet deposit",
      createdAt: new Date(Date.now() - 24 * 3600000),
    });

    // Purchase Order
    orders.push({
      id: `order-uuid-${i}`,
      userId,
      productId: product.id,
      quantity: 1,
      totalAmount: productCost,
      createdAt: new Date(Date.now() - 12 * 3600000),
    });

    // Purchase Transaction
    transactions.push({
      id: `tx-pur-uuid-${i}`,
      userId,
      amount: productCost,
      type: TransactionType.DEBIT,
      description: `Purchased ${product.name} x1`,
      createdAt: new Date(Date.now() - 12 * 3600000),
    });

    // Auto Pool Member Placements
    autoPoolMembers.push({
      id: `member-uuid-${i}`,
      userId,
      parentId: i > 1 ? `member-uuid-${Math.floor(i / 2)}` : null,
      level: levelOfI,
      position: i - Math.pow(2, levelOfI),
      createdAt: new Date(Date.now() - 18 * 3600000),
    });
  }

  // 5. Run batched queries
  console.log("Writing rows to database in batches...");
  await prisma.user.createMany({ data: users });
  console.log("Users written.");

  await prisma.wallet.createMany({ data: wallets });
  console.log("Wallets written.");

  await prisma.walletTransaction.createMany({ data: transactions });
  console.log("Transactions written.");

  await prisma.order.createMany({ data: orders });
  console.log("Orders written.");

  await prisma.autoPoolMember.createMany({ data: autoPoolMembers });
  console.log("Auto Pool Placements written.");

  await prisma.incomeLog.createMany({ data: incomeLogs });
  console.log("Commissions Income Logs written.");

  // Log summary
  const totalComm = incomeLogs.reduce((sum, log) => sum + log.amount, 0);
  console.log(`Database seeded successfully! Generated 255 users with complete 8-level tree structure.`);
  console.log(`Commissions Logged: ₹${totalComm.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
