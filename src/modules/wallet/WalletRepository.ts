import { prisma } from "../../config/db.js";
import { Prisma, TransactionType, IncomeType } from "@prisma/client";

export class WalletRepository {
  async findByUserId(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        wallet = await prisma.wallet.create({
          data: {
            userId,
            balance: user.walletBalance,
            points: user.pointBalance,
          },
        });
      }
    }
    return wallet;
  }

  async updateBalanceAndPoints(
    userId: string,
    amountChange: number,
    pointsChange: number,
    txType: TransactionType,
    description: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Update Wallet (using upsert in case it doesn't exist yet)
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {
          balance: { increment: amountChange },
          points: { increment: pointsChange },
        },
        create: {
          userId,
          balance: amountChange,
          points: pointsChange,
        },
      });

      // 2. Synchronize User model balances
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: amountChange },
          pointBalance: { increment: pointsChange },
        },
      });

      // 3. Create transaction record if amount is not zero
      if (amountChange !== 0) {
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: Math.abs(amountChange),
            type: txType,
            description,
          },
        });
      }

      return wallet;
    });
  }

  async findTransactionsByUserId(userId: string) {
    return prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllTransactions() {
    return prisma.walletTransaction.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createIncomeLog(userId: string, amount: number, level: number) {
    return prisma.incomeLog.create({
      data: {
        userId,
        amount,
        level,
        incomeType: IncomeType.AUTO_POOL,
      },
    });
  }

  async findIncomeLogsByUserId(userId: string) {
    return prisma.incomeLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAllIncomeLogs() {
    return prisma.incomeLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async sumTotalIncomeDistributed() {
    const aggregate = await prisma.incomeLog.aggregate({
      _sum: {
        amount: true,
      },
    });
    return aggregate._sum.amount || 0;
  }
}
