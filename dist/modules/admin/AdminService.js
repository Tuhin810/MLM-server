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
    async getUsersPaginated({ page, limit, search }) {
        const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
        return userRepository.findPaginated({ page: safePage, limit: safeLimit, search });
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
    async getIncomeLogsPaginated({ page, limit, search, type, }) {
        const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
        return walletRepository.findIncomeLogsPaginated({ page: safePage, limit: safeLimit, search, type });
    }
    async getAllTransactions() {
        return walletRepository.findAllTransactions();
    }
    async getTransactionsPaginated({ page, limit, search, }) {
        const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
        return walletRepository.findTransactionsPaginated({ page: safePage, limit: safeLimit, search });
    }
    async getReferralStats() {
        const totalUsers = await prisma.user.count();
        const pointsSum = await prisma.wallet.aggregate({
            _sum: { points: true }
        });
        const totalReferrals = await prisma.user.count({
            where: { referredBy: { not: null } }
        });
        const topReferrers = await prisma.user.findMany({
            orderBy: { pointBalance: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                pointBalance: true,
            }
        });
        return {
            totalUsers,
            totalActivePoints: pointsSum._sum.points || 0,
            totalReferrals,
            topReferrers,
        };
    }
    async getReferralUsers() {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                referralCode: true,
                referredBy: true,
                pointBalance: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const usersWithDirectReferralsCount = await Promise.all(users.map(async (user) => {
            const directReferralsCount = await prisma.user.count({
                where: { referredBy: user.referralCode },
            });
            return {
                ...user,
                directReferralsCount,
            };
        }));
        return usersWithDirectReferralsCount;
    }
    async getReferralTree(userId) {
        const getTree = async (uId, currentLevel = 0, maxLevel = 4) => {
            const user = await prisma.user.findUnique({
                where: { id: uId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    referralCode: true,
                    referredBy: true,
                    pointBalance: true,
                },
            });
            if (!user)
                return null;
            const node = {
                id: user.id,
                name: user.name,
                email: user.email,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                points: user.pointBalance,
                level: currentLevel,
                children: [],
            };
            if (currentLevel < maxLevel && user.referralCode) {
                const children = await prisma.user.findMany({
                    where: { referredBy: user.referralCode },
                    select: { id: true },
                });
                for (const child of children) {
                    const childNode = await getTree(child.id, currentLevel + 1, maxLevel);
                    if (childNode) {
                        node.children.push(childNode);
                    }
                }
            }
            return node;
        };
        const tree = await getTree(userId);
        return {
            userId,
            inTree: !!tree,
            tree,
        };
    }
}
