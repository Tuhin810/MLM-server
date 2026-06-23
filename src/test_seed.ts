import { prisma } from "./config/db.js";
import { AutoPoolService } from "./services/AutoPoolService.js";

const autoPoolService = new AutoPoolService();

async function run() {
  console.log("Seeding 56 more users to fully complete Level 6 (total 127 members)...");
  
  for (let i = 72; i <= 127; i++) {
    const timestamp = Date.now();
    const email = `testuser_${timestamp}_${i}@example.com`;
    
    // Create user
    const user = await prisma.user.create({
      data: {
        name: `Test User ${i}`,
        email: email,
        mobile: `999999${i.toString().padStart(4, '0')}`,
        password: "hashed_password",
        referralCode: `REF_${timestamp}_${i}`,
        walletBalance: 0,
        pointBalance: 40,
      }
    });

    // Create wallet with 40 PV
    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        points: 40,
      }
    });

    try {
      await autoPoolService.joinAutoPool(user.id);
      console.log(`User ${i} joined Auto Pool successfully.`);
    } catch (e: any) {
      console.error(`Error joining user ${i}:`, e.message);
    }
  }

  console.log("Finished seeding extra users.");
  process.exit(0);
}

run().catch(console.error);
