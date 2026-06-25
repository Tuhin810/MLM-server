import bcrypt from "bcryptjs";
import { UserRepository } from "./UserRepository.js";
import { prisma } from "../../config/db.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "./jwt.js";
import { redisConnection } from "../../config/queue.js";
import { TransactionType } from "@prisma/client";
const userRepository = new UserRepository();
export class AuthService {
    async register(data, deviceInfo, ipAddress) {
        const { name, email, mobile, password, referredBy, otp } = data;
        // 1. Verify OTP
        const otpKey = `otp:register:${email}`;
        const storedOtp = await redisConnection.get(otpKey);
        if (!storedOtp || storedOtp !== otp) {
            throw new Error("Invalid or expired OTP");
        }
        // 2. Clear OTP
        await redisConnection.del(otpKey);
        // 3. Check if user already exists
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error("User with this email already exists");
        }
        // 4. Validate referral code if provided
        let referrer = null;
        if (referredBy) {
            referrer = await userRepository.findByReferralCode(referredBy);
            if (!referrer) {
                throw new Error("Invalid referral code");
            }
        }
        // 5. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // 6. Generate unique referral code for the new user
        let referralCode = "";
        let isUnique = false;
        while (!isUnique) {
            const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
            const prefix = name.substring(0, 3).replace(/[^a-zA-Z]/g, "").toUpperCase() || "MLM";
            referralCode = `${prefix}${randomPart}`;
            const check = await userRepository.findByReferralCode(referralCode);
            if (!check)
                isUnique = true;
        }
        // 7. Create user and their wallet inside a transaction
        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    mobile,
                    password: hashedPassword,
                    referralCode,
                    referredBy: referrer ? referredBy : null,
                    status: "ACTIVE",
                    walletBalance: 0,
                    pointBalance: 0,
                },
            });
            await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    balance: 0,
                    points: 0,
                },
            });
            if (referrer) {
                // Increment the sponsor's Wallet.points by 10
                await tx.wallet.update({
                    where: { userId: referrer.id },
                    data: { points: { increment: 10 } },
                });
                // Increment the sponsor's User.pointBalance by 10
                await tx.user.update({
                    where: { id: referrer.id },
                    data: { pointBalance: { increment: 10 } },
                });
                // Log a WalletTransaction of type COMMISSION for the sponsor
                await tx.walletTransaction.create({
                    data: {
                        userId: referrer.id,
                        amount: 0,
                        type: TransactionType.COMMISSION,
                        description: `Referral PV points bonus (10 PV) for sponsoring ${name}`,
                    },
                });
            }
            return newUser;
        });
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                token: "", // Will store refresh token
                deviceInfo: deviceInfo || null,
                ipAddress: ipAddress || null,
            },
        });
        const accessToken = generateAccessToken({ id: user.id, role: "USER", sessionId: session.id });
        const refreshToken = generateRefreshToken({ id: user.id, role: "USER", sessionId: session.id });
        // Store refresh token in session
        await prisma.session.update({
            where: { id: session.id },
            data: { token: refreshToken },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                walletBalance: user.walletBalance,
                pointBalance: user.pointBalance,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }
    async login(data, deviceInfo, ipAddress) {
        const { email, password } = data;
        // 1. Check Admin login
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                throw new Error("Invalid credentials");
            }
            const session = await prisma.session.create({
                data: {
                    adminId: admin.id,
                    token: "", // Will store refresh token
                    deviceInfo: deviceInfo || null,
                    ipAddress: ipAddress || null,
                },
            });
            const accessToken = generateAccessToken({ id: admin.id, role: "ADMIN", sessionId: session.id });
            const refreshToken = generateRefreshToken({ id: admin.id, role: "ADMIN", sessionId: session.id });
            await prisma.session.update({
                where: { id: session.id },
                data: { token: refreshToken },
            });
            return {
                user: {
                    id: admin.id,
                    name: admin.username,
                    email: admin.email,
                    mobile: "N/A",
                    referralCode: "ADMIN",
                    referredBy: null,
                    walletBalance: 0,
                    pointBalance: 0,
                    role: "ADMIN",
                },
                accessToken,
                refreshToken,
            };
        }
        // 2. Standard User login
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error("Invalid credentials");
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid credentials");
        }
        if (user.status !== "ACTIVE") {
            throw new Error("Your account has been deactivated");
        }
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                token: "", // Will store refresh token
                deviceInfo: deviceInfo || null,
                ipAddress: ipAddress || null,
            },
        });
        const accessToken = generateAccessToken({ id: user.id, role: "USER", sessionId: session.id });
        const refreshToken = generateRefreshToken({ id: user.id, role: "USER", sessionId: session.id });
        await prisma.session.update({
            where: { id: session.id },
            data: { token: refreshToken },
        });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
                walletBalance: user.walletBalance,
                pointBalance: user.pointBalance,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }
    async getProfile(userId) {
        const user = await userRepository.findById(userId);
        if (!user) {
            // Check if this is an Admin
            const admin = await prisma.admin.findUnique({ where: { id: userId } });
            if (admin) {
                return {
                    id: admin.id,
                    name: admin.username,
                    email: admin.email,
                    mobile: "N/A",
                    referralCode: "ADMIN",
                    referredBy: null,
                    role: "ADMIN",
                    status: "ACTIVE",
                    walletBalance: 0,
                    pointBalance: 0,
                    kycStatus: "APPROVED",
                    panCard: null,
                    aadhaarCard: null,
                    holderName: null,
                    bankName: null,
                    accountNumber: null,
                    ifscCode: null,
                    addresses: [],
                    createdAt: admin.createdAt,
                };
            }
            throw new Error("User not found");
        }
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            referralCode: user.referralCode,
            referredBy: user.referredBy,
            role: user.role,
            status: user.status,
            walletBalance: user.walletBalance,
            pointBalance: user.pointBalance,
            kycStatus: user.kycStatus,
            panCard: user.panCard,
            aadhaarCard: user.aadhaarCard,
            holderName: user.holderName,
            bankName: user.bankName,
            accountNumber: user.accountNumber,
            ifscCode: user.ifscCode,
            addresses: user.addresses || [],
            createdAt: user.createdAt,
        };
    }
    async updateProfile(userId, data) {
        const { name, mobile } = data;
        await prisma.user.update({
            where: { id: userId },
            data: { name, mobile },
        });
        return this.getProfile(userId);
    }
    async updateKyc(userId, data) {
        const { panCard, aadhaarCard } = data;
        await prisma.user.update({
            where: { id: userId },
            data: {
                panCard,
                aadhaarCard,
                kycStatus: "PENDING",
            },
        });
        return this.getProfile(userId);
    }
    async updateBankDetails(userId, data) {
        const { holderName, bankName, accountNumber, ifscCode } = data;
        await prisma.user.update({
            where: { id: userId },
            data: {
                holderName,
                bankName,
                accountNumber,
                ifscCode,
            },
        });
        return this.getProfile(userId);
    }
    async addAddress(userId, data) {
        const { street, city, state, zipCode } = data;
        const existingCount = await prisma.address.count({ where: { userId } });
        const isDefault = existingCount === 0;
        await prisma.address.create({
            data: {
                userId,
                street,
                city,
                state,
                zipCode,
                isDefault,
            },
        });
        return this.getProfile(userId);
    }
    async deleteAddress(userId, addressId) {
        const address = await prisma.address.findFirst({
            where: { id: addressId, userId },
        });
        if (!address) {
            throw new Error("Address not found or unauthorized");
        }
        await prisma.address.delete({
            where: { id: addressId },
        });
        if (address.isDefault) {
            const nextAddress = await prisma.address.findFirst({
                where: { userId },
                orderBy: { createdAt: "asc" },
            });
            if (nextAddress) {
                await prisma.address.update({
                    where: { id: nextAddress.id },
                    data: { isDefault: true },
                });
            }
        }
        return this.getProfile(userId);
    }
    async setDefaultAddress(userId, addressId) {
        const address = await prisma.address.findFirst({
            where: { id: addressId, userId },
        });
        if (!address) {
            throw new Error("Address not found or unauthorized");
        }
        await prisma.$transaction([
            prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            }),
            prisma.address.update({
                where: { id: addressId },
                data: { isDefault: true },
            }),
        ]);
        return this.getProfile(userId);
    }
    async sendOtp(email, purpose) {
        // 1. Verify existence checks based on purpose
        const existingUser = await userRepository.findByEmail(email);
        if (purpose === "register" && existingUser) {
            throw new Error("User with this email already exists");
        }
        if (purpose === "forgot_password" && !existingUser) {
            throw new Error("No user found with this email");
        }
        // 2. Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // 3. Store OTP in Redis with 5 minutes (300 seconds) expiration
        const key = `otp:${purpose}:${email}`;
        await redisConnection.setex(key, 300, otp);
        // 4. Log OTP to console for development / simulator mode
        console.log(`\n==========================================`);
        console.log(`[OTP SERVICE] OTP for ${email} (${purpose}): ${otp}`);
        console.log(`==========================================\n`);
        return {
            message: `OTP sent successfully to ${email} (Simulated).`,
        };
    }
    async forgotPasswordReset(email, otp, newPassword) {
        // 1. Verify OTP from Redis
        const key = `otp:forgot_password:${email}`;
        const storedOtp = await redisConnection.get(key);
        if (!storedOtp || storedOtp !== otp) {
            throw new Error("Invalid or expired OTP");
        }
        // 2. Clear the OTP
        await redisConnection.del(key);
        // 3. Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // 4. Update the user password in DB
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error("User not found");
        }
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        return { message: "Password reset successful" };
    }
    async getReferralTree(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                referralCode: true,
                referredBy: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        const fetchReferralsRecursive = async (referralCode, depth = 1, maxDepth = 4) => {
            if (depth > maxDepth)
                return [];
            const downlines = await prisma.user.findMany({
                where: { referredBy: referralCode },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                    referralCode: true,
                    referredBy: true,
                    role: true,
                    createdAt: true,
                },
            });
            const result = [];
            for (const downline of downlines) {
                const children = await fetchReferralsRecursive(downline.referralCode, depth + 1, maxDepth);
                result.push({
                    id: downline.id,
                    name: downline.name,
                    email: downline.email,
                    mobile: downline.mobile,
                    referralCode: downline.referralCode,
                    referredBy: downline.referredBy,
                    role: downline.role,
                    createdAt: downline.createdAt,
                    level: depth,
                    children,
                });
            }
            return result;
        };
        const tree = await fetchReferralsRecursive(user.referralCode, 1, 4);
        return {
            user,
            tree,
        };
    }
    async logout(token) {
        await prisma.session.updateMany({
            where: { token },
            data: { isActive: false },
        });
        return { message: "Logged out successfully" };
    }
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw new Error("Refresh token is required");
        }
        // 1. Verify Refresh Token JWT signature
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        }
        catch (err) {
            throw new Error("Invalid or expired refresh token");
        }
        // 2. Look up the active session in the database
        const session = await prisma.session.findFirst({
            where: { token: refreshToken, isActive: true },
        });
        if (!session) {
            throw new Error("Session expired or logged out");
        }
        // 3. Generate a new access token
        const accessToken = generateAccessToken({
            id: decoded.id,
            role: decoded.role,
            sessionId: session.id,
        });
        return { accessToken };
    }
}
