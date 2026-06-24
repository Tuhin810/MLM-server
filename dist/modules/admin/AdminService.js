import { UserRepository } from "../auth/UserRepository.js";
import { ProductRepository } from "../product/ProductRepository.js";
import { OrderRepository } from "../order/OrderRepository.js";
import { AutoPoolRepository } from "../autopool/AutoPoolRepository.js";
import { WalletRepository } from "../wallet/WalletRepository.js";
import { prisma } from "../../config/db.js";
const userRepository = new UserRepository();
const productRepository = new ProductRepository();
const orderRepository = new OrderRepository();
const autoPoolRepository = new AutoPoolRepository();
const walletRepository = new WalletRepository();
export class AdminService {
    async getDashboardStats() {
        const totalUsers = await userRepository.countAll();
        const totalActiveUsers = await userRepository.countActive();
        const totalProducts = await productRepository.countAll();
        const totalOrders = await orderRepository.countAll();
        const totalAutoPoolMembers = await autoPoolRepository.countAll();
        const totalIncomeDistributed = await walletRepository.sumTotalIncomeDistributed();
        return {
            totalUsers,
            totalActiveUsers,
            totalProducts,
            totalOrders,
            totalAutoPoolMembers,
            totalIncomeDistributed,
        };
    }
    async getAllUsers() {
        return userRepository.findAll();
    }
    async getUserDetails(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                wallet: true,
                autoPoolMember: true,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        // Fetch orders with product details
        const orders = await prisma.order.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: "desc" },
        });
        // Fetch transactions/withdrawals
        const transactions = await prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        // Fetch direct referrals (users who joined via this user's referral code)
        let directReferrals = [];
        if (user.referralCode) {
            directReferrals = await prisma.user.findMany({
                where: { referredBy: user.referralCode },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    status: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            });
        }
        // Fetch AutoPool downline (if in AutoPool)
        let autoPoolDownline = [];
        if (user.autoPoolMember) {
            const member = user.autoPoolMember;
            const allDescendants = await prisma.autoPoolMember.findMany({
                where: {
                    level: {
                        gt: member.level,
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
            // Filter descendants to only those under this member mathematically
            autoPoolDownline = allDescendants.filter((d) => {
                const h = d.level - member.level;
                const minPos = member.position * Math.pow(2, h);
                const maxPos = (member.position + 1) * Math.pow(2, h) - 1;
                return d.position >= minPos && d.position <= maxPos;
            });
        }
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                status: user.status,
                walletBalance: user.walletBalance,
                pointBalance: user.pointBalance,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            orders,
            transactions,
            directReferrals,
            autoPoolDownline: autoPoolDownline.map((d) => ({
                id: d.id,
                userId: d.userId,
                name: d.user.name,
                email: d.user.email,
                level: d.level,
                position: d.position,
                createdAt: d.createdAt,
            })),
        };
    }
    async updateUserStatus(userId, status) {
        if (status !== "ACTIVE" && status !== "INACTIVE") {
            throw new Error("Invalid status. Must be ACTIVE or INACTIVE");
        }
        return userRepository.update(userId, { status });
    }
    async getAllIncomeLogs() {
        return walletRepository.findAllIncomeLogs();
    }
    async getAllTransactions() {
        return walletRepository.findAllTransactions();
    }
}
