import { AutoPoolRepository } from "./AutoPoolRepository.js";
import { WalletRepository } from "../wallet/WalletRepository.js";
import { UserRepository } from "../auth/UserRepository.js";
import { prisma } from "../../config/db.js";
import { TransactionType, IncomeType } from "@prisma/client";
const autoPoolRepository = new AutoPoolRepository();
const walletRepository = new WalletRepository();
const userRepository = new UserRepository();
// Total reward per level when fully filled
const LEVEL_REWARDS = {
    1: 8,
    2: 20,
    3: 320,
    4: 4800,
    5: 128000,
    6: 4096000,
    7: 262144000,
};
// Pre-computed per-child reward = LEVEL_REWARDS[h] / 2^h
// Each descendant joining at level h triggers this payout to the ancestor
const PER_CHILD_REWARDS = {
    1: 4, // 8 / 2
    2: 5, // 20 / 4
    3: 40, // 320 / 8
    4: 300, // 4800 / 16
    5: 4000, // 128000 / 32
    6: 64000, // 4096000 / 64
    7: 2048000, // 262144000 / 128
};
export class AutoPoolService {
    async joinAutoPool(userId) {
        // 1. Check if user is active
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        // 2. Check if already in Auto Pool
        const existingMember = await autoPoolRepository.findByUserId(userId);
        if (existingMember) {
            throw new Error("User is already a member of the Auto Pool");
        }
        // 3. Check if user has at least 40 PV points
        if (!user.wallet || user.wallet.points < 40) {
            throw new Error("Insufficient Point Value (PV). You need at least 40 PV to join the Auto Pool. Purchase products in the Marketplace to earn PV points.");
        }
        // 4. Find parent and compute positioning using BFS inside a transaction
        const newMember = await prisma.$transaction(async (tx) => {
            // Find the first member with less than 2 children
            const members = await tx.autoPoolMember.findMany({
                orderBy: [
                    { level: "asc" },
                    { position: "asc" },
                ],
                include: {
                    _count: {
                        select: { children: true },
                    },
                },
            });
            const parent = members.find((m) => m._count.children < 2);
            let parentId = null;
            let level = 0;
            let position = 0;
            if (parent) {
                parentId = parent.id;
                level = parent.level + 1;
                // Query children of parent to see if it has a left child already
                const children = await tx.autoPoolMember.findMany({
                    where: { parentId: parent.id },
                    orderBy: { position: "asc" },
                });
                if (children.length === 0) {
                    // Left child
                    position = parent.position * 2;
                }
                else {
                    // Right child
                    position = parent.position * 2 + 1;
                }
            }
            // Create the auto pool member
            const created = await tx.autoPoolMember.create({
                data: {
                    userId,
                    parentId,
                    level,
                    position,
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            // ═══════════════════════════════════════════════════════════════════
            // O(1) REWARD ENGINE: Triangular Depth Cascade
            //
            // In this Auto Pool MLM, an ancestor A receives a Level `h` reward
            // from a descendant D (at relative depth `h`) ONLY when D has fully
            // completed their Level `h-1` tree.
            // The required depth of the tree under D to complete Level `h-1` is
            // given by the triangular number: R(h-1) = (h-1)*h/2.
            // Therefore, the total distance from A to the newly inserted node N
            // that completes D's tree is: d_A = R(h) = h*(h+1)/2.
            //
            // Since the tree fills strictly top-down, left-to-right (BFS), D's
            // tree is complete exactly when the *right-most* node of that depth
            // under D is inserted.
            // ═══════════════════════════════════════════════════════════════════
            const N_L = level;
            const N_P = position;
            for (let h = 1; h <= 7; h++) {
                const d_D = (h - 1) * h / 2; // Required depth under D
                const d_A = h * (h + 1) / 2; // Distance from N to Ancestor A
                if (N_L >= d_A) {
                    const A_L = N_L - d_A;
                    const A_P = Math.floor(N_P / Math.pow(2, d_A));
                    const D_L = N_L - d_D;
                    const D_P = Math.floor(N_P / Math.pow(2, d_D));
                    const expected_right_most_P = (D_P + 1) * Math.pow(2, d_D) - 1;
                    if (N_P === expected_right_most_P) {
                        // D has completed its required depth! A gets Level h reward.
                        const ancestor = await tx.autoPoolMember.findFirst({
                            where: { level: A_L, position: A_P }
                        });
                        if (ancestor) {
                            const reward = PER_CHILD_REWARDS[h];
                            if (reward > 0) {
                                const completedCount = D_P - (A_P * Math.pow(2, h)) + 1;
                                const totalExpected = Math.pow(2, h);
                                await tx.wallet.upsert({
                                    where: { userId: ancestor.userId },
                                    update: { balance: { increment: reward } },
                                    create: {
                                        userId: ancestor.userId,
                                        balance: reward,
                                        points: 0,
                                    },
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
            return created;
        }, { timeout: 60000 });
        return newMember;
    }
    async getMember(userId) {
        return autoPoolRepository.findByUserId(userId);
    }
    async getTree(userId) {
        const member = await autoPoolRepository.findByUserId(userId);
        if (!member) {
            return { inAutoPool: false };
        }
        // Fetch all descendants below the member's level
        const allDescendants = await prisma.autoPoolMember.findMany({
            where: {
                level: {
                    gte: member.level,
                },
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { level: "asc" },
                { position: "asc" },
            ],
        });
        // Filter to only include those under the member mathematically
        const subtreeMembers = allDescendants.filter((d) => {
            const h = d.level - member.level;
            if (h === 0)
                return d.id === member.id;
            const minPos = member.position * Math.pow(2, h);
            const maxPos = (member.position + 1) * Math.pow(2, h) - 1;
            return d.position >= minPos && d.position <= maxPos;
        });
        // Count direct and total members under them
        const children = subtreeMembers.filter((m) => m.parentId === member.id);
        const leftChild = children.find((c) => c.position === member.position * 2) || null;
        const rightChild = children.find((c) => c.position === member.position * 2 + 1) || null;
        // Ancestor parent
        const parent = member.parentId ? await autoPoolRepository.findById(member.parentId) : null;
        return {
            inAutoPool: true,
            member: {
                id: member.id,
                userId: member.userId,
                level: member.level,
                position: member.position,
                createdAt: member.createdAt,
            },
            parent: parent ? {
                id: parent.id,
                name: parent.user.name,
                email: parent.user.email,
                level: parent.level,
            } : null,
            leftChild: leftChild ? {
                id: leftChild.id,
                name: leftChild.user.name,
                email: leftChild.user.email,
                level: leftChild.level,
                position: leftChild.position,
            } : null,
            rightChild: rightChild ? {
                id: rightChild.id,
                name: rightChild.user.name,
                email: rightChild.user.email,
                level: rightChild.level,
                position: rightChild.position,
            } : null,
            tree: subtreeMembers.map((m) => ({
                id: m.id,
                userId: m.userId,
                parentId: m.parentId,
                name: m.user.name,
                email: m.user.email,
                level: m.level,
                position: m.position,
            })),
            stats: {
                totalMembersUnder: subtreeMembers.length - 1, // minus self
            },
        };
    }
    async getIncomeLogs(userId) {
        return walletRepository.findIncomeLogsByUserId(userId);
    }
}
