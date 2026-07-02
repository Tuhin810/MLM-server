import { AdminService } from "./AdminService.js";
import { prisma } from "../../config/db.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendEmail, generateFranchiseWelcomeTemplate } from "../../services/emailService.js";
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
            // Paginated response when a `page` query param is supplied; otherwise
            // return the full list (kept for any legacy callers).
            if (req.query.page !== undefined) {
                const result = await adminService.getIncomeLogsPaginated({
                    page: parseInt(req.query.page, 10),
                    limit: parseInt(req.query.limit, 10),
                    search: req.query.search || "",
                    type: req.query.type || "",
                });
                res.status(200).json(result);
                return;
            }
            const logs = await adminService.getAllIncomeLogs();
            res.status(200).json(logs);
        }
        catch (error) {
            next(error);
        }
    }
    async getTransactions(req, res, next) {
        try {
            // Paginated response when a `page` query param is supplied; otherwise
            // return the full list (used by the Orders tab totals).
            if (req.query.page !== undefined) {
                const result = await adminService.getTransactionsPaginated({
                    page: parseInt(req.query.page, 10),
                    limit: parseInt(req.query.limit, 10),
                    search: req.query.search || "",
                });
                res.status(200).json(result);
                return;
            }
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
            const existing = await prisma.withdrawal.findUnique({
                where: { id: req.params.id },
            });
            if (!existing) {
                res.status(404).json({ error: "Withdrawal not found" });
                return;
            }
            // The wallet is debited only when a PENDING request is approved. This is
            // the single point at which the balance is reduced — nothing is deducted
            // at request time, and rejecting a pending request requires no refund.
            if (status === "APPROVED" && existing.status === "PENDING") {
                const { WalletRepository } = await import("../wallet/WalletRepository.js");
                const walletRepo = new WalletRepository();
                const wallet = await walletRepo.findByUserId(existing.userId);
                if (!wallet || wallet.balance < existing.amount) {
                    res.status(400).json({ error: "User has insufficient wallet balance to approve this withdrawal." });
                    return;
                }
                await walletRepo.updateBalanceAndPoints(existing.userId, -existing.amount, 0, "WITHDRAWAL", `Withdrawal #${existing.id.slice(-6)} approved`);
            }
            const withdrawal = await prisma.withdrawal.update({
                where: { id: req.params.id },
                data: { status },
            });
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
                include: {
                    messages: { orderBy: { createdAt: "asc" } },
                },
                orderBy: { updatedAt: "desc" },
            });
            res.status(200).json(enquiries);
        }
        catch (error) {
            next(error);
        }
    }
    async sendAdminMessage(req, res, next) {
        try {
            const id = req.params.id;
            const { message } = req.body;
            if (!message || message.trim() === "") {
                res.status(400).json({ error: "Message is required." });
                return;
            }
            const enquiry = await prisma.enquiry.findUnique({ where: { id } });
            if (!enquiry) {
                res.status(404).json({ error: "Enquiry not found." });
                return;
            }
            if (enquiry.status === "CLOSED") {
                res.status(400).json({ error: "This enquiry is closed." });
                return;
            }
            const newMessage = await prisma.enquiryMessage.create({
                data: {
                    content: message,
                    sender: "ADMIN",
                    enquiryId: id,
                },
            });
            await prisma.enquiry.update({ where: { id }, data: { updatedAt: new Date() } });
            res.status(201).json({ message: "Reply sent.", enquiryMessage: newMessage });
        }
        catch (error) {
            next(error);
        }
    }
    async updateEnquiryStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            if (!["OPEN", "CLOSED"].includes(status)) {
                res.status(400).json({ error: "Status must be OPEN or CLOSED." });
                return;
            }
            const enquiry = await prisma.enquiry.findUnique({ where: { id } });
            if (!enquiry) {
                res.status(404).json({ error: "Enquiry not found." });
                return;
            }
            const updated = await prisma.enquiry.update({
                where: { id },
                data: { status },
            });
            res.status(200).json({ message: `Enquiry ${status.toLowerCase()}.`, enquiry: updated });
        }
        catch (error) {
            next(error);
        }
    }
    async createFranchise(req, res, next) {
        try {
            const schema = z.object({
                franchiseType: z.enum(["STATE_FRANCHISE", "DISTRICT_FRANCHISE", "TEHSIL_FRANCHISE", "CITY_FRANCHISE"]),
                state: z.string().min(1),
                district: z.string().min(1),
                tehsil: z.string().min(1),
                cityVillage: z.string().min(1),
                pincode: z.string().min(1),
                franchiseName: z.string().min(1),
                brandName: z.string().min(1),
                mobileNo: z.string().min(1),
                email: z.string().email(),
                password: z.string().min(6),
                profileImage: z.string().optional().nullable(),
                fullAddress: z.string().min(1),
                agreementDescription: z.string().optional().nullable(),
            });
            const body = schema.parse(req.body);
            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: body.email },
            });
            if (existingUser) {
                res.status(400).json({ error: "Email is already in use by another user account." });
                return;
            }
            // Hash password
            const hashedPassword = await bcrypt.hash(body.password, 10);
            // Generate unique referral code
            let referralCode = "";
            let isUnique = false;
            while (!isUnique) {
                const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
                const prefix = body.franchiseName.substring(0, 3).replace(/[^a-zA-Z]/g, "").toUpperCase() || "FLM";
                referralCode = `${prefix}${randomPart}`;
                const check = await prisma.user.findUnique({ where: { referralCode } });
                if (!check)
                    isUnique = true;
            }
            // Create user, wallet, and franchise in a transaction
            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        name: body.franchiseName,
                        email: body.email,
                        mobile: body.mobileNo,
                        password: hashedPassword,
                        referralCode,
                        role: body.franchiseType,
                        status: "ACTIVE",
                        state: body.state,
                        district: body.district,
                        tehsil: body.tehsil,
                        city: body.cityVillage,
                    },
                });
                await tx.wallet.create({
                    data: {
                        userId: user.id,
                        balance: 0,
                        points: 0,
                    },
                });
                const franchise = await tx.franchise.create({
                    data: {
                        userId: user.id,
                        franchiseType: body.franchiseType,
                        state: body.state,
                        district: body.district,
                        tehsil: body.tehsil,
                        cityVillage: body.cityVillage,
                        pincode: body.pincode,
                        franchiseName: body.franchiseName,
                        brandName: body.brandName,
                        mobileNo: body.mobileNo,
                        email: body.email,
                        profileImage: body.profileImage || null,
                        fullAddress: body.fullAddress,
                        agreementDescription: body.agreementDescription || null,
                        status: "ACTIVE",
                    },
                });
                return franchise;
            });
            // Send greeting email in background
            try {
                const emailContent = generateFranchiseWelcomeTemplate(body, body.password);
                await sendEmail({
                    to: [{ email: body.email, name: body.franchiseName }],
                    subject: "Welcome to Ajmaya! Your Franchise Account details",
                    htmlContent: emailContent,
                });
            }
            catch (emailErr) {
                console.error("[AdminController] Welcome email sending failed:", emailErr);
            }
            res.status(201).json({
                message: "Franchise registered and onboarding email sent successfully.",
                franchise: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getFranchises(req, res, next) {
        try {
            const franchises = await prisma.franchise.findMany({
                orderBy: { createdAt: "desc" },
            });
            res.status(200).json(franchises);
        }
        catch (error) {
            next(error);
        }
    }
    async updateFranchise(req, res, next) {
        try {
            const id = req.params.id;
            const schema = z.object({
                franchiseType: z.enum(["STATE_FRANCHISE", "DISTRICT_FRANCHISE", "TEHSIL_FRANCHISE", "CITY_FRANCHISE"]),
                state: z.string().min(1),
                district: z.string().min(1),
                tehsil: z.string().min(1),
                cityVillage: z.string().min(1),
                pincode: z.string().min(1),
                franchiseName: z.string().min(1),
                brandName: z.string().min(1),
                mobileNo: z.string().min(1),
                profileImage: z.string().optional().nullable(),
                password: z.string().min(6).optional().nullable(),
                fullAddress: z.string().min(1),
                status: z.string().default("ACTIVE"),
                agreementDescription: z.string().optional().nullable(),
            });
            const body = schema.parse(req.body);
            const franchise = await prisma.franchise.findUnique({ where: { id } });
            if (!franchise) {
                res.status(404).json({ error: "Franchise not found." });
                return;
            }
            const updated = await prisma.$transaction(async (tx) => {
                // Prepare user update data
                const userUpdateData = {
                    name: body.franchiseName,
                    mobile: body.mobileNo,
                    role: body.franchiseType,
                    status: body.status,
                    state: body.state,
                    district: body.district,
                    tehsil: body.tehsil,
                    city: body.cityVillage,
                };
                if (body.password) {
                    userUpdateData.password = await bcrypt.hash(body.password, 10);
                }
                // Update user
                await tx.user.update({
                    where: { id: franchise.userId },
                    data: userUpdateData,
                });
                // Update franchise
                const updatedFranchise = await tx.franchise.update({
                    where: { id },
                    data: {
                        franchiseType: body.franchiseType,
                        state: body.state,
                        district: body.district,
                        tehsil: body.tehsil,
                        cityVillage: body.cityVillage,
                        pincode: body.pincode,
                        franchiseName: body.franchiseName,
                        brandName: body.brandName,
                        mobileNo: body.mobileNo,
                        profileImage: body.profileImage || null,
                        fullAddress: body.fullAddress,
                        agreementDescription: body.agreementDescription || null,
                        status: body.status,
                    },
                });
                return updatedFranchise;
            });
            res.status(200).json({
                message: "Franchise updated successfully.",
                franchise: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteFranchise(req, res, next) {
        try {
            const id = req.params.id;
            const franchise = await prisma.franchise.findUnique({ where: { id } });
            if (!franchise) {
                res.status(404).json({ error: "Franchise not found." });
                return;
            }
            // Cascade delete is configured on User -> Franchise link, so deleting User deletes Franchise automatically
            await prisma.user.delete({
                where: { id: franchise.userId },
            });
            res.status(200).json({ message: "Franchise deleted successfully." });
        }
        catch (error) {
            next(error);
        }
    }
    async getFranchiseById(req, res, next) {
        try {
            const id = req.params.id;
            const franchise = await prisma.franchise.findUnique({
                where: { id },
            });
            if (!franchise) {
                res.status(404).json({ error: "Franchise not found." });
                return;
            }
            res.status(200).json(franchise);
        }
        catch (error) {
            next(error);
        }
    }
}
