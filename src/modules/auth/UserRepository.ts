import { prisma } from "../../config/db.js";
import { Prisma } from "@prisma/client";

export class UserRepository {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { wallet: true, addresses: { orderBy: { isDefault: "desc" } } },
    });
    if (user && !user.wallet) {
      const wallet = await prisma.wallet.create({
        data: {
          userId: id,
          balance: user.walletBalance,
          points: user.pointBalance,
        },
      });
      user.wallet = wallet;
    }
    return user;
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true, addresses: { orderBy: { isDefault: "desc" } } },
    });
    if (user && !user.wallet) {
      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: user.walletBalance,
          points: user.pointBalance,
        },
      });
      user.wallet = wallet;
    }
    return user;
  }

  async findByReferralCode(referralCode: string) {
    return prisma.user.findUnique({
      where: { referralCode },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      include: { wallet: true },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      include: { wallet: true },
    });
  }

  async findAll() {
    return prisma.user.findMany({
      include: { wallet: true, autoPoolMember: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPaginated({ page, limit, search }: { page: number; limit: number; search?: string }) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { referralCode: { contains: search, mode: "insensitive" } },
            { mobile: { contains: search } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { wallet: true, autoPoolMember: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async countAll() {
    return prisma.user.count();
  }

  async countActive() {
    return prisma.user.count({
      where: { status: "ACTIVE" },
    });
  }
}
