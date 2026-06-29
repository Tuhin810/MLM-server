import { AdminService } from "./AdminService.js";
import { prisma } from "../../config/db.js";
import { z } from "zod";
const adminService = new AdminService();
export class AdminController {
    async getDashboard(req, res, next) {
        try {
            const stats = await adminService.getDashboardStats();
            res.status(200).json(stats);
        }
        catch (error) {
            next(error);
        }
    }
    async getUsers(req, res, next) {
        try {
            // Paginated response when a `page` query param is supplied; otherwise
            // return the full list (kept for the Auto Pool map and legacy callers).
            if (req.query.page !== undefined) {
                const result = await adminService.getUsersPaginated({
                    page: parseInt(req.query.page, 10),
                    limit: parseInt(req.query.limit, 10),
                    search: req.query.search || "",
                });
                res.status(200).json(result);
                return;
            }
            const users = await adminService.getAllUsers();
            res.status(200).json(users);
        }
        catch (error) {
            next(error);
        }
    }
    async getUserDetails(req, res, next) {
        try {
            const details = await adminService.getUserDetails(req.params.userId);
            res.status(200).json(details);
        }
        catch (error) {
            next(error);
        }
    }
    async updateUserStatus(req, res, next) {
        try {
            const { status } = req.body;
            const updatedUser = await adminService.updateUserStatus(req.params.userId, status);
            res.status(200).json({
                message: `User status updated to ${status}`,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    status: updatedUser.status,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getIncomeLogs(req, res, next) {
        try {
            const logs = await adminService.getAllIncomeLogs();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getTransactions(req, res, next) {
        try {
            const txs = await adminService.getAllTransactions();
            res.status(200).json(txs);
        }
        catch (error) {
            next(error);
        }
    }
    async getWithdrawals(req, res, next) {
        try {
            const withdrawals = await prisma.withdrawal.findMany({
                include: { user: { select: { name: true, email: true, mobile: true } } },
                orderBy: { createdAt: "desc" },
            });
            res.status(200).json(withdrawals);
        }
        catch (error) {
            next(error);
        }
    }
    async updateWithdrawal(req, res, next) {
        try {
            const schema = z.object({ status: z.enum(["APPROVED", "REJECTED", "SETTLED"]) });
            const { status } = schema.parse(req.body);
            const withdrawal = await prisma.withdrawal.update({
                where: { id: req.params.id },
                data: { status },
            });
            // If rejected, refund the wallet
            if (status === "REJECTED") {
                const { WalletRepository } = await import("../wallet/WalletRepository.js");
                const walletRepo = new WalletRepository();
                await walletRepo.updateBalanceAndPoints(withdrawal.userId, withdrawal.amount, 0, "CREDIT", `Withdrawal #${withdrawal.id.slice(-6)} rejected — refunded`);
            }
            res.status(200).json({ message: `Withdrawal ${status.toLowerCase()}`, withdrawal });
        }
        catch (error) {
            next(error);
        }
    }
    async getKycRequests(req, res, next) {
        try {
            const requests = await prisma.user.findMany({
                where: { kycSubmittedAt: { not: null } },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    kycStatus: true,
                    panCard: true,
                    aadhaarCard: true,
                    panCardDoc: true,
                    aadhaarCardDoc: true,
                    holderName: true,
                    bankName: true,
                    accountNumber: true,
                    ifscCode: true,
                    kycSubmittedAt: true,
                    kycRejectedReason: true,
                },
                orderBy: { kycSubmittedAt: "desc" },
            });
            res.status(200).json(requests);
        }
        catch (error) {
            next(error);
        }
    }
    async updateKycStatus(req, res, next) {
        try {
            const schema = z.object({
                status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
                reason: z.string().optional(),
            });
            const { status, reason } = schema.parse(req.body);
            const userId = req.params.userId;
            const target = await prisma.user.findUnique({
                where: { id: userId },
                select: { kycSubmittedAt: true },
            });
            if (!target || !target.kycSubmittedAt) {
                res.status(404).json({ error: "KYC request not found" });
                return;
            }
            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    kycStatus: status,
                    kycRejectedReason: status === "REJECTED" ? (reason || "Documents could not be verified") : null,
                },
                select: { id: true, name: true, email: true, kycStatus: true, kycRejectedReason: true },
            });
            res.status(200).json({ message: `KYC ${status.toLowerCase()}`, user });
        }
        catch (error) {
            next(error);
        }
    }
    async getPackages(req, res, next) {
        try {
            const packages = await prisma.package.findMany({ orderBy: { price: "asc" } });
            res.status(200).json(packages);
        }
        catch (error) {
            next(error);
        }
    }
    async createPackage(req, res, next) {
        try {
            const schema = z.object({
                name: z.string(),
                price: z.number(),
                pointValue: z.number(),
                benefits: z.array(z.string()),
            });
            const data = schema.parse(req.body);
            const pkg = await prisma.package.create({ data });
            res.status(201).json(pkg);
        }
        catch (error) {
            next(error);
        }
    }
    async updatePackage(req, res, next) {
        try {
            const schema = z.object({
                name: z.string().optional(),
                price: z.number().optional(),
                pointValue: z.number().optional(),
                benefits: z.array(z.string()).optional(),
                status: z.string().optional(),
            });
            const data = schema.parse(req.body);
            const pkg = await prisma.package.update({
                where: { id: req.params.id },
                data,
            });
            res.status(200).json(pkg);
        }
        catch (error) {
            next(error);
        }
    }
    async deletePackage(req, res, next) {
        try {
            const id = req.params.id;
            await prisma.userPackage.deleteMany({ where: { packageId: id } });
            await prisma.package.delete({ where: { id } });
            res.status(200).json({ message: "Package deleted successfully" });
        }
        catch (error) {
            next(error);
        }
    }
    async getReferralStats(req, res, next) {
        try {
            const stats = await adminService.getReferralStats();
            res.status(200).json(stats);
        }
        catch (error) {
            next(error);
        }
    }
    async getReferralUsers(req, res, next) {
        try {
            const users = await adminService.getReferralUsers();
            res.status(200).json(users);
        }
        catch (error) {
            next(error);
        }
    }
    async getReferralTree(req, res, next) {
        try {
            const { userId } = req.params;
            const tree = await adminService.getReferralTree(userId);
            res.status(200).json(tree);
        }
        catch (error) {
            next(error);
        }
    }
    async getEnquiries(req, res, next) {
        try {
            const enquiries = await prisma.enquiry.findMany({
                orderBy: { createdAt: "desc" },
            });
            res.status(200).json(enquiries);
        }
        catch (error) {
            next(error);
        }
    }
}
