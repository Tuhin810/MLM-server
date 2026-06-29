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

  async findIncomeLogsPaginated({
    page,
    limit,
    search,
    type,
  }: { page: number; limit: number; search?: string; type?: string }) {
    // Search filters by the earning user's name/email. The type filter is kept
    // separate so the summary breakdown can stay across all types.
    const searchWhere: Prisma.IncomeLogWhereInput = search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {};

    const validType =
      type && ["AUTO_POOL", "REFERRAL", "LEVEL"].includes(type) ? (type as IncomeType) : undefined;
    const listWhere: Prisma.IncomeLogWhereInput = validType
      ? { ...searchWhere, incomeType: validType }
      : searchWhere;

    const skip = (page - 1) * limit;

    const [logs, total, grouped] = await Promise.all([
      prisma.incomeLog.findMany({
        where: listWhere,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.incomeLog.count({ where: listWhere }),
      // Totals across the search-filtered set (ignoring the type filter) so the
      // summary cards show the full breakdown regardless of the active page.
      prisma.incomeLog.groupBy({
        by: ["incomeType"],
        where: searchWhere,
        _sum: { amount: true },
      }),
    ]);

    const summary: Record<string, number> = { total: 0, AUTO_POOL: 0, REFERRAL: 0, LEVEL: 0 };
    for (const g of grouped) {
      const amt = g._sum.amount || 0;
      summary[g.incomeType] = amt;
      summary.total += amt;
    }

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary,
    };
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
