import { Worker } from "bullmq";
import { prisma } from "./db.js";
import { redisConnection } from "./queue.js";
import { TransactionType, IncomeType } from "@prisma/client";
// Helper: Traverse sponsor uplines up to a specified depth
async function getSponsorUplines(userId, depth) {
    const uplines = [];
    let currentUserId = userId;
    for (let level = 1; level <= depth; level++) {
        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { referredBy: true },
        });
        if (!user || !user.referredBy)
            break;
        // Find the sponsor who owns this referralCode
        const sponsor = await prisma.user.findUnique({
            where: { referralCode: user.referredBy },
        });
        if (!sponsor)
            break;
        uplines.push({ level, user: sponsor });
        currentUserId = sponsor.id;
    }
    return uplines;
}
// 1. Commission Worker
export const commissionWorker = new Worker("commission-queue", async (job) => {
    const { userId, amount, orderId, itemType } = job.data;
    console.log(`[Commission Worker] Processing commission for job ${job.id}: user ${userId}, amount ₹${amount}, type: ${itemType}`);
    if (itemType === "PRODUCT") {
        // Product Commission splits: Level 1=20%, Level 2=10%, Level 3=10%
        const commissions = [0.20, 0.10, 0.10];
        const uplines = await getSponsorUplines(userId, 3);
        await prisma.$transaction(async (tx) => {
            for (const up of uplines) {
                const rate = commissions[up.level - 1];
                if (!rate)
                    continue;
                const commissionEarned = amount * rate;
                // Credit Sponsor's Wallet & User Model
                await tx.wallet.update({
                    where: { userId: up.user.id },
                    data: { balance: { increment: commissionEarned } },
                });
                await tx.user.update({
                    where: { id: up.user.id },
                    data: { walletBalance: { increment: commissionEarned } },
                });
                // Log Wallet Ledger entry
                await tx.walletTransaction.create({
                    data: {
                        userId: up.user.id,
                        amount: commissionEarned,
                        type: TransactionType.COMMISSION,
                        description: `MLM Product Level ${up.level} Commission from Order ID ${orderId}`,
                    },
                });
                // Log Income
                await tx.incomeLog.create({
                    data: {
                        userId: up.user.id,
                        amount: commissionEarned,
                        level: up.level,
                        incomeType: IncomeType.LEVEL,
                    },
                });
            }
        });
    }
    else if (itemType === "PACKAGE") {
        // Package Commission splits (flat): L1=₹200, L2=₹100, L3=₹80, L4=₹50, L5=₹30, L6=₹20
        const commissions = [200, 100, 80, 50, 30, 20];
        const uplines = await getSponsorUplines(userId, 6);
        await prisma.$transaction(async (tx) => {
            for (const up of uplines) {
                const reward = commissions[up.level - 1];
                if (!reward)
                    continue;
                // Reward direct sponsor (L1) with 20 PV points
                const isL1 = up.level === 1;
                const pointsReward = isL1 ? 20 : 0;
                // Credit Sponsor's Wallet & User Model
                await tx.wallet.update({
                    where: { userId: up.user.id },
                    data: {
                        balance: { increment: reward },
                        ...(pointsReward > 0 ? { points: { increment: pointsReward } } : {})
                    },
                });
                await tx.user.update({
                    where: { id: up.user.id },
                    data: {
                        walletBalance: { increment: reward },
                        ...(pointsReward > 0 ? { pointBalance: { increment: pointsReward } } : {})
                    },
                });
                // Log Ledger entry
                await tx.walletTransaction.create({
                    data: {
                        userId: up.user.id,
                        amount: reward,
                        type: TransactionType.COMMISSION,
                        description: isL1
                            ? `MLM Package Level 1 Payout & +20 PV Points from Subscriber Package Purchase`
                            : `MLM Package Level ${up.level} Payout from Subscriber Package Purchase`,
                    },
                });
                // Log Income
                await tx.incomeLog.create({
                    data: {
                        userId: up.user.id,
                        amount: reward,
                        level: up.level,
                        incomeType: IncomeType.LEVEL,
                    },
                });
            }
        });
    }
    console.log(`[Commission Worker] Successfully computed L-commissions for job ${job.id}`);
}, { connection: redisConnection });
// Payout rates & thresholds for Auto Pool Engine
const PER_CHILD_REWARDS = {
    1: 4, 2: 5, 3: 40, 4: 300, 5: 4000, 6: 64000, 7: 2048000
};
// 2. Auto Pool Placement Worker
export const autoPoolWorker = new Worker("autopool-queue", async (job) => {
    const { userId } = job.data;
    console.log(`[AutoPool Worker] Processing binary placement for user ${userId}`);
    // 1. Verify not already in pool
    const exists = await prisma.autoPoolMember.findUnique({ where: { userId } });
    if (exists) {
        console.log(`[AutoPool Worker] User ${userId} already in Auto Pool. Skipping.`);
        return;
    }
    // 2. BFS auto-placement inside database transaction
    await prisma.$transaction(async (tx) => {
        const members = await tx.autoPoolMember.findMany({
            orderBy: [{ level: "asc" }, { position: "asc" }],
            include: {
                _count: { select: { children: true } },
            },
        });
        const parent = members.find((m) => m._count.children < 2);
        let parentId = null;
        let level = 0;
        let position = 0;
        if (parent) {
            parentId = parent.id;
            level = parent.level + 1;
            const children = await tx.autoPoolMember.findMany({
                where: { parentId: parent.id },
                orderBy: { position: "asc" },
            });
            if (children.length === 0) {
                position = parent.position * 2;
            }
            else {
                position = parent.position * 2 + 1;
            }
        }
        // Join pool
        await tx.autoPoolMember.create({
            data: { userId, parentId, level, position },
        });
        // 3. Triangular Depth Payout Cascade
        const N_L = level;
        const N_P = position;
        for (let h = 1; h <= 7; h++) {
            const d_D = (h - 1) * h / 2; // relative depth completed
            const d_A = h * (h + 1) / 2; // absolute distance
            if (N_L >= d_A) {
                const A_L = N_L - d_A;
                const A_P = Math.floor(N_P / Math.pow(2, d_A));
                const D_L = N_L - d_D;
                const D_P = Math.floor(N_P / Math.pow(2, d_D));
                const expected_right_most_P = (D_P + 1) * Math.pow(2, d_D) - 1;
                if (N_P === expected_right_most_P) {
                    const ancestor = await tx.autoPoolMember.findFirst({
                        where: { level: A_L, position: A_P },
                    });
                    if (ancestor) {
                        const reward = PER_CHILD_REWARDS[h];
                        if (reward > 0) {
                            const completedCount = D_P - (A_P * Math.pow(2, h)) + 1;
                            const totalExpected = Math.pow(2, h);
                            await tx.wallet.update({
                                where: { userId: ancestor.userId },
                                data: { balance: { increment: reward } },
                            });
                            await tx.user.update({
                                where: { id: ancestor.userId },
                                data: { walletBalance: { increment: reward } },
                            });
                            let description = `Auto Pool Level ${h} reward (${completedCount} of ${totalExpected} completed)`;
                            if (h === 1) {
                                description = `Auto Pool Level 1 reward (child ${completedCount} of 2)`;
                            }
                            await tx.walletTransaction.create({
                                data: {
                                    userId: ancestor.userId,
                                    amount: reward,
                                    type: TransactionType.CREDIT,
                                    description,
                                },
                            });
                            await tx.incomeLog.create({
                                data: {
                                    userId: ancestor.userId,
                                    amount: reward,
                                    level: h,
                                    incomeType: IncomeType.AUTO_POOL,
                                },
                            });
                        }
                    }
                }
            }
        }
    });
    console.log(`[AutoPool Worker] Successfully placed user ${userId} and processed level cascades.`);
}, { connection: redisConnection });
console.log("[Queue Workers] Workers initialized and listening for jobs.");
