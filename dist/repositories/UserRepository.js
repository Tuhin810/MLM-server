import { prisma } from "../config/db.js";
export class UserRepository {
    async findById(id) {
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
    async findByEmail(email) {
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
    async findByReferralCode(referralCode) {
        return prisma.user.findUnique({
            where: { referralCode },
        });
    }
    async create(data) {
        return prisma.user.create({
            data,
            include: { wallet: true },
        });
    }
    async update(id, data) {
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
    async countAll() {
        return prisma.user.count();
    }
    async countActive() {
        return prisma.user.count({
            where: { status: "ACTIVE" },
        });
    }
}
